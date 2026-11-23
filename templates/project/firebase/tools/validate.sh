#!/usr/bin/env bash
set -Eeuo pipefail
repo_root="$(cd -- "$(dirname -- "$0")/.." && pwd)"
cd "${repo_root}"
for file in infra/scripts/*.sh; do bash -n "${file}"; done
node --check tools/infra9core-configure.mjs
docker compose --env-file infra/env/.env.example --file infra/docker/docker-compose.yml --file infra/docker/docker-compose.apps.yml config --quiet
for file in firebase/firestore.rules firebase/storage.rules firebase/firebase.json; do [[ -s "${file}" ]] || { echo "Missing Firebase contract: ${file}" >&2; exit 1; }; done
if grep -RInE --exclude-dir='.git' --exclude='.env.example' '(eyJ[A-Za-z0-9_-]{20,}|sk_(live|test)_[A-Za-z0-9]+|BEGIN PRIVATE KEY)' .; then echo 'Credential-shaped content found in tracked source.' >&2; exit 1; fi
printf 'Static Firebase infrastructure validation passed.\n'
