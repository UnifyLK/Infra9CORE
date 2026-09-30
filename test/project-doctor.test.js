import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
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
