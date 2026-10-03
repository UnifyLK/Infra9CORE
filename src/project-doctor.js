import { lstat, readFile } from "node:fs/promises";
import path from "node:path";
import { APP_DEFAULT_NAMES, APP_TYPES, FEATURES, PACKAGE_MANAGERS } from "./constants.js";

const requiredDirectories = ["apps", "docs", "infra", "packages", "shared", "supabase", "tools"];
const requiredSupabaseDirectories = [
  "supabase/functions",
  "supabase/migrations",
  "supabase/rollbacks",
  "infra/supabase/volumes/api",
  "infra/supabase/volumes/db/init",
];

async function isDirectory(target) {
  try {
    const entry = await lstat(target);
    return entry.isDirectory() && !entry.isSymbolicLink();
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
}

function isStringArray(value, allowed) {
  return Array.isArray(value) && value.every((item) => typeof item === "string" && allowed.includes(item)) && new Set(value).size === value.length;
}

function validateManifest(manifest, findings) {
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) return findings.push("manifest root must be an object");
  if (manifest.schemaVersion !== 1) findings.push(`unsupported manifest schema: ${manifest.schemaVersion}`);
  if (manifest.templateContractVersion !== 1) findings.push(`unsupported template contract: ${manifest.templateContractVersion}`);
  if (manifest.generator?.package !== "@unifyit/create-infra9core") findings.push("manifest generator package is invalid");
  if (typeof manifest.generator?.version !== "string" || !manifest.generator.version) findings.push("manifest generator version is invalid");
  const project = manifest.project;
  if (!project || typeof project !== "object" || Array.isArray(project)) return findings.push("manifest project metadata is invalid");
  if (!isStringArray(project.apps, APP_TYPES)) findings.push("manifest application recipes are invalid");
  if (!isStringArray(project.features, FEATURES)) findings.push("manifest features are invalid");
  if (!PACKAGE_MANAGERS.includes(project.packageManager)) findings.push("manifest package manager is invalid");
  if (!project.appDirectories || typeof project.appDirectories !== "object" || Array.isArray(project.appDirectories)) {
    findings.push("manifest application directories are invalid");
    return;
  }
  for (const app of project.apps ?? []) {
    if (project.appDirectories[app] !== APP_DEFAULT_NAMES[app]) findings.push(`manifest application directory is invalid: ${app}`);
  }
}

function validateFirstRunConfig(config, findings) {
  if (!config || typeof config !== "object" || Array.isArray(config)) return findings.push("first-run configuration must be an object");
  if (config.schemaVersion !== 1) findings.push(`unsupported first-run configuration schema: ${config.schemaVersion}`);
  if (typeof config.project?.slug !== "string" || !config.project.slug) findings.push("first-run project slug is invalid");
  const deployment = config.deployment;
  if (!deployment || typeof deployment !== "object" || Array.isArray(deployment)) return findings.push("first-run deployment metadata is invalid");
  for (const key of ["environment", "appDomain", "studioDomain", "tlsEmail", "publicAppUrl", "supabaseInternalUrl", "imageRegistry"]) {
    if (typeof deployment[key] !== "string" || !deployment[key]) findings.push(`first-run deployment field is invalid: ${key}`);
  }
  if (!["private-bff", "public-supabase"].includes(deployment.gatewayExposureMode)) {
    findings.push("first-run deployment gateway exposure mode is invalid");
  }
  if (deployment.gatewayExposureMode === "public-supabase" && (typeof deployment.supabasePublicUrl !== "string" || !deployment.supabasePublicUrl)) {
    findings.push("first-run deployment field is invalid: supabasePublicUrl");
  }
  if (!Number.isInteger(deployment.appPort) || deployment.appPort < 1024 || deployment.appPort > 65535) {
    findings.push("first-run deployment field is invalid: appPort");
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
  validateManifest(manifest, findings);
  let firstRunConfig;
  try {
    firstRunConfig = JSON.parse(await readFile(path.join(root, ".infra9core", "config.json"), "utf8"));
    validateFirstRunConfig(firstRunConfig, findings);
  } catch (error) {
    findings.push(`first-run configuration unavailable: ${error.code === "ENOENT" ? "missing" : "invalid JSON"}`);
  }
  for (const directory of requiredDirectories) {
    if (!(await isDirectory(path.join(root, directory)))) findings.push(`required directory missing or invalid: ${directory}`);
  }
  for (const directory of requiredSupabaseDirectories) {
    if (!(await isDirectory(path.join(root, directory)))) findings.push(`required Supabase boundary missing or invalid: ${directory}`);
  }
  if (await isDirectory(path.join(root, "supabase/runtime"))) {
    findings.push("prohibited Supabase runtime location: supabase/runtime; use infra/supabase/volumes");
  }
  if (firstRunConfig?.deployment?.gatewayExposureMode === "private-bff") {
    const caddy = await readFile(path.join(root, "infra", "caddy", "Caddyfile"), "utf8").catch((error) => error.code === "ENOENT" ? null : Promise.reject(error));
    if (caddy && /(?:auth|rest|realtime|storage|functions)\/v1|127\.0\.0\.1:(?:8000|3001)/.test(caddy)) {
      findings.push("private-bff Caddyfile exposes a prohibited Supabase or Studio route");
    }
  }
  for (const app of manifest.project?.apps ?? []) {
    const directory = manifest.project.appDirectories?.[app];
    if (!directory || !(await isDirectory(path.join(root, "apps", APP_DEFAULT_NAMES[app])))) {
      findings.push(`selected app directory missing: ${app}`);
    }
  }
  const major = Number(process.versions.node.split(".", 1)[0]);
  if (major !== 24) findings.push(`generated project requires Node.js 24.x; found ${process.versions.node}`);
  return { root, manifest, findings, ok: findings.length === 0 };
}
