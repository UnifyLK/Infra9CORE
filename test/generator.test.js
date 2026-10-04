import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { execFile, spawnSync } from "node:child_process";
import { promisify } from "node:util";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { PACKAGE_MANAGER_VERSIONS } from "../src/constants.js";
import { describePlan, generateProject } from "../src/generator.js";

const execute = promisify(execFile);

test("dry run does not create a destination", async () => {
  const parent = await mkdtemp(path.join(os.tmpdir(), "infra9core-dry-"));
  const destination = path.join(parent, "planned");
  try {
    const result = await generateProject({ destination, projectName: "Planned", apps: ["go"], features: [], packageManager: "npm", git: false, dryRun: true });
    assert.equal(result.created, false);
    await assert.rejects(() => readdir(destination), { code: "ENOENT" });
  } finally {
    await rm(parent, { recursive: true, force: true });
  }
});

test("always creates the project structure contract", async () => {
  const parent = await mkdtemp(path.join(os.tmpdir(), "infra9core-structure-"));
  const destination = path.join(parent, "structure-test");
  try {
    await generateProject({
      destination,
      projectName: "Structure Test",
      apps: [],
      features: [],
      packageManager: "npm",
      git: false,
    });
    for (const directory of ["apps", "docs", "infra", "packages", "shared", "supabase", "tools"]) {
      assert.ok((await readdir(path.join(destination, directory))).length >= 0);
    }
    for (const file of [
      ".editorconfig", ".gitattributes", ".gitignore", ".nvmrc", "AGENTS.md",
      "LICENSE", "Makefile", "README.md", "infra/docker/docker-compose.yml",
      "infra/docker/docker-compose.apps.yml",
      "infra/caddy/Caddyfile.example", "supabase/functions/main/index.ts",
      "tools/validate.sh", ".infra9core/manifest.json", "infra/images/manifest.json",
      ".infra9core/config.json", "tools/infra9core-configure.mjs",
    ]) {
      assert.ok((await readFile(path.join(destination, file))).length > 0);
    }
    await assert.rejects(() => readdir(path.join(destination, "src")), { code: "ENOENT" });
    await assert.rejects(() => readdir(path.join(destination, "test")), { code: "ENOENT" });
    await assert.rejects(() => readdir(path.join(destination, "templates")), { code: "ENOENT" });
    assert.match(await readFile(path.join(destination, "AGENTS.md"), "utf8"), /Repository ownership contract/);
    assert.match(await readFile(path.join(destination, "AGENTS.md"), "utf8"), /Supabase placement is a strict split/);
    assert.match(await readFile(path.join(destination, "README.md"), "utf8"), /First developer handoff/);
    assert.match(await readFile(path.join(destination, "README.md"), "utf8"), /Do not implement product features yet/);
  } finally {
    await rm(parent, { recursive: true, force: true });
  }
});

