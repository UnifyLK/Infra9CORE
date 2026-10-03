import { chmod, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  APP_TYPES, DEFAULTS, FEATURES, FLUTTER_PLATFORMS, PACKAGE_MANAGERS,
  PACKAGE_MANAGER_VERSIONS,
} from "./constants.js";
import { createApplications } from "./app-recipes.js";
import { assertDestination, copyPath, replaceInFile, writeText } from "./files.js";
import { runCommand } from "./process.js";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const projectTemplates = path.join(packageRoot, "templates/project");
const baseFiles = [
  ["editorconfig", ".editorconfig"],
  ["gitattributes", ".gitattributes"],
  ["gitignore", ".gitignore"],
  ["nvmrc", ".nvmrc"],
  ["LICENSE", "LICENSE"],
  ["AGENTS.md", "AGENTS.md"],
  ["docs", "docs"],
  ["infra", "infra"],
  ["Makefile", "Makefile"],
  ["supabase", "supabase"],
  ["tools", "tools"],
];

export function slugify(value) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function unique(values) { return [...new Set(values)]; }

export function normalizeOptions(options, cwd = process.cwd()) {
  const destinationInput = options.destination ?? "my-product";
  const projectName = options.projectName ?? path.basename(destinationInput);
  const slug = slugify(projectName);
  if (!slug) throw new Error("Project name must contain at least one letter or number");
  const apps = unique(options.apps ?? DEFAULTS.apps);
  const features = unique(options.features ?? DEFAULTS.features);
  const packageManager = options.packageManager ?? DEFAULTS.packageManager;
  const unknownApps = apps.filter((item) => !APP_TYPES.includes(item));
  const unknownFeatures = features.filter((item) => !FEATURES.includes(item));
  if (unknownApps.length) throw new Error(`Unknown application type: ${unknownApps.join(", ")}`);
  if (unknownFeatures.length) throw new Error(`Unknown feature: ${unknownFeatures.join(", ")}`);
  if (!PACKAGE_MANAGERS.includes(packageManager)) throw new Error(`Unknown package manager: ${packageManager}`);
  const organizationId = options.organizationId ?? "com.example";
  if (!/^[a-zA-Z][a-zA-Z0-9]*(\.[a-zA-Z][a-zA-Z0-9]*)+$/.test(organizationId)) {
    throw new Error(`Invalid reverse-domain organization ID: ${organizationId}`);
  }
  const flutterPlatforms = options.flutterPlatforms ?? [...FLUTTER_PLATFORMS];
  const unknownPlatforms = flutterPlatforms.filter((item) => !FLUTTER_PLATFORMS.includes(item));
  if (unknownPlatforms.length) throw new Error(`Unknown Flutter platform: ${unknownPlatforms.join(", ")}`);
  return {
    ...options,
    destination: path.resolve(cwd, destinationInput),
    projectName,
    slug,
    apps,
    features,
    packageManager,
    organizationId,
    flutterPlatforms,
  };
}

export function describePlan(config) {
  return [
    `Project:        ${config.projectName}`,
    `Destination:    ${config.destination}`,
    `Applications:   ${config.apps.join(", ") || "none"}`,
    `Optional overlays: ${config.features.join(", ") || "none"}`,
    `Package manager:${config.packageManager}`,
    `Organization ID:${config.organizationId}`,
    `Initialize Git: ${config.git ? "yes" : "no"}`,
    `Install deps:   ${config.install ? "yes" : "no"}`,
  ].join("\n");
}

async function copyBaseline(root, features) {
  for (const [source, destination] of baseFiles) {
    await copyPath(
      path.join(projectTemplates, "base", source),
      path.join(root, destination),
    );
  }
  if (features.includes("ci")) {
    await copyPath(
      path.join(projectTemplates, "features/github-ci/.github"),
      path.join(root, ".github"),
    );
  }
}

function generatedPackage(config, apps) {
  const hasJavaScript = apps.some(({ type }) => ["sveltekit", "tauri"].includes(type));
  const value = {
    name: config.slug,
    version: "0.0.0",
    private: true,
    engines: { node: ">=24 <25" },
    packageManager: `${config.packageManager}@${PACKAGE_MANAGER_VERSIONS[config.packageManager]}`,
    ...(config.packageManager !== "pnpm" ? { workspaces: ["apps/*", "packages/*"] } : {}),
    scripts: hasJavaScript ? {
      build: "turbo run build",
      dev: "turbo run dev",
      lint: "turbo run lint",
      test: "turbo run test",
      typecheck: "turbo run typecheck",
    } : {},
    ...(hasJavaScript ? { devDependencies: { turbo: "^2.5.6" } } : {}),
  };
  return `${JSON.stringify(value, null, 2)}\n`;
}

