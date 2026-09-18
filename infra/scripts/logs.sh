#!/usr/bin/env bash
set -Eeuo pipefail
source "$(dirname "$0")/lib.sh"

service="${1:-}"
if [[ -n "${service}" ]]; then
  compose logs --follow --tail 200 "${service}"
else
  compose logs --follow --tail 200
fi
