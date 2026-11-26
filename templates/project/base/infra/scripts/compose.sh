#!/usr/bin/env bash
set -Eeuo pipefail
source "$(dirname "$0")/lib.sh"
require_command docker
if [[ "${1:-}" == "up" && -f "${ENV_FILE}" ]]; then
  set -a; source "${ENV_FILE}"; set +a
  if [[ "${DEPLOY_ENV:-development}" == "production" ]] && { [[ -d "${REPO_ROOT}/supabase" ]] || ! grep -q '^services: {}' "${APP_COMPOSE_FILE}"; }; then
    "${REPO_ROOT}/tools/container-policy.sh" verify
  fi
fi
compose "$@"