async function createWorkspaceFiles(root, config, apps) {
  await writeText(path.join(root, "package.json"), generatedPackage(config, apps));
  if (config.packageManager === "pnpm") {
    await writeText(path.join(root, "pnpm-workspace.yaml"), "packages:\n  - apps/*\n  - packages/*");
  }
  if (apps.some(({ type }) => ["sveltekit", "tauri"].includes(type))) {
    await writeText(path.join(root, "turbo.json"), JSON.stringify({
      $schema: "https://turbo.build/schema.json",
      globalEnv: ["CARGO_TARGET_DIR"],
      tasks: {
        build: { dependsOn: ["^build"], outputs: ["dist/**", "build/**", ".svelte-kit/**"] },
        dev: { cache: false, persistent: true },
        lint: { dependsOn: ["^lint"], outputs: [] },
        test: { dependsOn: ["^build"], outputs: ["coverage/**"] },
        typecheck: { dependsOn: ["^typecheck"], outputs: [] },
      },
    }, null, 2));
  }
}

function runtimeService(app, index) {
  const ports = { sveltekit: 3000, python: 8080, go: 8080, rust: 8080 };
  if (!(app.type in ports)) return null;
  const containerPort = ports[app.type];
  const hostPort = 3100 + index;
  return [`${app.name}:`, "  build:", `    context: ../../apps/${app.name}`, "    dockerfile: Dockerfile", `  image: ${app.name}:local`, "  restart: unless-stopped", "  env_file:", "    - ../env/.env", "  depends_on:", "    kong:", "      condition: service_started", "  networks: [backend]", "  ports:", `    - \"127.0.0.1:${hostPort}:${containerPort}\"`, "  labels:", `    infra9core.role: \"${app.type}\"`].join("\n");
}

async function createApplicationRuntime(root, apps) {
  const services = apps.map(runtimeService).filter(Boolean);
  const content = services.length
    ? `# Generated by Infra9CORE. Application runtimes are Docker-owned.\nservices:\n${services.map((service) => service.split("\n").map((line) => `  ${line}`).join("\n")).join("\n\n")}\n`
    : "# Generated by Infra9CORE. No containerized server recipes were selected.\nservices: {}\n";
  await writeText(path.join(root, "infra/docker/docker-compose.apps.yml"), content);
}

async function createProjectReadme(root, config, apps) {
  const appList = apps.map(({ type, name }) => `- \`apps/${name}\`: ${type}`).join("\n") || "- No application recipes selected";
  const overlays = config.features.map((feature) => `\`${feature}\``).join(", ") || "none";
  await writeText(path.join(root, "README.md"), `# ${config.projectName}\n\nGenerated with [Infra9CORE](https://github.com/UnifyLK/Infra9CORE).\n\n## Applications\n\n${appList}\n\n## Infrastructure\n\nCore capabilities: Docker Compose, self-hosted Supabase, native Caddy, migrations, backup/restore, and observability.\n\nOptional overlays: ${overlays}.\n\nProject identity, domains, ports, credentials, registry locations, and deployment targets belong in environment configuration. Never commit secrets.\n\n## First-run configuration\n\nRun \`make infra9core\` before starting services. It asks for non-secret deployment identity, previews its managed changes, and renders \`infra/env/.env.example\`, \`infra/caddy/Caddyfile\`, and \`docs/infra9core/FIRST_RUN_AGENT_PROMPT.md\`. The committed \`.infra9core/config.json\` is the non-secret configuration record; \`infra/env/.env\` remains local-only secret material.\n\n## Dependency bootstrap\n\nThis project pins ${config.packageManager} in \`package.json\`. Install dependencies with:\n\n\`\`\`bash\n${config.packageManager} install\n\`\`\`\n\nCommit the resulting lockfiles (for example \`package-lock.json\`, \`pnpm-lock.yaml\`, \`yarn.lock\`, \`bun.lock\`, \`Cargo.lock\`, and \`pubspec.lock\`) after reviewing them. The generator deliberately does not ship pre-resolved lockfiles because dependency resolution belongs to the generated project and its selected platforms.\n\n## Start\n\n\`\`\`bash\nmake infra9core\nmake env # prompts for every required local secret and setting\nmake doctor\nmake up\nmake migrate\n\`\`\`\n`);
}

