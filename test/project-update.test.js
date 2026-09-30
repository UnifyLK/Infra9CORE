import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { execFile as execFileCallback } from "node:child_process";
import { promisify } from "node:util";
import { generateProject } from "../src/generator.js";

const execFile = promisify(execFileCallback);

test("update check is read-only for a fresh project", async () => {
  const parent = await mkdtemp(path.join(os.tmpdir(), "infra9core-update-"));
  const destination = path.join(parent, "project");
  try {
    await generateProject({ destination, projectName: "Update Project", apps: ["go"], features: [], packageManager: "npm", git: false });
    const output = await execFile(process.execPath, ["bin/create-infra9core.js", "update", destination, "--check"], {
      cwd: path.resolve(import.meta.dirname, ".."),
    });
    assert.match(output.stdout, /No generator version drift detected/);
  } finally {
    await rm(parent, { recursive: true, force: true });
  }
});
