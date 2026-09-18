#!/usr/bin/env bash
set -Eeuo pipefail

readonly SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
readonly REPO_ROOT="$(cd -- "${SCRIPT_DIR}/../.." && pwd)"
readonly ENV_FILE="${REPO_ROOT}/infra/env/.env"
readonly COMPOSE_FILE="${REPO_ROOT}/infra/docker/docker-compose.yml"

log() {
  printf '{"timestamp":"%s","level":"%s","component":"infra","message":"%s"}\n' \
    "$(date --utc +'%Y-%m-%dT%H:%M:%SZ')" "$1" "$2"
}

die() {
  log error "$1" >&2
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || die "Required command is unavailable: $1"
}

require_env() {
  [[ -f "${ENV_FILE}" ]] || die "Missing infra/env/.env; run make env"
}

compose() {
  require_env
  docker compose --env-file "${ENV_FILE}" --file "${COMPOSE_FILE}" "$@"
}
