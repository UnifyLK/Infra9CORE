#!/usr/bin/env bash
set -Eeuo pipefail
source "$(dirname "$0")/lib.sh"

readonly migrations_dir="${REPO_ROOT}/supabase/migrations"
compose exec -T db psql --username postgres --dbname postgres <<'SQL'
create schema if not exists infrastructure;
create table if not exists infrastructure.schema_migrations (
  filename text primary key,
  applied_at timestamptz not null default now()
);
SQL

while IFS= read -r migration; do
  filename="$(basename "${migration}")"
  applied="$(compose exec -T db psql --username postgres --dbname postgres --tuples-only --no-align \
    --variable="filename=${filename}" \
    --command="select exists(select 1 from infrastructure.schema_migrations where filename = :'filename');")"
  [[ "${applied}" == "t" ]] && continue
  log info "Applying migration ${filename}"
  compose exec -T db psql --username postgres --dbname postgres --set=ON_ERROR_STOP=1 < "${migration}"
  compose exec -T db psql --username postgres --dbname postgres --set=ON_ERROR_STOP=1 \
    --variable="filename=${filename}" \
    --command="insert into infrastructure.schema_migrations(filename) values (:'filename');"
done < <(find "${migrations_dir}" -maxdepth 1 -type f -name '*.sql' | sort)

log info "Database migrations are current"
