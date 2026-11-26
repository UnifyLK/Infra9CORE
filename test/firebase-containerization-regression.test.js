import assert from "node:assert/strict";
import { chmod, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { execFile, spawnSync } from "node:child_process";
import { promisify } from "node:util";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { parseCliArguments } from "../src/arguments.js";
import { generateProject } from "../src/generator.js";
import { inspectProject } from "../src/project-doctor.js";
import { inspectReadinessUpgrade } from "../src/upgrade-diagnostics.js";
import { run } from "../src/cli.js";

const execute = promisify(execFile);

async function project(name, options = {}) {
  const parent = await mkdtemp(path.join(os.tmpdir(), "infra9core-firebase-regression-"));
  const destination = path.join(parent, name);
  await generateProject({ destination, projectName: name, backend: "firebase", apps: [], features: [], packageManager: "npm", git: false, ...options });
  return { parent, destination };
}

async function createMappedApp(destination, id = "tenant-portal") {
  return execute(process.execPath, ["tools/infra9core-app.mjs", "create", `APP=${id}`, "GROUP=services", "TYPE=sveltekit", `FIRESTORE_DATABASE=${id}`, `FUNCTIONS_CODEBASE=${id}`, `HOSTING_TARGET=${id}`, `HOSTING_SITE=example-${id}`, `HOSTING_PUBLIC=apps/services/${id}/build`], { cwd: destination });
}

test("regression: default Firebase generation selects the native capability", async () => {
  const { parent, destination } = await project("Default Firebase");
  try {
    const manifest = JSON.parse(await readFile(path.join(destination, ".infra9core/manifest.json"), "utf8"));
    assert.equal(manifest.project.containerization, "none");
    await assert.rejects(readFile(path.join(destination, "infra/docker/docker-compose.yml")), { code: "ENOENT" });
  } finally { await rm(parent, { recursive: true, force: true }); }
});

test("regression: native Firebase CLI handoff does not advertise Compose configuration", async () => {
  const parent = await mkdtemp(path.join(os.tmpdir(), "infra9core-native-handoff-"));
  const destination = path.join(parent, "project");
  const output = []; const original = console.log;
  try {
    console.log = (...values) => output.push(values.join(" "));
    await run([destination, "--name", "Native Handoff", "--apps", "none", "--backend", "firebase", "--containerization", "none", "--yes", "--no-git"]);
    assert.ok(output.some((line) => line.includes("make firebase-emulators")));
    assert.ok(!output.some((line) => line.includes("make doctor, and make config")));
  } finally {
    console.log = original;
    await rm(parent, { recursive: true, force: true });
  }
});

test("regression: explicit Firebase native generation renders native documentation", async () => {
  const { parent, destination } = await project("Explicit Native", { containerization: "none" });
  try {
    assert.match(await readFile(path.join(destination, "docs/runbooks/deployment.md"), "utf8"), /no Docker Compose or Caddy deployment step/);
    assert.match(await readFile(path.join(destination, "README.md"), "utf8"), /Containerization capability: `none`/);
  } finally { await rm(parent, { recursive: true, force: true }); }
});

test("regression: explicit Firebase Docker Compose generation retains Compose contracts", async () => {
  const { parent, destination } = await project("Explicit Compose", { containerization: "docker-compose", apps: ["sveltekit"] });
  try {
    await readFile(path.join(destination, "infra/docker/docker-compose.yml"), "utf8");
    await readFile(path.join(destination, "infra/caddy/Caddyfile.example"), "utf8");
    await readFile(path.join(destination, "infra/images/manifest.json"), "utf8");
  } finally { await rm(parent, { recursive: true, force: true }); }
});

test("regression: invalid containerization CLI arguments are rejected", () => {
  assert.throws(() => parseCliArguments(["example", "--containerization", "kubernetes"]), /Unknown containerization/);
});

test("regression: Supabase rejects native containerization", async () => {
  const parent = await mkdtemp(path.join(os.tmpdir(), "infra9core-supabase-regression-"));
  try {
    await assert.rejects(generateProject({ destination: path.join(parent, "project"), projectName: "No Native Supabase", backend: "supabase", containerization: "none", apps: [], features: [], packageManager: "npm", git: false }), /Supabase requires containerization/);
  } finally { await rm(parent, { recursive: true, force: true }); }
});

test("regression: legacy Firebase manifests remain readable", async () => {
  const { parent, destination } = await project("Legacy Manifest");
  try {
    const target = path.join(destination, ".infra9core/manifest.json");
    const manifest = JSON.parse(await readFile(target, "utf8"));
    delete manifest.project.containerization;
    await writeFile(target, JSON.stringify(manifest));
    const result = await inspectProject(destination);
    assert.ok(!result.findings.some((finding) => finding.includes("containerization capability is invalid")));
  } finally { await rm(parent, { recursive: true, force: true }); }
});

for (const containerization of ["none", "docker-compose"]) {
  test(`regression: application creation after Firebase ${containerization} generation`, async () => {
    const { parent, destination } = await project(`app-${containerization}`, { containerization });
    try {
      await createMappedApp(destination);
      await execute(process.execPath, ["tools/infra9core-app.mjs", "validate"], { cwd: destination });
      await readFile(path.join(destination, ".infra9core/apps/tenant-portal.json"), "utf8");
    } finally { await rm(parent, { recursive: true, force: true }); }
  });
}

test("regression: native Firebase has no Docker contract", async () => {
  const { parent, destination } = await project("No Docker", { apps: ["sveltekit"] });
  try {
    for (const file of ["infra/docker/docker-compose.yml", "infra/caddy/Caddyfile.example", "infra/images/manifest.json", "tools/container-policy.sh", "apps/web/Dockerfile"]) {
      await assert.rejects(readFile(path.join(destination, file)), { code: "ENOENT" });
    }
  } finally { await rm(parent, { recursive: true, force: true }); }
});

test("regression: native Firebase environment initialization has its shared shell helper", async () => {
  const { parent, destination } = await project("Native Environment");
  try {
    const envInit = path.join(destination, "infra/scripts/env-init.sh");
    const helper = path.join(destination, "infra/scripts/lib.sh");
    await chmod(envInit, 0o755);
    await chmod(helper, 0o755);
    const result = spawnSync("bash", ["infra/scripts/env-init.sh"], {
      cwd: destination,
      input: "demo-infra9core\n",
      encoding: "utf8",
    });
    assert.match(result.stdout, /Created infra\/env\/.env/);
    assert.match(await readFile(path.join(destination, "infra/env/.env"), "utf8"), /FIREBASE_PROJECT_ID=demo-infra9core/);
  } finally { await rm(parent, { recursive: true, force: true }); }
});

test("regression: upgrade diagnostics are read-only and identify legacy Firebase", async () => {
  const { parent, destination } = await project("Upgrade Diagnostics", { apps: ["sveltekit"] });
  try {
    const manifestPath = path.join(destination, ".infra9core/manifest.json");
    const before = await readFile(manifestPath, "utf8");
    const legacy = JSON.parse(before); delete legacy.project.containerization;
    const notices = await inspectReadinessUpgrade(destination, legacy);
    assert.ok(notices.some((notice) => notice.includes("implicit Docker containerization")));
    assert.equal(await readFile(manifestPath, "utf8"), before);
  } finally { await rm(parent, { recursive: true, force: true }); }
});

test("regression: Firebase registry and selective deployment contracts are preserved", async () => {
  const { parent, destination } = await project("Registry Preservation");
  try {
    const rulesBefore = await readFile(path.join(destination, "firebase/firestore.rules"), "utf8");
    await createMappedApp(destination);
    const plan = await execute(process.execPath, ["tools/infra9core-app.mjs", "plan", "APP=tenant-portal"], { cwd: destination });
    assert.match(plan.stdout, /createsRemoteResources": false/);
    assert.match(plan.stdout, /firebase target:apply hosting tenant-portal example-tenant-portal/);
    const deploy = await execute(process.execPath, ["tools/infra9core-app.mjs", "deploy", "APP=tenant-portal"], { cwd: destination }).catch((error) => error);
    assert.match(deploy.stderr, /refusing deployment/);
    assert.equal(await readFile(path.join(destination, "firebase/firestore.rules"), "utf8"), rulesBefore);
  } finally { await rm(parent, { recursive: true, force: true }); }
});
