import { readFile, stat } from "node:fs/promises";
import path from "node:path";

const requiredDirectories = ["apps", "docs", "infra", "packages", "shared", "supabase", "tools"];
const javascriptApps = new Set(["sveltekit", "tauri"]);

async function exists(target) {
  try { await stat(target); return true; } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
}

export async function inspectProject(projectPath) {
  const root = path.resolve(projectPath);
  const findings = [];
  let manifest;
  try {
    manifest = JSON.parse(await readFile(path.join(root, ".infra9core", "manifest.json"), "utf8"));
  } catch (error) {
    findings.push(`manifest unavailable: ${error.code === "ENOENT" ? "missing" : "invalid JSON"}`);
    return { root, manifest: null, findings, ok: false };
  }
  if (manifest.schemaVersion !== 1) findings.push(`unsupported manifest schema: ${manifest.schemaVersion}`);
  if (manifest.generator?.package !== "@unifyit/create-infra9core") findings.push("manifest generator package is invalid");
  for (const directory of requiredDirectories) {
    if (!(await exists(path.join(root, directory)))) findings.push(`required directory missing: ${directory}`);
  }
  for (const app of manifest.project?.apps ?? []) {
    const directory = manifest.project.appDirectories?.[app];
    if (!directory || !(await exists(path.join(root, "apps", directory)))) {
      findings.push(`selected app directory missing: ${app}`);
    }
  }
  if ((manifest.project?.apps ?? []).some((app) => javascriptApps.has(app))) {
    const major = Number(process.versions.node.split(".", 1)[0]);
    if (major !== 24) findings.push(`generated JavaScript workspace requires Node.js 24.x; found ${process.versions.node}`);
  }
  return { root, manifest, findings, ok: findings.length === 0 };
}
