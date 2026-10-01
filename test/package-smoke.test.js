import assert from "node:assert/strict";
import { execFile as execFileCallback } from "node:child_process";
import { access, mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { promisify } from "node:util";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const execFile = promisify(execFileCallback);
const packageRoot = path.resolve(import.meta.dirname, "..");

test("packed package installs and generates a project through its consumer binary", async () => {
  const parent = await mkdtemp(path.join(os.tmpdir(), "infra9core-packed-"));
  try {
    const packed = JSON.parse((await execFile("npm", ["pack", "--json", "--pack-destination", parent], {
      cwd: packageRoot,
    })).stdout);
    const tarball = path.join(parent, packed[0].filename);
    const consumer = path.join(parent, "consumer");
    await mkdir(consumer);
    await execFile("npm", ["install", "--ignore-scripts", "--no-package-lock", "--prefix", consumer, tarball]);
    const destination = path.join(parent, "generated");
    await execFile(path.join(consumer, "node_modules", ".bin", "create-infra9core"), [
      destination,
      "--apps", "sveltekit,go",
      "--features", "none",
      "--package-manager", "npm",
      "--yes",
      "--no-git",
    ]);
    await access(path.join(destination, ".infra9core", "manifest.json"));
    await access(path.join(destination, "apps", "api-go", "go.mod"));
    const packageJson = JSON.parse(await readFile(path.join(destination, "package.json"), "utf8"));
    assert.equal(packageJson.packageManager, "npm@11.19.0");
    assert.ok(true);
  } finally {
    await rm(parent, { recursive: true, force: true });
  }
});
