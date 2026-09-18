#!/usr/bin/env bash
set -Eeuo pipefail
source "$(dirname "$0")/lib.sh"

backup_dir="${REPO_ROOT}/infra/backups"
mkdir -p "${backup_dir}"
backup_file="${backup_dir}/postgres-$(date --utc +'%Y%m%dT%H%M%SZ').dump"
umask 077
compose exec -T db pg_dump --username postgres --dbname postgres --format=custom > "${backup_file}"
[[ -s "${backup_file}" ]] || die "Backup file is empty"
sha256sum "${backup_file}" > "${backup_file}.sha256"
log info "Backup created at ${backup_file}"
