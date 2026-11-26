#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const configPath = path.join(root, ".infra9core", "config.json");
const config = JSON.parse(await readFile(configPath, "utf8"));
if (config.project.backend !== "firebase" || config.project.containerization !== "none") throw new Error("Native Firebase configuration requires backend=firebase and containerization=none");
const envExample = path.join(root, "infra", "env", ".env.example");
await mkdir(path.join(root, "docs", "infra9core"), { recursive: true });
const env = await readFile(envExample, "utf8");
await writeFile(envExample, env.replace("PROJECT_SLUG=change-me", `PROJECT_SLUG=${config.project.slug}`));
await writeFile(path.join(root, "docs", "infra9core", "FIRST_RUN_AGENT_PROMPT.md"), `# Native Firebase first-run coding-agent brief

This repository uses the managed Firebase profile with \`containerization=none\`.
Use \`.infra9core/config.json\` only for non-secret deployment identity and
\`infra/env/.env\` only for local configuration. Never commit credentials,
service-account JSON, or provider tokens.

1. Read \`AGENTS.md\`, the Firebase ADR, \`docs/openapi.yaml\`, and all runbooks.
2. Model the domain and add append-only ADRs before implementation; keep domain logic independent of Firebase SDK adapters.
3. Define API contracts before Functions adapters. Design Firestore documents, indexes, Auth claims, and Storage paths, then add deny-by-default rules with Emulator Suite tests.
4. Run \`make doctor\` and \`make firebase-emulators\` after configuring \`infra/env/.env\`.
5. Use \`make app-validate\` for generic application records. Review and test product-owned native Firebase configuration before an approved deployment.
6. Use Application Default Credentials or managed CI secrets. Add structured request tracing, tests, and runbook updates before deployment.

Docker, Compose, Caddy, image registries, and container policies are intentionally
absent. Do not add them without an explicit containerization decision.
`);
console.log("Configured native Firebase project; no Docker or Caddy files were generated.");
