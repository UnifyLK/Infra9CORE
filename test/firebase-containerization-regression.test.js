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

async function createGenericApp(destination, id = "sample-app") {
  return execute(process.execPath, ["tools/infra9core-app.mjs", "create", `APP=${id}`, "GROUP=services", "TYPE=sveltekit"], { cwd: destination });
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
      await createGenericApp(destination);
      await execute(process.execPath, ["tools/infra9core-app.mjs", "validate"], { cwd: destination });
      const registration = JSON.parse(await readFile(path.join(destination, ".infra9core/apps/sample-app.json"), "utf8"));
      assert.equal("firebase" in registration, false);
      await assert.rejects(readFile(path.join(destination, "firebase/firestore/sample-app.rules")), { code: "ENOENT" });
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

test("regression: Firebase registry remains generic and legacy resource mappings are advisory", async () => {
  const { parent, destination } = await project("Registry Preservation");
  try {
    await createGenericApp(destination, "legacy-app");
    const legacyPath = path.join(destination, ".infra9core/apps/legacy-app.json");
    const legacyRegistration = JSON.parse(await readFile(legacyPath, "utf8"));
    legacyRegistration.firebase = { firestoreDatabase: "legacy-data" };
    await writeFile(legacyPath, JSON.stringify(legacyRegistration));
    const manifest = JSON.parse(await readFile(path.join(destination, ".infra9core/manifest.json"), "utf8"));
    const notices = await inspectReadinessUpgrade(destination, manifest);
    assert.ok(notices.some((notice) => notice.includes("deprecated Firebase application-to-resource metadata")));
  } finally { await rm(parent, { recursive: true, force: true }); }
});