test("first-run configuration renders only managed non-secret files", async () => {
  const parent = await mkdtemp(path.join(os.tmpdir(), "infra9core-first-run-"));
  const destination = path.join(parent, "configured");
  try {
    await generateProject({
      destination, projectName: "Configured", apps: ["sveltekit"], features: [],
      packageManager: "npm", git: false,
    });
    await execute(process.execPath, ["tools/infra9core-configure.mjs", "--yes"], { cwd: destination });
    const config = JSON.parse(await readFile(path.join(destination, ".infra9core/config.json"), "utf8"));
    assert.equal(config.project.slug, "configured");
    assert.match(await readFile(path.join(destination, "infra/caddy/Caddyfile"), "utf8"), /# Managed by Infra9CORE/);
    assert.match(await readFile(path.join(destination, "infra/caddy/Caddyfile"), "utf8"), /configured\.localhost/);
    assert.match(await readFile(path.join(destination, "infra/caddy/Caddyfile"), "utf8"), /127\.0\.0\.1:3100/);
    assert.match(await readFile(path.join(destination, "infra/caddy/Caddyfile"), "utf8"), /auth\/v1/);
    assert.match(await readFile(path.join(destination, "infra/caddy/Caddyfile"), "utf8"), /127\.0\.0\.1:8000/);
    await assert.rejects(() => readFile(path.join(destination, "infra/caddy/SarvaOps.import.caddy")), { code: "ENOENT" });
    assert.match(await readFile(path.join(destination, "docs/infra9core/FIRST_RUN_AGENT_PROMPT.md"), "utf8"), /RLS/);
    assert.match(await readFile(path.join(destination, "infra/env/.env.example"), "utf8"), /PUBLIC_APP_URL=http:\/\/configured\.localhost/);
    await assert.rejects(() => readFile(path.join(destination, "infra/env/.env")), { code: "ENOENT" });
  } finally {
    await rm(parent, { recursive: true, force: true });
  }
});

test("SarvaOps profile derives host ports and emits provider-specific agent guidance", async () => {
  const parent = await mkdtemp(path.join(os.tmpdir(), "infra9core-sarvaops-profile-"));
  const destination = path.join(parent, "configured");
  try {
    await generateProject({ destination, projectName: "Configured", apps: ["sveltekit"], features: [], packageManager: "npm", git: false });
    const configPath = path.join(destination, ".infra9core/config.json");
    const config = JSON.parse(await readFile(configPath, "utf8"));
    config.deployment.environment = "production";
    config.deployment.portAllocation = { provider: "sarvaops", projectNumber: 12 };
    await writeFile(configPath, JSON.stringify(config));
    await execute(process.execPath, ["tools/infra9core-configure.mjs", "--yes"], { cwd: destination });
    const configured = JSON.parse(await readFile(configPath, "utf8"));
    assert.equal(configured.deployment.appPort, 12580);
    assert.equal(configured.deployment.supabaseApiPort, 12590);
    const sarvaOpsImport = await readFile(path.join(destination, "infra/caddy/SarvaOps.import.caddy"), "utf8");
    assert.match(sarvaOpsImport, /reverse_proxy 127\.0\.0\.1:12580/);
    assert.match(await readFile(path.join(destination, "docs/infra9core/FIRST_RUN_AGENT_PROMPT.md"), "utf8"), /never replace them with container ports/);
  } finally {
    await rm(parent, { recursive: true, force: true });
  }
});

test("private-bff first-run configuration keeps Kong and Studio out of Caddy", async () => {
  const parent = await mkdtemp(path.join(os.tmpdir(), "infra9core-private-bff-"));
  const destination = path.join(parent, "configured");
  try {
    await generateProject({
      destination, projectName: "Configured", apps: ["sveltekit"], features: [],
      packageManager: "npm", git: false,
    });
    const configPath = path.join(destination, ".infra9core/config.json");
    const config = JSON.parse(await readFile(configPath, "utf8"));
    config.deployment.gatewayExposureMode = "private-bff";
    delete config.deployment.supabasePublicUrl;
    await writeFile(configPath, JSON.stringify(config));
    await execute(process.execPath, ["tools/infra9core-configure.mjs", "--yes"], { cwd: destination });
    const caddy = await readFile(path.join(destination, "infra/caddy/Caddyfile"), "utf8");
    const env = await readFile(path.join(destination, "infra/env/.env.example"), "utf8");
    const configured = JSON.parse(await readFile(configPath, "utf8"));
    assert.doesNotMatch(caddy, /auth\/v1|rest\/v1|realtime\/v1|storage\/v1|functions\/v1|studio\./);
    assert.match(caddy, /127\.0\.0\.1:3100/);
    assert.equal("supabasePublicUrl" in configured.deployment, false);
    assert.match(env, /GATEWAY_EXPOSURE_MODE=private-bff/);
    assert.match(env, /SUPABASE_INTERNAL_URL=http:\/\/kong:8000/);
    assert.match(env, /SUPABASE_PUBLIC_URL=http:\/\/configured\.localhost/);
    assert.match(env, /API_EXTERNAL_URL=http:\/\/configured\.localhost/);
  } finally {
    await rm(parent, { recursive: true, force: true });
  }
});

test("generates Docker-owned runtime services for server recipes", async () => {
  const parent = await mkdtemp(path.join(os.tmpdir(), "infra9core-runtime-services-"));
  const destination = path.join(parent, "services");
  try {
    await generateProject({ destination, projectName: "Services", apps: ["sveltekit", "python", "go", "rust", "flutter", "tauri"], features: [], packageManager: "npm", git: false, scaffoldSdks: false });
    const compose = await readFile(path.join(destination, "infra/docker/docker-compose.apps.yml"), "utf8");
    assert.match(await readFile(path.join(destination, "infra/scripts/lib.sh"), "utf8"), /docker-compose\.apps\.yml/);
    for (const service of ["web", "api-python", "api-go", "api-rust"]) assert.match(compose, new RegExp(`\\n  ${service}:`));
    for (const dockerfile of ["web", "api-python", "api-go", "api-rust"]) await readFile(path.join(destination, "apps", dockerfile, "Dockerfile"), "utf8");
    await assert.rejects(() => readFile(path.join(destination, "apps", "mobile", "Dockerfile")), { code: "ENOENT" });
  } finally { await rm(parent, { recursive: true, force: true }); }
});

test("environment setup prompts for and writes every required local value", async () => {
  const parent = await mkdtemp(path.join(os.tmpdir(), "infra9core-env-wizard-"));
  const destination = path.join(parent, "configured");
  try {
    await generateProject({ destination, projectName: "Configured", apps: [], features: [], packageManager: "npm", git: false });
    const values = ["dbpass", "jwt-secret-long-enough", "anon-key", "service-key", "dashboard-user", "dashboard-pass", "smtp.example.test", "smtp-user", "smtp-pass"];
    const result = spawnSync("bash", ["infra/scripts/env-init.sh"], {
      cwd: destination, input: `${values.join("\n")}\n`, encoding: "utf8",
    });
    assert.equal(result.status, 0, result.stderr);
    const env = await readFile(path.join(destination, "infra/env/.env"), "utf8");
    assert.match(env, /POSTGRES_PASSWORD=dbpass/);
    assert.match(env, /SMTP_HOST=smtp\.example\.test/);
    assert.doesNotMatch(env, /CHANGE_ME/);
    const sourced = spawnSync("bash", ["-c", 'set -a; source infra/env/.env; test "$STUDIO_DEFAULT_ORGANIZATION" = "Default Organization"; test "$STUDIO_DEFAULT_PROJECT" = "Default Project"'], {
      cwd: destination,
      encoding: "utf8",
    });
    assert.equal(sourced.status, 0, sourced.stderr);
  } finally {
    await rm(parent, { recursive: true, force: true });
  }
});

test("environment setup rejects identical database and JWT secrets before writing", async () => {
  const parent = await mkdtemp(path.join(os.tmpdir(), "infra9core-env-secret-separation-"));
  const destination = path.join(parent, "configured");
  try {
    await generateProject({ destination, projectName: "Configured", apps: [], features: [], packageManager: "npm", git: false });
    const values = ["same-secret", "same-secret", "anon-key", "service-key", "dashboard-user", "dashboard-pass", "smtp.example.test", "smtp-user", "smtp-pass"];
    const result = spawnSync("bash", ["infra/scripts/env-init.sh"], {
      cwd: destination, input: `${values.join("\n")}\n`, encoding: "utf8",
    });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /JWT_SECRET must differ from POSTGRES_PASSWORD/);
    await assert.rejects(() => readFile(path.join(destination, "infra/env/.env")), { code: "ENOENT" });
  } finally {
    await rm(parent, { recursive: true, force: true });
  }
});

