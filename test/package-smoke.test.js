import assert from "node:assert/strict";
import { execFile as execFileCallback } from "node:child_process";
import { access, mkdir, mkdtemp, rm } from "node:fs/promises";
import { promisify } from "node:util";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const execFile = promisify(execFileCallback);
const packageRoot = path.resolve(import.meta.dirname, "..");

test("packed package generates a project", async () => {
  const parent = await mkdtemp(path.join(os.tmpdir(), "infra9core-packed-"));
  try {
    const packed = JSON.parse((await execFile("npm", ["pack", "--json", "--pack-destination", parent], {
      cwd: packageRoot,
    })).stdout);
    const tarball = path.join(parent, packed[0].filename);
    const extracted = path.join(parent, "extracted");
    await mkdir(extracted);
    await execFile("tar", ["-xzf", tarball, "-C", extracted]);
    const packageDirectory = path.join(extracted, "package");
    const destination = path.join(parent, "generated");
    await execFile(process.execPath, [
      path.join(packageDirectory, "bin", "create-infra9core.js"),
      destination,
      "--apps", "go",
      "--features", "none",
      "--yes",
      "--no-git",
    ]);
    await access(path.join(destination, ".infra9core", "manifest.json"));
    await access(path.join(destination, "apps", "api-go", "go.mod"));
    assert.ok(true);
  } finally {
    await rm(parent, { recursive: true, force: true });
  }
});
