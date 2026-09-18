import { chmod, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { APP_TYPES, DEFAULTS, FEATURES, PACKAGE_MANAGERS } from "./constants.js";
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
  ["docs", "docs"],
  ["migrations", "supabase/migrations"],
  ["rollbacks", "supabase/rollbacks"],
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
  return {
    ...options,
    destination: path.resolve(cwd, destinationInput),
    projectName,
    slug,
    apps,
    features,
    packageManager,
  };
}

export function describePlan(config) {
  return [
    `Project:        ${config.projectName}`,
    `Destination:    ${config.destination}`,
    `Applications:   ${config.apps.join(", ") || "none"}`,
    `Infrastructure: ${config.features.join(", ") || "none"}`,
    `Package manager:${config.packageManager}`,
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
  if (features.includes("supabase")) {
    await copyPath(
      path.join(projectTemplates, "features/supabase/infra"),
      path.join(root, "infra"),
    );
    await copyPath(
      path.join(projectTemplates, "features/supabase/supabase/functions"),
      path.join(root, "supabase/functions"),
    );
  }
  if (features.includes("caddy")) {
    await copyPath(
      path.join(projectTemplates, "features/caddy/infra/caddy"),
      path.join(root, "infra/caddy"),
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
    engines: { node: ">=24.0.0" },
    ...(config.packageManager === "pnpm" ? { packageManager: "pnpm@10.15.1" } : {}),
    ...(config.packageManager !== "pnpm" ? { workspaces: ["apps/*", "packages/*"] } : {}),
    scripts: hasJavaScript ? {
      build: "turbo run build",
      dev: "turbo run dev",
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
      tasks: {
        build: { dependsOn: ["^build"], outputs: ["dist/**", "build/**", ".svelte-kit/**"] },
        dev: { cache: false, persistent: true },
        test: { dependsOn: ["^build"], outputs: ["coverage/**"] },
        typecheck: { dependsOn: ["^typecheck"], outputs: [] },
      },
    }, null, 2));
  }
}

async function createProjectReadme(root, config, apps) {
  const appList = apps.map(({ type, name }) => `- \`apps/${name}\`: ${type}`).join("\n") || "- No application recipes selected";
  const infra = config.features.map((feature) => `\`${feature}\``).join(", ") || "none";
  await writeText(path.join(root, "README.md"), `# ${config.projectName}\n\nGenerated with [Infra9CORE](https://github.com/UnifyLK/Infra9CORE).\n\n## Applications\n\n${appList}\n\n## Infrastructure\n\nEnabled capabilities: ${infra}.\n\nProject identity, domains, ports, credentials, registry locations, and deployment targets belong in environment configuration. Never commit secrets.\n\n## Start\n\n${config.features.includes("supabase") ? "```bash\nmake env\n# Replace every CHANGE_ME value in infra/env/.env\nmake doctor\nmake up\nmake migrate\n```" : "Add project-specific lifecycle commands after the architecture is decided."}\n`);
}

async function createMakefile(root, hasSupabase) {
  if (hasSupabase) {
    await copyPath(
      path.join(projectTemplates, "features/supabase/Makefile"),
      path.join(root, "Makefile"),
    );
    await copyPath(
      path.join(projectTemplates, "features/supabase/tools/validate.sh"),
      path.join(root, "tools/validate.sh"),
    );
    return;
  }
  await writeText(path.join(root, "Makefile"), `.DEFAULT_GOAL := help\n.PHONY: help validate\nhelp: ## Show available commands\n\t@awk 'BEGIN {FS = ":.*## "; printf "Usage: make <target>\\n\\n"} /^[a-zA-Z0-9_-]+:.*## / {printf "  %-12s %s\\n", $$1, $$2}' $(MAKEFILE_LIST)\nvalidate: ## Run repository-static checks\n\t@tools/validate.sh\n`);
  await writeText(path.join(root, "tools/validate.sh"), `#!/usr/bin/env bash\nset -Eeuo pipefail\n\ngit diff --check 2>/dev/null || true\nprintf 'Static repository validation passed.\\n'\n`, 0o755);
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
  );
  await writeText(path.join(config.destination, "apps/.gitkeep"), "");
  await writeText(path.join(config.destination, "infra/.gitkeep"), "");
  await writeText(path.join(config.destination, "packages/.gitkeep"), "");
  await writeText(path.join(config.destination, "shared/.gitkeep"), "");
  await writeText(path.join(config.destination, "supabase/functions/.gitkeep"), "");
  await writeText(path.join(config.destination, "tools/.gitkeep"), "");
  await createWorkspaceFiles(config.destination, config, apps);
  await createProjectReadme(config.destination, config, apps);
  await createMakefile(config.destination, config.features.includes("supabase"));

  if (config.features.includes("supabase")) {
    await replaceInFile(path.join(config.destination, "infra/env/.env.example"), [
      ["PROJECT_SLUG=change-me", `PROJECT_SLUG=${config.slug}`],
      ["COMPOSE_PROJECT_NAME=change-me", `COMPOSE_PROJECT_NAME=${config.slug}`],
    ]);
    for (const script of ["tools/validate.sh", "infra/supabase/volumes/api/kong-entrypoint.sh"]) {
      await chmod(path.join(config.destination, script), 0o755);
    }
    const scripts = await import("node:fs/promises").then(({ readdir }) => readdir(path.join(config.destination, "infra/scripts")));
    for (const script of scripts.filter((name) => name.endsWith(".sh"))) {
      await chmod(path.join(config.destination, "infra/scripts", script), 0o755);
    }
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
