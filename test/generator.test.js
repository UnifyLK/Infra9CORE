import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { generateProject } from "../src/generator.js";

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
      ".editorconfig", ".gitattributes", ".gitignore", ".nvmrc",
      "LICENSE", "Makefile", "README.md", "infra/docker/docker-compose.yml",
      "infra/caddy/Caddyfile.example", "supabase/functions/main/index.ts",
      "tools/validate.sh",
    ]) {
      assert.ok((await readFile(path.join(destination, file))).length > 0);
    }
    await assert.rejects(() => readdir(path.join(destination, "src")), { code: "ENOENT" });
    await assert.rejects(() => readdir(path.join(destination, "test")), { code: "ENOENT" });
    await assert.rejects(() => readdir(path.join(destination, "templates")), { code: "ENOENT" });
  } finally {
    await rm(parent, { recursive: true, force: true });
  }
});

test("creates an isolated multi-stack repository", async () => {
  const parent = await mkdtemp(path.join(os.tmpdir(), "infra9core-generate-"));
  const destination = path.join(parent, "acme-platform");
  try {
    const result = await generateProject({
      destination, projectName: "Acme Platform",
      apps: ["sveltekit", "flutter", "python", "go", "rust", "tauri", "custom"],
      features: ["ci"], packageManager: "pnpm",
      git: false, install: false,
    });
    assert.equal(result.created, true);
    assert.match(await readFile(path.join(destination, "README.md"), "utf8"), /Acme Platform/);
    assert.equal(
      JSON.parse(await readFile(path.join(destination, "package.json"), "utf8")).engines.node,
      ">=24.0.0",
    );
    assert.match(await readFile(path.join(destination, "infra/env/.env.example"), "utf8"), /PROJECT_SLUG=acme-platform/);
    assert.match(await readFile(path.join(destination, "apps/api-go/go.mod"), "utf8"), /example\.invalid\/acme-platform-api-go/);
    assert.match(await readFile(path.join(destination, "apps/api-python/pyproject.toml"), "utf8"), /fastapi/);
    assert.match(await readFile(path.join(destination, "apps/desktop/src-tauri/tauri.conf.json"), "utf8"), /Acme Platform/);
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
