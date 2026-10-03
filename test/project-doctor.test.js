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
