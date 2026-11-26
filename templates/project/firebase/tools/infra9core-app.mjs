#!/usr/bin/env node
import { access, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const registryDir = path.join(root, ".infra9core", "apps");
const idPattern = /^[a-z][a-z0-9-]{2,62}$/;
const appPathPattern = /^apps\/(?:[a-z0-9][a-z0-9-]*\/)*[a-z0-9][a-z0-9-]*$/;
const args = Object.fromEntries(process.argv.slice(3).map((value) => { const [key, ...rest] = value.split("="); return [key.replace(/^--/, ""), rest.join("=")]; }));
const command = process.argv[2];

function csv(value = "") { return value ? [...new Set(value.split(",").map((item) => item.trim()).filter(Boolean))] : []; }
function fail(message) { console.error(`infra9core app: ${message}`); process.exitCode = 1; }
function appPath(id, group = "") { return `apps/${group ? `${group.replace(/^apps\//, "").replace(/^\/+|\/+$/g, "")}/` : ""}${id}`; }
function validate(registration) {
  const findings = [];
  if (registration.schemaVersion !== 1) findings.push("schemaVersion must be 1");
  if (!idPattern.test(registration.id ?? "")) findings.push("id must be lowercase kebab-case (3-63 chars)");
  if (!appPathPattern.test(registration.path ?? "")) findings.push("path must be a relative apps/ path without traversal");
  if (typeof registration.type !== "string" || !registration.type) findings.push("type is required");
  for (const field of ["capabilities", "dependencies"]) if (!Array.isArray(registration[field]) || new Set(registration[field]).size !== registration[field].length || registration[field].some((item) => typeof item !== "string" || !item)) findings.push(`${field} must be a unique string array`);
  return findings;
}
async function registrations() {
  const records = [];
  for (const file of (await readdir(registryDir).catch(() => [])).filter((entry) => entry.endsWith(".json")).sort()) {
    try { records.push({ file, value: JSON.parse(await readFile(path.join(registryDir, file), "utf8")) }); }
    catch { records.push({ file, parseError: true }); }
  }
  return records;
}
async function validateAll() {
  const findings = []; const ids = new Set(); const paths = new Set(); const records = await registrations();
  for (const record of records) {
    if (record.parseError) { findings.push(`${record.file}: invalid JSON`); continue; }
    for (const finding of validate(record.value)) findings.push(`${record.file}: ${finding}`);
    if (ids.has(record.value.id)) findings.push(`${record.file}: duplicate id`); ids.add(record.value.id);
    if (paths.has(record.value.path)) findings.push(`${record.file}: duplicate path`); paths.add(record.value.path);
    await access(path.join(root, record.value.path)).catch(() => findings.push(`${record.file}: registered application path is missing`));
  }
  if (findings.length) throw new Error(findings.join("\n"));
  return records.filter((record) => record.value).map((record) => record.value);
}
async function create() {
  const id = args.APP; const group = args.GROUP ?? ""; const type = args.TYPE || "custom";
  if (!idPattern.test(id ?? "")) throw new Error("APP must be a lowercase kebab-case identifier (3-63 characters)");
  if (!/^(?:[a-z0-9-]+\/)*[a-z0-9-]*$/.test(group)) throw new Error("GROUP may contain lowercase kebab-case path segments only");
  const targetPath = appPath(id, group); const target = path.join(root, targetPath); const registrationFile = path.join(registryDir, `${id}.json`);
  await access(target).then(() => { throw new Error(`application path already exists: ${targetPath}`); }).catch((error) => { if (error.code !== "ENOENT") throw error; });
  await access(registrationFile).then(() => { throw new Error(`application is already registered: ${id}`); }).catch((error) => { if (error.code !== "ENOENT") throw error; });
  const registration = { schemaVersion: 1, id, path: targetPath, type, capabilities: csv(args.CAPABILITIES), dependencies: csv(args.DEPENDENCIES) };
  const findings = validate(registration); if (findings.length) throw new Error(findings.join("; "));
  await mkdir(target, { recursive: true }); await mkdir(registryDir, { recursive: true });
  await writeFile(path.join(target, "README.md"), `# ${id}\n\nGeneric application boundary registered in \`.infra9core/apps/${id}.json\`. Add the selected stack scaffold here; consumer-owned backend topology belongs in project configuration.\n`);
  await writeFile(registrationFile, JSON.stringify(registration, null, 2) + "\n");
  console.log(`Created ${targetPath} and .infra9core/apps/${id}.json. No Firebase resources or topology were created.`);
}
async function runScript(appId, script) {
  const app = (await validateAll()).find((item) => item.id === appId); if (!app) throw new Error(`unknown APP: ${appId}`);
  const directory = path.join(root, app.path); const pkg = JSON.parse(await readFile(path.join(directory, "package.json"), "utf8"));
  if (!pkg.scripts?.[script]) throw new Error(`${app.path} does not declare a ${script} script`);
  const manager = (JSON.parse(await readFile(path.join(root, "package.json"), "utf8")).packageManager ?? "npm").split("@", 1)[0];
  const result = spawnSync(manager, ["run", script], { cwd: directory, stdio: "inherit" }); if (result.status) process.exitCode = result.status;
}
try {
  if (command === "create") await create();
  else if (command === "validate") { await validateAll(); console.log("Application registry validation passed."); }
  else if (command === "list") (await validateAll()).forEach((app) => console.log(`${app.id}\t${app.type}\t${app.path}`));
  else if (command === "run") await runScript(args.APP, args.SCRIPT);
  else throw new Error("usage: infra9core-app.mjs <create|validate|list|run> [KEY=value]");
} catch (error) { fail(error.message); }
