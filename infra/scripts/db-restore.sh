#!/usr/bin/env bash
set -Eeuo pipefail
source "$(dirname "$0")/lib.sh"

backup_file="${1:-}"
[[ -n "${backup_file}" ]] || die "Set BACKUP to an absolute dump path"
[[ "${backup_file}" == /* ]] || die "BACKUP must be an absolute path"
[[ -f "${backup_file}" ]] || die "Backup file does not exist"
[[ "${CONFIRM_RESTORE:-}" == "yes" ]] || die "Restore is destructive; rerun with CONFIRM_RESTORE=yes"

if [[ -f "${backup_file}.sha256" ]]; then
  sha256sum --check "${backup_file}.sha256"
fi
log warn "Restoring ${backup_file} into the configured database"
compose exec -T db pg_restore --username postgres --dbname postgres --clean --if-exists --no-owner < "${backup_file}"
log info "Restore completed"
