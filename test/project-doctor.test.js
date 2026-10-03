import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { generateProject } from "../src/generator.js";
import { inspectProject } from "../src/project-doctor.js";

test("doctor accepts a fresh generated project", async () => {
  const parent = await mkdtemp(path.join(os.tmpdir(), "infra9core-doctor-"));
  const destination = path.join(parent, "project");
  try {
    await generateProject({ destination, projectName: "Doctor Project", apps: ["go"], features: [], packageManager: "npm", git: false });
    const result = await inspectProject(destination);
    assert.equal(result.ok, true);
    assert.equal(result.manifest.project.slug, "doctor-project");
  } finally {
    await rm(parent, { recursive: true, force: true });
  }
});

test("doctor enforces the Supabase product/runtime split", async () => {
  const parent = await mkdtemp(path.join(os.tmpdir(), "infra9core-doctor-supabase-"));
  const destination = path.join(parent, "project");
  try {
    await generateProject({ destination, projectName: "Doctor Project", apps: [], features: [], packageManager: "npm", git: false });
    await mkdir(path.join(destination, "supabase", "runtime"), { recursive: true });
    const result = await inspectProject(destination);
    assert.equal(result.ok, false);
    assert.ok(result.findings.some((finding) => finding.includes("prohibited Supabase runtime location")));
  } finally {
    await rm(parent, { recursive: true, force: true });
  }
});

test("doctor rejects malformed manifest metadata", async () => {
  const parent = await mkdtemp(path.join(os.tmpdir(), "infra9core-doctor-invalid-"));
  const destination = path.join(parent, "project");
  try {
    await generateProject({ destination, projectName: "Doctor Project", apps: ["go"], features: [], packageManager: "npm", git: false });
    const target = path.join(destination, ".infra9core", "manifest.json");
    const manifest = JSON.parse(await readFile(target, "utf8"));
    manifest.project.appDirectories.go = "../outside";
    await writeFile(target, JSON.stringify(manifest));
    const result = await inspectProject(destination);
    assert.equal(result.ok, false);
    assert.ok(result.findings.some((finding) => finding.includes("application directory is invalid")));
  } finally {
    await rm(parent, { recursive: true, force: true });
  }
});

test("doctor accepts private-bff without a public Supabase URL and rejects unknown modes", async () => {
  const parent = await mkdtemp(path.join(os.tmpdir(), "infra9core-doctor-gateway-mode-"));
  const destination = path.join(parent, "project");
  try {
    await generateProject({ destination, projectName: "Doctor Project", apps: [], features: [], packageManager: "npm", git: false });
    const target = path.join(destination, ".infra9core", "config.json");
    const config = JSON.parse(await readFile(target, "utf8"));
    config.deployment.gatewayExposureMode = "private-bff";
    delete config.deployment.supabasePublicUrl;
    await writeFile(target, JSON.stringify(config));
    const privateBffResult = await inspectProject(destination);
    assert.ok(privateBffResult.findings.every((finding) => finding.startsWith("generated project requires Node.js 24.x")));
    await mkdir(path.join(destination, "infra", "caddy"), { recursive: true });
    await writeFile(path.join(destination, "infra", "caddy", "Caddyfile"), "example.test { reverse_proxy 127.0.0.1:8000 }\n");
    const exposedResult = await inspectProject(destination);
    assert.ok(exposedResult.findings.some((finding) => finding.includes("private-bff Caddyfile exposes")));
    config.deployment.gatewayExposureMode = "public-kong-by-accident";
    await writeFile(target, JSON.stringify(config));
    const result = await inspectProject(destination);
    assert.equal(result.ok, false);
    assert.ok(result.findings.some((finding) => finding.includes("gateway exposure mode is invalid")));
  } finally {
    await rm(parent, { recursive: true, force: true });
  }
});
