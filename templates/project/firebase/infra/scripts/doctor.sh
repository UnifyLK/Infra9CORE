#!/usr/bin/env bash
set -Eeuo pipefail
source "$(dirname "$0")/lib.sh"
require_command docker
require_command firebase
require_node_24
docker compose version >/dev/null 2>&1 || die "Docker Compose v2 is required"
require_env
set -a; source "${ENV_FILE}"; set +a
[[ "${FIREBASE_PROJECT_ID}" != CHANGE_ME* && -n "${FIREBASE_PROJECT_ID}" ]] || die "FIREBASE_PROJECT_ID is required"
[[ "${IMAGE_REGISTRY}" != "docker.io" || "${DEPLOY_ENV}" != "production" ]] || die "Production images must use an approved private registry"
if [[ "${DEPLOY_ENV}" == "production" ]] && ! grep -q '^services: {}' "${REPO_ROOT}/infra/docker/docker-compose.apps.yml"; then
  "${REPO_ROOT}/tools/container-policy.sh" validate
fi
compose config --quiet
log info "Firebase managed-backend configuration and server Compose graph passed validation"
