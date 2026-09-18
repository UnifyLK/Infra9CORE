#!/usr/bin/env sh
set -eu
sed \
  -e "s|__ANON_KEY__|${SUPABASE_ANON_KEY}|g" \
  -e "s|__SERVICE_ROLE_KEY__|${SUPABASE_SERVICE_ROLE_KEY}|g" \
  -e "s|__DASHBOARD_USERNAME__|${DASHBOARD_USERNAME}|g" \
  -e "s|__DASHBOARD_PASSWORD__|${DASHBOARD_PASSWORD}|g" \
  /home/kong/template.yml > /home/kong/kong.yml
exec /docker-entrypoint.sh kong docker-start
