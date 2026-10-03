#!/usr/bin/env bash
set -euo pipefail

repo_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
audit_root=$(mktemp -d "${TMPDIR:-/tmp}/infra9core-release.XXXXXX")
audit_project="$audit_root/project"
python_venv="$audit_root/python-venv"
cargo_target_dir="${XDG_CACHE_HOME:-$HOME/.cache}/infra9core/cargo-target"
audit_compose=(docker compose --env-file "$audit_project/infra/env/.env" --file "$audit_project/infra/docker/docker-compose.yml" --file "$audit_project/infra/docker/docker-compose.apps.yml")

cleanup() {
  "${audit_compose[@]}" down --remove-orphans >/dev/null 2>&1 || true
  find "$audit_root" -depth -delete 2>/dev/null || true
}
trap cleanup EXIT

if [[ -s "$HOME/.nvm/nvm.sh" ]]; then
  source "$HOME/.nvm/nvm.sh"
  nvm use 24 >/dev/null
fi
[[ "$(node --version)" == v24.* ]] || {
  echo "Infra9CORE release validation requires Node.js 24.x." >&2
  exit 1
}
mkdir -p "$cargo_target_dir"
export CARGO_TARGET_DIR="$cargo_target_dir"

cd "$repo_root"
for command_name in git npm corepack python3 go cargo flutter file rg docker curl; do
  command -v "$command_name" >/dev/null 2>&1 || {
    echo "Required release-validation command is unavailable: $command_name" >&2
    exit 1
  }
done
[[ -z "$(git status --porcelain)" ]] || { echo "Working tree is not clean." >&2; exit 1; }
npm ci
npm run validate
npm audit --omit=dev --audit-level=high

node ./bin/create-infra9core.js "$audit_project" \
  --name "Infra9CORE Release Audit" \
  --apps sveltekit,flutter,python,go,rust,tauri,custom \
  --features ci \
  --package-manager pnpm \
  --organization-id com.unifyit \
  --flutter-platforms android,linux,web \
  --yes --no-git

node "$audit_project/tools/infra9core-configure.mjs" --yes

node --input-type=module - "$audit_project/infra/env/.env" <<'NODE'
import { readFile, writeFile } from "node:fs/promises";
const target = process.argv[1];
let env = await readFile(target.replace(/\.env$/, ".env.example"), "utf8");
const values = {
  POSTGRES_PASSWORD: "release_audit_database_password_123",
  JWT_SECRET: "release_audit_jwt_secret_at_least_32_characters",
  SUPABASE_ANON_KEY: "release_audit_anon_key",
  SUPABASE_SERVICE_ROLE_KEY: "release_audit_service_key",
  DASHBOARD_USERNAME: "release-audit",
  DASHBOARD_PASSWORD: "release_audit_dashboard_password_123",
  SMTP_HOST: "smtp.example.invalid",
  SMTP_USER: "release-audit",
  SMTP_PASS: "release_audit_smtp_password",
};
for (const [key, value] of Object.entries(values)) env = env.replace(new RegExp(`^${key}=.*$`, "m"), `${key}=${value}`);
await writeFile(target, env);
NODE

if rg -n '\{\{[A-Z_]+\}\}' "$audit_project"; then
  echo "Unresolved template tokens found." >&2
  exit 1
fi

file "$audit_project/apps/desktop/src-tauri/icons/icon.png" | grep -q 'PNG image data'
"${audit_compose[@]}" config --quiet
if command -v caddy >/dev/null 2>&1; then
  STUDIO_HTTP_USER=release-audit STUDIO_HTTP_PASSWORD_HASH='$2a$14$abcdefghijklmnopqrstuvABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdef' \
    caddy validate --config "$audit_project/infra/caddy/Caddyfile" --adapter caddyfile
fi
"${audit_compose[@]}" build web api-python api-go api-rust
for service_port in web:3000 api-python:8080 api-go:8080 api-rust:8080; do
  service="${service_port%%:*}"
  container_port="${service_port##*:}"
  "${audit_compose[@]}" up --detach --no-deps "$service"
  host_port="$("${audit_compose[@]}" port "$service" "$container_port" | sed 's/.*://')"
  for attempt in $(seq 1 20); do
    if curl --fail --silent --show-error "http://127.0.0.1:${host_port}/health" >/dev/null; then break; fi
    sleep 1
  done
  curl --fail --silent --show-error "http://127.0.0.1:${host_port}/health" >/dev/null
done
"${audit_compose[@]}" down --remove-orphans
corepack pnpm --dir "$audit_project" install --frozen-lockfile=false
corepack pnpm --dir "$audit_project" lint
corepack pnpm --dir "$audit_project" typecheck
corepack pnpm --dir "$audit_project" test

python3 -m venv "$python_venv"
"$python_venv/bin/pip" install -e "$audit_project/apps/api-python[dev]"
"$python_venv/bin/ruff" check "$audit_project/apps/api-python"
"$python_venv/bin/pytest" "$audit_project/apps/api-python"

(
  cd "$audit_project/apps/api-go"
  go test ./...
)
cargo check --manifest-path "$audit_project/apps/api-rust/Cargo.toml"
(
  cd "$audit_project/apps/mobile"
  flutter pub get
  flutter analyze
  flutter test
  flutter build apk --debug
  test -s build/app/outputs/flutter-apk/app-debug.apk
)

echo "Infra9CORE release-candidate validation passed."
