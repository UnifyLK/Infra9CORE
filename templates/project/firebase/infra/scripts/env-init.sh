#!/usr/bin/env bash
set -Eeuo pipefail
source "$(dirname "$0")/lib.sh"
[[ -f "${ENV_FILE}" ]] && { log info "Environment file already exists; no changes made"; exit 0; }
template="${REPO_ROOT}/infra/env/.env.example"
project_id="${FIREBASE_PROJECT_ID:-}"
if [[ -z "${project_id}" ]]; then read -r -p "FIREBASE_PROJECT_ID: " project_id; fi
[[ -n "${project_id}" && "${project_id}" != CHANGE_ME* ]] || die "FIREBASE_PROJECT_ID cannot be empty or a placeholder"
[[ "${project_id}" =~ ^[a-z0-9-]{6,30}$ ]] || die "FIREBASE_PROJECT_ID must be a valid Firebase project ID"
sed "s/^FIREBASE_PROJECT_ID=.*/FIREBASE_PROJECT_ID=${project_id}/" "${template}" > "${ENV_FILE}"
chmod 600 "${ENV_FILE}"
log info "Created infra/env/.env. Use Application Default Credentials or CI secret management for Firebase administration."