async function createManifest(root, config, apps) {
  const version = await packageVersion();
  const appDirectories = Object.fromEntries(apps.map(({ type, name }) => [type, name]));
  await writeText(path.join(root, ".infra9core", "manifest.json"), JSON.stringify({
    schemaVersion: 1,
    templateContractVersion: 1,
    generator: { package: "@unifyit/create-infra9core", version },
    project: {
      slug: config.slug,
      apps: config.apps,
      appDirectories,
      features: config.features,
      packageManager: config.packageManager,
      organizationId: config.organizationId,
      flutterPlatforms: config.flutterPlatforms,
    },
  }, null, 2));
}

async function createFirstRunConfiguration(root, config) {
  const publicAppUrl = config.apps.includes("sveltekit") ? `http://${config.slug}.localhost` : "http://localhost:3000";
  await writeText(path.join(root, ".infra9core", "config.json"), JSON.stringify({
    schemaVersion: 1,
    project: { name: config.projectName, slug: config.slug, apps: config.apps },
    deployment: {
      environment: "development",
      appDomain: `${config.slug}.localhost`,
      studioDomain: `studio.${config.slug}.localhost`,
      tlsEmail: "admin@example.invalid",
      publicAppUrl,
      gatewayExposureMode: "public-supabase",
      supabasePublicUrl: "http://localhost:8000",
      supabaseInternalUrl: "http://kong:8000",
      additionalRedirectUrls: "",
      supabaseBindAddress: "127.0.0.1",
      supabaseApiPort: 8000,
      supabaseStudioPort: 3001,
      appPort: 3100,
      appStaticRoot: "/var/www/app",
      imageRegistry: "docker.io",
    },
  }, null, 2));
}

export async function generateProject(rawOptions, cwd = process.cwd()) {
  const config = normalizeOptions(rawOptions, cwd);
  if (config.dryRun) return { config, plan: describePlan(config), created: false };
  await assertDestination(config.destination, config.force);
  await mkdir(config.destination, { recursive: true });
  for (const directory of [
    "apps", "docs", "infra", "packages", "shared", "supabase", "tools",
    "supabase/functions", "supabase/migrations", "supabase/rollbacks",
  ]) {
    await mkdir(path.join(config.destination, directory), { recursive: true });
  }
  await copyBaseline(config.destination, config.features);
  const apps = await createApplications(
    config.destination,
    config.apps,
    config.projectName,
    config.slug,
    config,
  );
  await writeText(path.join(config.destination, "apps/.gitkeep"), "");
  await writeText(path.join(config.destination, "infra/.gitkeep"), "");
  await writeText(path.join(config.destination, "packages/.gitkeep"), "");
  await writeText(path.join(config.destination, "shared/.gitkeep"), "");
  await writeText(path.join(config.destination, "supabase/functions/.gitkeep"), "");
  await writeText(path.join(config.destination, "tools/.gitkeep"), "");
  await createWorkspaceFiles(config.destination, config, apps);
  await createApplicationRuntime(config.destination, apps);
  await createProjectReadme(config.destination, config, apps);
  await createManifest(config.destination, config, apps);
  await createFirstRunConfiguration(config.destination, config);
  await replaceInFile(path.join(config.destination, "infra/env/.env.example"), [
    ["PROJECT_SLUG=change-me", `PROJECT_SLUG=${config.slug}`],
    ["COMPOSE_PROJECT_NAME=change-me", `COMPOSE_PROJECT_NAME=${config.slug}`],
  ]);
  for (const script of ["tools/validate.sh", "tools/infra9core-configure.mjs", "infra/supabase/volumes/api/kong-entrypoint.sh"]) {
    await chmod(path.join(config.destination, script), 0o755);
  }
  const scripts = await import("node:fs/promises").then(({ readdir }) => readdir(path.join(config.destination, "infra/scripts")));
  for (const script of scripts.filter((name) => name.endsWith(".sh"))) {
    await chmod(path.join(config.destination, "infra/scripts", script), 0o755);
  }

  if (config.git) {
    await runCommand("git", ["init", "--initial-branch=main"], config.destination);
  }
  if (config.install && apps.some(({ type }) => ["sveltekit", "tauri"].includes(type))) {
    await runCommand(config.packageManager, ["install"], config.destination);
  }
  return { config, apps, created: true };
}

export async function packageVersion() {
  return JSON.parse(await readFile(path.join(packageRoot, "package.json"), "utf8")).version;
}