test("declares the selected package manager for every JavaScript workspace", async () => {
  const parent = await mkdtemp(path.join(os.tmpdir(), "infra9core-package-managers-"));
  try {
    for (const packageManager of Object.keys(PACKAGE_MANAGER_VERSIONS)) {
      const destination = path.join(parent, packageManager);
      await generateProject({
        destination,
        projectName: `${packageManager} workspace`,
        apps: ["sveltekit"],
        features: [],
        packageManager,
        git: false,
      });
      const packageJson = JSON.parse(await readFile(path.join(destination, "package.json"), "utf8"));
      assert.equal(packageJson.packageManager, `${packageManager}@${PACKAGE_MANAGER_VERSIONS[packageManager]}`);
      assert.equal(Boolean(packageJson.workspaces), packageManager !== "pnpm");
    }
  } finally {
    await rm(parent, { recursive: true, force: true });
  }
});

test("records all supported Flutter platforms without requiring the Flutter SDK", async () => {
  const parent = await mkdtemp(path.join(os.tmpdir(), "infra9core-flutter-platforms-"));
  const destination = path.join(parent, "mobile");
  try {
    await generateProject({
      destination,
      projectName: "Platform Matrix",
      apps: ["flutter", "custom"],
      features: [],
      packageManager: "pnpm",
      flutterPlatforms: ["android", "ios", "web", "linux", "macos", "windows"],
      scaffoldSdks: false,
      git: false,
    });
    const manifest = JSON.parse(await readFile(path.join(destination, ".infra9core/manifest.json"), "utf8"));
    assert.deepEqual(manifest.project.flutterPlatforms, ["android", "ios", "web", "linux", "macos", "windows"]);
    await readFile(path.join(destination, "apps", "custom", "README.md"), "utf8");
  } finally {
    await rm(parent, { recursive: true, force: true });
  }
});

