#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

const root = process.cwd();
const pkg = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));
const manifest = JSON.parse(readFileSync(path.join(root, ".infra9core", "manifest.json"), "utf8"));
const [manager, version] = (pkg.packageManager ?? "").split("@", 2);
const locks = { npm: "package-lock.json", pnpm: "pnpm-lock.yaml", yarn: "yarn.lock", bun: "bun.lock" };
const javascriptWorkspace = manifest.project.apps.some((app) => ["sveltekit", "tauri"].includes(app));

function fail(message) { console.error(`CI verification failed: ${message}`); process.exit(1); }
function run(command, args, cwd = root) {
  const result = spawnSync(command, args, { cwd, stdio: "inherit" });
  if (result.error) fail(`${command} is unavailable: ${result.error.message}`);
  if (result.status !== 0) fail(`${command} ${args.join(" ")} failed`);
}
function requireNode24() {
  if (Number(process.versions.node.split(".", 1)[0]) !== 24) fail(`Node.js 24.x is required; found ${process.versions.node}`);
}
function requireLock() {
  if (!locks[manager]) fail(`unsupported package manager declaration: ${pkg.packageManager}`);
  if (!existsSync(path.join(root, locks[manager]))) {
    fail(`missing ${locks[manager]}; run '${manager} install' locally, review it, and commit the authoritative root lockfile`);
  }
  for (const candidate of Object.values(locks)) {
    if (candidate !== locks[manager] && existsSync(path.join(root, candidate))) fail(`conflicting lockfile ${candidate}; retain only ${locks[manager]} for ${manager}`);
  }
}
function install() {
  if (!javascriptWorkspace) return;
  requireLock();
  if (manager === "npm") run("npm", ["ci"]);
  if (manager === "pnpm") { run("corepack", ["enable"]); run("pnpm", ["install", "--frozen-lockfile"]); }
  if (manager === "yarn") { run("corepack", ["enable"]); run("yarn", ["install", "--immutable"]); }
  if (manager === "bun") { run("npm", ["install", "--global", `bun@${version}`]); run("bun", ["install", "--frozen-lockfile"]); }
}
function quality() {
  if (!javascriptWorkspace) return;
  const appsRoot = path.join(root, "apps");
  for (const entry of readdirSync(appsRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const directory = path.join(appsRoot, entry.name);
    const appPackage = path.join(directory, "package.json");
    if (!existsSync(appPackage)) continue;
    const scripts = JSON.parse(readFileSync(appPackage, "utf8")).scripts ?? {};
    for (const script of ["lint", "typecheck", "build", "test"]) {
      if (scripts[script]) run(manager, ["run", script], directory);
    }
  }
}

requireNode24();
if (process.argv[2] === "install") install();
else if (process.argv[2] === "quality") quality();
else fail("use: ci-verify.mjs <install|quality>");
