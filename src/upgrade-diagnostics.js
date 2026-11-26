import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";

const locks = { npm: "package-lock.json", pnpm: "pnpm-lock.yaml", yarn: "yarn.lock", bun: "bun.lock" };
async function exists(target) { try { await access(target); return true; } catch { return false; } }

export async function inspectReadinessUpgrade(root, manifest) {
  const notices = [];
  const apps = manifest.project?.apps ?? [];
  const manager = manifest.project?.packageManager;
  if (manifest.project?.backend === "firebase" && !manifest.project?.containerization) notices.push("legacy Firebase project has implicit Docker containerization; no files were changed. Retain Docker or follow the native Firebase migration runbook deliberately");
  if (manifest.project?.backend === "firebase") {
    const entries = await readdir(path.join(root, ".infra9core", "apps")).catch(() => []);
    for (const entry of entries.filter((item) => item.endsWith(".json"))) {
      try {
        const registration = JSON.parse(await readFile(path.join(root, ".infra9core", "apps", entry), "utf8"));
        if (registration.firebase && typeof registration.firebase === "object") notices.push(`${entry} contains deprecated Firebase application-to-resource metadata; preserve topology in project-owned Firebase configuration and migrate it only through a reviewed consumer change`);
      } catch { /* project doctor reports malformed registration files */ }
    }
  }
  if (apps.some((app) => ["sveltekit", "tauri"].includes(app))) {
    const expected = locks[manager];
    if (!expected || !(await exists(path.join(root, expected)))) notices.push(`missing authoritative ${expected ?? "package-manager"} lockfile; run '${manager} install', review, and commit it before adopting frozen CI or Docker installs`);
    for (const candidate of Object.values(locks)) if (candidate !== expected && await exists(path.join(root, candidate))) notices.push(`conflicting lockfile detected: ${candidate}; retain only ${expected}`);
  }
  const validator = path.join(root, "tools", "validate.sh");
  if (await exists(validator)) {
    const content = await readFile(validator, "utf8");
    if (manifest.project?.backend === "firebase" && content.includes("BEGIN PRIVATE KEY") && !content.includes("--exclude='validate.sh'")) notices.push("Firebase credential validator may self-scan; adopt the validator exclusion fix");
  }
  const dockerfile = path.join(root, "apps", "web", "Dockerfile");
  if (apps.includes("sveltekit") && await exists(dockerfile) && (await readFile(dockerfile, "utf8")).includes("RUN npm install")) notices.push("SvelteKit Dockerfile uses mutable npm installation; adopt the workspace-aware frozen-install Dockerfile");
  return notices;
}
