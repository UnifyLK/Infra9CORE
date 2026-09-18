#!/usr/bin/env bash
set -Eeuo pipefail

repo_root="$(cd -- "$(dirname -- "$0")/.." && pwd)"
cd "${repo_root}"

for file in infra/scripts/*.sh; do
  bash -n "${file}"
done
sh -n infra/supabase/volumes/api/kong-entrypoint.sh

if command -v shellcheck >/dev/null 2>&1; then
  shellcheck infra/scripts/*.sh infra/supabase/volumes/api/kong-entrypoint.sh
fi

docker compose \
  --env-file infra/env/.env.example \
  --file infra/docker/docker-compose.yml \
  config --quiet

if grep -RInE --exclude-dir='.git' \
  --exclude='.env.example' --exclude='validate.sh' \
  '(eyJ[A-Za-z0-9_-]{20,}|sk_(live|test)_[A-Za-z0-9]+)' .; then
  printf 'Credential-shaped content found in tracked source.\n' >&2
  exit 1
fi

while IFS= read -r migration; do
  filename="$(basename "${migration}")"
  [[ -f "supabase/rollbacks/${filename}" ]] || {
    printf 'Missing rollback for %s\n' "${filename}" >&2
    exit 1
  }
  grep -Eiq 'alter[[:space:]]+table.+enable[[:space:]]+row[[:space:]]+level[[:space:]]+security' "${migration}" || {
    printf 'Migration %s must explicitly enable RLS.\n' "${filename}" >&2
    exit 1
  }
done < <(find supabase/migrations -maxdepth 1 -type f -name '*.sql' | sort)

printf 'Static infrastructure validation passed.\n'
