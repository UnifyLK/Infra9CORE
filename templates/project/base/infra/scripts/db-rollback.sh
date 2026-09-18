#!/usr/bin/env bash
set -Eeuo pipefail
source "$(dirname "$0")/lib.sh"

filename="${1:-}"
[[ "${filename}" =~ ^[0-9]+_[A-Za-z0-9_-]+\.sql$ ]] || die "Set MIGRATION to a migration filename such as 001_example.sql"
rollback="${REPO_ROOT}/supabase/rollbacks/${filename}"
[[ -f "${rollback}" ]] || die "Rollback file not found: supabase/rollbacks/${filename}"

log warn "Applying rollback ${filename}"
compose exec -T db psql --username postgres --dbname postgres --set=ON_ERROR_STOP=1 < "${rollback}"
compose exec -T db psql --username postgres --dbname postgres --set=ON_ERROR_STOP=1 \
  --variable="filename=${filename}" \
  --command="delete from infrastructure.schema_migrations where filename = :'filename';"
log info "Rollback completed"
