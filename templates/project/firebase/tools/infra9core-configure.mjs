#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { createInterface } from "node:readline/promises";
import { applySarvaOpsPortAllocation } from "./sarvaops-ports.mjs";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const configPath = path.join(root, ".infra9core", "config.json");
const yes = process.argv.includes("--yes");
const force = process.argv.includes("--force-managed-files");
const ask = async (question, current, rl) => yes ? current : ((await rl.question(`${question} [${current}]: `)).trim() || current);
const setEnv = (source, key, value) => {
  const expression = new RegExp(`^${key}=.*$`, "m");
  return expression.test(source) ? source.replace(expression, `${key}=${value}`) : `${source.trimEnd()}\n${key}=${value}\n`;
};
function renderCaddy(source, config) {
  return `# Managed by Infra9CORE. Re-run make infra9core to update this file.\n${source.replaceAll("{$TLS_EMAIL}", config.deployment.tlsEmail).replaceAll("{$APP_DOMAIN}", config.deployment.appDomain).replaceAll("{$APP_PORT}", String(config.deployment.appPort)).trimEnd()}\n`;
}
function renderPrompt(config) {
  const apps = config.project.apps.length ? config.project.apps.map((app) => `- \`${app}\``).join("\n") : "- No application recipe was selected.";
  return `# First-run coding-agent brief\n\nThis repository uses the managed Firebase backend profile. Treat \`.infra9core/config.json\` as non-secret deployment identity and \`infra/env/.env\` as local configuration. Never commit credentials, service-account JSON, API keys intended to be restricted, or provider tokens.\n\n## Selected application boundaries\n\n${apps}\n\n## Required first-run work\n\n1. Read \`AGENTS.md\`, \`docs/adr/0001-product-agnostic-infrastructure-baseline.md\`, \`docs/openapi.yaml\`, and all runbooks before changing infrastructure. Show me the folder tree, the main tools and what conventions Infra9CORE set up.\n2. Model the domain and record decisions in new ADRs before implementation.\n3. Define API contracts before Firebase Functions or application adapters; keep domain logic independent of Firebase SDKs.\n4. Design Firestore documents, indexes, Auth claims, and Storage paths. Add deny-by-default Firebase Rules with emulator tests before client integration.\n5. Configure \`infra/env/.env\`, then run \`make doctor\` and \`make firebase-emulators\`.\n6. Use Application Default Credentials or managed CI secrets for administration; never generate a self-hosted Firebase runtime.\n7. Add structured request tracing, tests, and runbook updates before deployment.\n\n## Guardrails\n\nFirebase is managed by Google. Do not add Supabase, Kong, Studio, Postgres lifecycle scripts, or Firebase-compatible Docker services to this profile. Use \`make firebase-deploy\` only after review of rules, indexes, Functions, and production identity.\n`;
}
const config = JSON.parse(await readFile(configPath, "utf8"));
if (config.project.backend !== "firebase") throw new Error("Firebase configuration requires a Firebase backend project");
const rl = yes ? null : createInterface({ input: process.stdin, output: process.stdout });
try {
  config.deployment.environment = await ask("Deployment environment", config.deployment.environment, rl);
  const provider = await ask("Host port allocation (direct or sarvaops)", config.deployment.portAllocation?.provider ?? "direct", rl);
  if (!['direct', 'sarvaops'].includes(provider)) throw new Error("Host port allocation must be direct or sarvaops");
  const previousPortAllocation = config.deployment.portAllocation;
  config.deployment.portAllocation = { provider };
  if (provider === "sarvaops") { const number = Number(await ask("SarvaOps project number", String(previousPortAllocation?.projectNumber ?? ""), rl)); if (!Number.isInteger(number)) throw new Error("SarvaOps project number must be an integer"); config.deployment.portAllocation.projectNumber = number; }
  config.deployment.appDomain = await ask("Application domain", config.deployment.appDomain, rl);
  config.deployment.tlsEmail = await ask("TLS contact email", config.deployment.tlsEmail, rl);
  config.deployment.publicAppUrl = await ask("Public application URL", config.deployment.publicAppUrl, rl);
  config.deployment.imageRegistry = await ask("Private production image registry", config.deployment.imageRegistry, rl);
} finally { rl?.close(); }
config.deployment = applySarvaOpsPortAllocation(config.deployment);
const envPath = path.join(root, "infra/env/.env.example"); const caddyPath = path.join(root, "infra/caddy/Caddyfile"); const promptPath = path.join(root, "docs/infra9core/FIRST_RUN_AGENT_PROMPT.md");
const existing = await readFile(caddyPath, "utf8").catch((error) => error.code === "ENOENT" ? null : Promise.reject(error));
if (existing && !existing.startsWith("# Managed by Infra9CORE") && !force) throw new Error("Refusing to replace unmanaged infra/caddy/Caddyfile. Use --force-managed-files only after reviewing it.");
let env = await readFile(envPath, "utf8");
for (const [key, value] of Object.entries({ PROJECT_SLUG: config.project.slug, COMPOSE_PROJECT_NAME: config.project.slug, DEPLOY_ENV: config.deployment.environment, PUBLIC_APP_URL: config.deployment.publicAppUrl, IMAGE_REGISTRY: config.deployment.imageRegistry })) env = setEnv(env, key, String(value));
const outputs = [[configPath, `${JSON.stringify(config, null, 2)}\n`], [envPath, env], [caddyPath, renderCaddy(await readFile(path.join(root, "infra/caddy/Caddyfile.example"), "utf8"), config)], [promptPath, renderPrompt(config)]];
console.log("Infra9CORE Firebase first-run configuration plan:"); console.log(`- environment: ${config.deployment.environment}`); console.log(`- application domain: ${config.deployment.appDomain}`); console.log("- backend: managed Firebase (no self-hosted runtime)");
if (!yes) { const confirm = createInterface({ input: process.stdin, output: process.stdout }); const answer = (await confirm.question("Apply this plan? [y/N] ")).trim().toLowerCase(); confirm.close(); if (!["y", "yes"].includes(answer)) { console.log("No files changed."); process.exit(0); } }
await mkdir(path.dirname(promptPath), { recursive: true }); for (const [target, content] of outputs) await writeFile(target, content); console.log("Configuration complete. Set FIREBASE_PROJECT_ID with make env, run make doctor, then use the initial handoff prompt in README.md.");
