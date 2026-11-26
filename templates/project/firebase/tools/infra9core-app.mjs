#!/usr/bin/env node
import { mkdir, readdir, readFile, writeFile, access } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const registryDir = path.join(root, ".infra9core", "apps");
const idPattern = /^[a-z][a-z0-9-]{2,62}$/;
const appPathPattern = /^apps\/(?:[a-z0-9][a-z0-9-]*\/)*[a-z0-9][a-z0-9-]*$/;
const firestoreDatabasePattern = /^(?:\(default\)|[a-z][a-z0-9-]{2,62})$/;
const hostingSitePattern = /^[a-z0-9](?:[a-z0-9-]{0,28}[a-z0-9])?$/;
const publicPathPattern = /^(?!\/)(?!.*(?:^|\/)\.\.(?:\/|$))[a-zA-Z0-9._/-]+$/;
const args = Object.fromEntries(process.argv.slice(3).map((value) => { const [key, ...rest] = value.split("="); return [key.replace(/^--/, ""), rest.join("=")]; }));
const command = process.argv[2];

function fail(message) { console.error(`infra9core app: ${message}`); process.exitCode = 1; }
function csv(value = "") { return value ? [...new Set(value.split(",").map((item) => item.trim()).filter(Boolean))] : []; }
function appPath(id, group = "") { return `apps/${group ? `${group.replace(/^apps\//, "").replace(/^\/+|\/+$/g, "")}/` : ""}${id}`; }
function validate(registration) {
  const findings = [];
  if (registration.schemaVersion !== 1) findings.push("schemaVersion must be 1");
  if (!idPattern.test(registration.id ?? "")) findings.push("id must be lowercase kebab-case (3-63 chars)");
  if (!appPathPattern.test(registration.path ?? "")) findings.push("path must be a relative apps/ path without traversal");
  if (typeof registration.type !== "string" || !registration.type) findings.push("type is required");
  for (const field of ["capabilities", "dependencies"]) if (!Array.isArray(registration[field]) || new Set(registration[field]).size !== registration[field].length || registration[field].some((item) => typeof item !== "string" || !item)) findings.push(`${field} must be a unique string array`);
  const firebase = registration.firebase;
  if (firebase !== undefined) {
    if (!firebase || typeof firebase !== "object" || Array.isArray(firebase)) findings.push("firebase must be an object");
    else {
      for (const field of ["firestoreDatabase", "functionsCodebase", "hostingTarget", "hostingSite", "hostingPublic"]) if (firebase[field] !== undefined && (typeof firebase[field] !== "string" || !firebase[field])) findings.push(`firebase.${field} must be a non-empty string`);
      if (firebase.firestoreDatabase && !firestoreDatabasePattern.test(firebase.firestoreDatabase)) findings.push("firebase.firestoreDatabase is not a valid database identifier");
      if (firebase.functionsCodebase && !idPattern.test(firebase.functionsCodebase)) findings.push("firebase.functionsCodebase must be a lowercase kebab-case identifier (3-63 characters)");
      if (firebase.hostingTarget && !idPattern.test(firebase.hostingTarget)) findings.push("firebase.hostingTarget must be a lowercase kebab-case identifier (3-63 characters)");
      if (firebase.hostingSite && !hostingSitePattern.test(firebase.hostingSite)) findings.push("firebase.hostingSite is not a valid hostname label (1-30 characters)");
      if (firebase.hostingPublic && !publicPathPattern.test(firebase.hostingPublic)) findings.push("firebase.hostingPublic must be a relative path without traversal");
      if ((firebase.hostingTarget === undefined) !== (firebase.hostingSite === undefined)) findings.push("firebase hostingTarget and hostingSite must be supplied together");
      if (firebase.hostingTarget && !firebase.hostingPublic) findings.push("firebase hostingPublic is required with a Hosting target");
    }
  }
  return findings;
}
async function registrations() {
  const entries = await readdir(registryDir).catch(() => []); const records = [];
  for (const entry of entries.filter((item) => item.endsWith(".json")).sort()) {
    try { records.push({ file: entry, value: JSON.parse(await readFile(path.join(registryDir, entry), "utf8")) }); }
    catch { records.push({ file: entry, value: null, parseError: true }); }
  }
  return records;
}
async function validateAll() {
  const records = await registrations(); const findings = []; const ids = new Set(); const paths = new Set();
  for (const record of records) {
    if (record.parseError) { findings.push(`${record.file}: invalid JSON`); continue; }
    for (const finding of validate(record.value)) findings.push(`${record.file}: ${finding}`);
    if (ids.has(record.value.id)) findings.push(`${record.file}: duplicate id`); ids.add(record.value.id);
    if (paths.has(record.value.path)) findings.push(`${record.file}: duplicate path`); paths.add(record.value.path);
    await access(path.join(root, record.value.path)).catch(() => findings.push(`${record.file}: registered application path is missing`));
  }
  const claimed = new Map();
  for (const record of records.filter((record) => record.value)) {
    for (const field of ["firestoreDatabase", "functionsCodebase", "hostingTarget", "hostingSite"]) {
      const value = record.value.firebase?.[field]; if (!value) continue;
      const key = `${field}:${value}`;
      if (claimed.has(key)) findings.push(`Firebase ${field} is claimed by both ${claimed.get(key)} and ${record.value.id}`);
      else claimed.set(key, record.value.id);
    }
  }
  if (findings.length) { findings.forEach((finding) => console.error(finding)); throw new Error("application registry validation failed"); }
  return records.map((record) => record.value);
}
function firebaseConfig(apps) {
  const firestore = []; const functions = []; const hosting = [];
  for (const app of apps) {
    const mapping = app.firebase; if (!mapping) continue;
    if (mapping.firestoreDatabase) firestore.push({ database: mapping.firestoreDatabase, rules: `firestore/${app.id}.rules`, indexes: `firestore/${app.id}.indexes.json` });
    if (mapping.functionsCodebase) functions.push({ source: `functions/${app.id}`, codebase: mapping.functionsCodebase });
    if (mapping.hostingTarget) hosting.push({ target: mapping.hostingTarget, public: mapping.hostingPublic, ignore: ["firebase.json", "**/.*", "**/node_modules/**"] });
  }
  return { $schema: "https://raw.githubusercontent.com/firebase/firebase-tools/master/schema/firebase-config.json", ...(firestore.length ? { firestore } : {}), storage: { rules: "storage.rules" }, ...(functions.length ? { functions } : {}), ...(hosting.length ? { hosting } : {}), emulators: { auth: { port: 9099 }, firestore: { port: 8080 }, storage: { port: 9199 }, ui: { enabled: true, port: 4000 } } };
}
async function create() {
  const id = args.APP; const group = args.GROUP ?? ""; const type = args.TYPE || "custom";
  if (!idPattern.test(id ?? "")) throw new Error("APP must be a lowercase kebab-case identifier (3-63 characters)");
  if (!/^(?:[a-z0-9-]+\/)*[a-z0-9-]*$/.test(group)) throw new Error("GROUP may contain lowercase kebab-case path segments only");
  const targetPath = appPath(id, group); const target = path.join(root, targetPath); const destination = path.join(registryDir, `${id}.json`);
  await access(target).then(() => { throw new Error(`application path already exists: ${targetPath}`); }).catch((error) => { if (error.code !== "ENOENT") throw error; });
  await access(destination).then(() => { throw new Error(`application is already registered: ${id}`); }).catch((error) => { if (error.code !== "ENOENT") throw error; });
  const firebase = {};
  if (args.FIRESTORE_DATABASE) firebase.firestoreDatabase = args.FIRESTORE_DATABASE;
  if (args.FUNCTIONS_CODEBASE) firebase.functionsCodebase = args.FUNCTIONS_CODEBASE;
  if (args.HOSTING_TARGET || args.HOSTING_SITE || args.HOSTING_PUBLIC) Object.assign(firebase, { hostingTarget: args.HOSTING_TARGET, hostingSite: args.HOSTING_SITE, hostingPublic: args.HOSTING_PUBLIC });
  const registration = { schemaVersion: 1, id, path: targetPath, type, capabilities: csv(args.CAPABILITIES), dependencies: csv(args.DEPENDENCIES), ...(Object.keys(firebase).length ? { firebase } : {}) };
  const findings = validate(registration); if (findings.length) throw new Error(findings.join("; "));
  await mkdir(target, { recursive: true }); await mkdir(registryDir, { recursive: true });
  await writeFile(path.join(target, "README.md"), `# ${id}\n\nApplication boundary registered in \`.infra9core/apps/${id}.json\`. Add the selected stack scaffold here; do not import another application directly.\n`);
  if (firebase.firestoreDatabase) { await mkdir(path.join(root, "firebase", "firestore"), { recursive: true }); await writeFile(path.join(root, "firebase", "firestore", `${id}.rules`), "rules_version = '2';\nservice cloud.firestore { match /databases/{database}/documents { match /{document=**} { allow read, write: if false; } } }\n"); await writeFile(path.join(root, "firebase", "firestore", `${id}.indexes.json`), "{ \"indexes\": [], \"fieldOverrides\": [] }\n"); }
  if (firebase.functionsCodebase) { await mkdir(path.join(root, "firebase", "functions", id), { recursive: true }); await writeFile(path.join(root, "firebase", "functions", id, "README.md"), `# ${id} Functions\n\nThis is the independently deployed Firebase Functions codebase \`${firebase.functionsCodebase}\`. Add an explicitly selected 2nd-generation runtime before deployment.\n`); }
  await writeFile(destination, JSON.stringify(registration, null, 2) + "\n"); console.log(`Created ${targetPath} and .infra9core/apps/${id}.json. Review and commit the registration before provisioning.`);
}
async function plan(appId) {
  const apps = await validateAll(); const app = apps.find((item) => item.id === appId); if (!app) throw new Error(`unknown APP: ${appId}`);
  const targetCommand = app.firebase?.hostingTarget ? `firebase target:apply hosting ${app.firebase.hostingTarget} ${app.firebase.hostingSite} --project \"$FIREBASE_PROJECT_ID\"` : null;
  console.log(JSON.stringify({ action: "adoption-plan", application: app.id, path: app.path, firebase: app.firebase ?? {}, createsRemoteResources: false, requiredVerification: ["Confirm Firebase project ID and IAM outside this command.", "Confirm each configured Hosting site, Firestore database, and Functions codebase exists or is explicitly approved for creation.", "Use 2nd-generation Functions for named Firestore database triggers."], operatorCommands: targetCommand ? [targetCommand, "Review the resulting .firebaserc target mapping before deployment."] : [] }, null, 2));
}
async function deploy(appId) {
  const apps = await validateAll(); const app = apps.find((item) => item.id === appId); if (!app) throw new Error(`unknown APP: ${appId}`);
  if (process.env.CONFIRM_DEPLOY !== "1") throw new Error("refusing deployment: rerun with CONFIRM_DEPLOY=1 after reviewing make app-plan APP=...");
  if (app.firebase?.hostingTarget && process.env.CONFIRM_TARGETS !== "1") throw new Error("refusing Hosting deployment: verify the existing site mapping from app-plan, then rerun with CONFIRM_TARGETS=1");
  const parts = []; if (app.firebase?.functionsCodebase) parts.push(`functions:${app.firebase.functionsCodebase}`); if (app.firebase?.hostingTarget) parts.push(`hosting:${app.firebase.hostingTarget}`); if (!parts.length) throw new Error("application has no selectively deployable Functions or Hosting mapping; Firestore rules require an explicit reviewed firebase-deploy");
  await writeFile(path.join(root, "firebase", "firebase.generated.json"), JSON.stringify(firebaseConfig(apps), null, 2) + "\n");
  const command = ["deploy", "--config", "firebase/firebase.generated.json", "--project", process.env.FIREBASE_PROJECT_ID ?? "", "--only", parts.join(",")]; if (!process.env.FIREBASE_PROJECT_ID) throw new Error("FIREBASE_PROJECT_ID is required; run make env first");
  console.log(`Deploying only ${parts.join(", ")} for ${app.id}.`); const result = spawnSync("firebase", command, { cwd: root, stdio: "inherit" }); if (result.status) process.exitCode = result.status;
}
async function runScript(appId, script) {
  const apps = await validateAll(); const app = apps.find((item) => item.id === appId); if (!app) throw new Error(`unknown APP: ${appId}`);
  const directory = path.join(root, app.path); const packageFile = path.join(directory, "package.json");
  let pkg; try { pkg = JSON.parse(await readFile(packageFile, "utf8")); } catch { throw new Error(`${app.path} has no package.json; run its stack-native ${script} command and record that convention in its README`); }
  if (!pkg.scripts?.[script]) throw new Error(`${app.path} does not declare a ${script} script`);
  const rootPackage = JSON.parse(await readFile(path.join(root, "package.json"), "utf8")); const manager = (rootPackage.packageManager ?? "npm").split("@", 1)[0];
  const result = spawnSync(manager, ["run", script], { cwd: directory, stdio: "inherit" }); if (result.status) process.exitCode = result.status;
}
try {
  if (command === "create") await create();
  else if (command === "validate") { await validateAll(); console.log("Application registry validation passed."); }
  else if (command === "list") (await validateAll()).forEach((app) => console.log(`${app.id}\t${app.type}\t${app.path}`));
  else if (command === "plan") await plan(args.APP);
  else if (command === "firebase-config") { const apps = await validateAll(); await writeFile(path.join(root, "firebase", "firebase.generated.json"), JSON.stringify(firebaseConfig(apps), null, 2) + "\n"); console.log("Rendered firebase/firebase.generated.json from application registrations."); }
  else if (command === "deploy") await deploy(args.APP);
  else if (command === "run") await runScript(args.APP, args.SCRIPT);
  else throw new Error("usage: infra9core-app.mjs <create|validate|list|plan|firebase-config|deploy|run> [KEY=value]");
} catch (error) { fail(error.message); }