test("plan describes optional overlays rather than baseline infrastructure", () => {
  const plan = describePlan({
    projectName: "Base", destination: "/tmp/base", apps: [], features: [], packageManager: "pnpm",
    organizationId: "com.example", git: false, install: false,
  });
  assert.match(plan, /Optional overlays: none/);
  assert.doesNotMatch(plan, /Infrastructure: none/);
});

test("creates an isolated multi-stack repository", async () => {
  const parent = await mkdtemp(path.join(os.tmpdir(), "infra9core-generate-"));
  const destination = path.join(parent, "acme-platform");
  try {
    const result = await generateProject({
      destination, projectName: "Acme Platform",
      apps: ["sveltekit", "flutter", "python", "go", "rust", "tauri", "custom"],
      features: ["ci"], packageManager: "pnpm",
      git: false, install: false, scaffoldSdks: false, organizationId: "com.acme",
    });
    assert.equal(result.created, true);
    assert.match(await readFile(path.join(destination, "README.md"), "utf8"), /Acme Platform/);
    assert.equal(
      JSON.parse(await readFile(path.join(destination, "package.json"), "utf8")).engines.node,
      ">=24 <25",
    );
    assert.deepEqual(
      JSON.parse(await readFile(path.join(destination, "turbo.json"), "utf8")).globalEnv,
      ["CARGO_TARGET_DIR"],
    );
    assert.match(await readFile(path.join(destination, "infra/env/.env.example"), "utf8"), /PROJECT_SLUG=acme-platform/);
    const manifest = JSON.parse(await readFile(path.join(destination, ".infra9core/manifest.json"), "utf8"));
    assert.equal(manifest.schemaVersion, 1);
    assert.equal(manifest.generator.package, "@unifyit/create-infra9core");
    assert.equal(manifest.project.organizationId, "com.acme");
    assert.deepEqual(manifest.project.apps, ["sveltekit", "flutter", "python", "go", "rust", "tauri", "custom"]);
    assert.match(await readFile(path.join(destination, "apps/api-go/go.mod"), "utf8"), /example\.invalid\/acme-platform-api-go/);
    assert.match(await readFile(path.join(destination, "apps/api-python/pyproject.toml"), "utf8"), /fastapi/);
    assert.match(await readFile(path.join(destination, "apps/desktop/src-tauri/tauri.conf.json"), "utf8"), /Acme Platform/);
    assert.match(
      await readFile(path.join(destination, "apps/desktop/src-tauri/tauri.conf.json"), "utf8"),
      /com\.acme\.acmeplatformdesktop/,
    );
    assert.doesNotMatch(
      await readFile(path.join(destination, "apps/mobile/README.md"), "utf8"),
      /\{\{[A-Z_]+\}\}/,
    );
    const icon = await readFile(path.join(destination, "apps/desktop/src-tauri/icons/icon.png"));
    assert.deepEqual([...icon.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
    assert.match(
      await readFile(path.join(destination, "docs/adr/0001-product-agnostic-infrastructure-baseline.md"), "utf8"),
      /product-agnostic/i,
    );
  } finally {
    await rm(parent, { recursive: true, force: true });
  }
});

test("refuses a non-empty destination without force", async () => {
  const parent = await mkdtemp(path.join(os.tmpdir(), "infra9core-safe-"));
  try {
    await writeFile(path.join(parent, "keep.txt"), "keep");
    await assert.rejects(
      () => generateProject({ destination: parent, apps: [], features: [], packageManager: "npm", git: false }),
      /Destination is not empty/,
    );
  } finally {
    await rm(parent, { recursive: true, force: true });
  }
});
