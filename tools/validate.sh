#!/usr/bin/env bash
set -Eeuo pipefail

repo_root="$(cd -- "$(dirname -- "$0")/.." && pwd)"
cd "${repo_root}"

node_major="$(node --version | sed -E 's/^v([0-9]+).*/\1/')"
[[ "${node_major}" == "24" ]] || {
  printf 'Infra9CORE validation requires Node.js 24; found %s.\n' "$(node --version)" >&2
  exit 1
}

for file in templates/project/features/supabase/infra/scripts/*.sh; do
  bash -n "${file}"
done
sh -n templates/project/features/supabase/infra/supabase/volumes/api/kong-entrypoint.sh

docker compose \
  --env-file templates/project/features/supabase/infra/env/.env.example \
  --file templates/project/features/supabase/infra/docker/docker-compose.yml \
  config --quiet

if grep -RInE --exclude-dir='.git' --exclude='.env.example' --exclude='validate.sh' \
  '(eyJ[A-Za-z0-9_-]{20,}|sk_(live|test)_[A-Za-z0-9]+)' .; then
  printf 'Credential-shaped content found in source.\n' >&2
  exit 1
fi

npm test
npm run test:package >/dev/null
printf 'Infra9CORE generator and template validation passed.\n'
