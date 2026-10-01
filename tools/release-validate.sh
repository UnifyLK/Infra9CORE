#!/usr/bin/env bash
set -euo pipefail

repo_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
audit_root=$(mktemp -d "${TMPDIR:-/tmp}/infra9core-release.XXXXXX")
audit_project="$audit_root/project"
python_venv="$audit_root/python-venv"
cargo_target_dir="${XDG_CACHE_HOME:-$HOME/.cache}/infra9core/cargo-target"

cleanup() {
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
for command_name in git npm corepack python3 go cargo flutter file rg; do
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

if rg -n '\{\{[A-Z_]+\}\}' "$audit_project"; then
  echo "Unresolved template tokens found." >&2
  exit 1
fi

file "$audit_project/apps/desktop/src-tauri/icons/icon.png" | grep -q 'PNG image data'
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
