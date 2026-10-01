#!/usr/bin/env bash
set -Eeuo pipefail
source "$(dirname "$0")/lib.sh"

for command_name in docker openssl curl; do
  require_command "${command_name}"
done
docker compose version >/dev/null 2>&1 || die "Docker Compose v2 is required"
require_env

if grep -Eq '(^|=)CHANGE_ME' "${ENV_FILE}"; then
  die "infra/env/.env still contains CHANGE_ME placeholders"
fi

set -a
# shellcheck disable=SC1090
source "${ENV_FILE}"
set +a

[[ "${JWT_SECRET:-}" != "${POSTGRES_PASSWORD:-}" ]] || die "JWT_SECRET and POSTGRES_PASSWORD must differ"
(( ${#JWT_SECRET} >= 32 )) || die "JWT_SECRET must contain at least 32 characters"
[[ "${SUPABASE_BIND_ADDRESS}" == "127.0.0.1" || "${DEPLOY_ENV}" != "production" ]] || \
  die "Production Supabase ports must bind to 127.0.0.1 behind native Caddy"
[[ "${IMAGE_REGISTRY}" != "docker.io" || "${DEPLOY_ENV}" != "production" ]] || \
  die "Production images must be mirrored to an approved private registry"
if [[ "${DEPLOY_ENV}" == "production" ]]; then
  for image_variable in \
    SUPABASE_POSTGRES_IMAGE SUPABASE_GOTRUE_IMAGE SUPABASE_POSTGREST_IMAGE \
    SUPABASE_REALTIME_IMAGE SUPABASE_STORAGE_IMAGE SUPABASE_IMGPROXY_IMAGE \
    SUPABASE_META_IMAGE SUPABASE_EDGE_RUNTIME_IMAGE SUPABASE_KONG_IMAGE SUPABASE_STUDIO_IMAGE; do
    image_value="${!image_variable}"
    [[ "${image_value}" == *@sha256:* ]] || \
      die "Production ${image_variable} must use an immutable @sha256 digest"
  done
  [[ -f "${REPO_ROOT}/infra/images/manifest.json" ]] || \
    die "Production image approval manifest is missing"
fi

compose config --quiet
log info "Host tools, secrets, and Compose configuration passed validation"
