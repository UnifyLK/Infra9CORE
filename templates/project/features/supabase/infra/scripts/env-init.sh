#!/usr/bin/env bash
set -Eeuo pipefail
source "$(dirname "$0")/lib.sh"

target="${ENV_FILE}"
template="${REPO_ROOT}/infra/env/.env.example"
[[ -f "${template}" ]] || die "Environment template is missing"

if [[ -f "${target}" ]]; then
  log info "Environment file already exists; no changes made"
  exit 0
fi

cp -- "${template}" "${target}"
chmod 600 "${target}"
log info "Created infra/env/.env; replace every CHANGE_ME value before startup"
