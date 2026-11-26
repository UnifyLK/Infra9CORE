#!/usr/bin/env bash
set -Eeuo pipefail
command -v node >/dev/null || { echo 'Node.js 24 is required' >&2; exit 1; }
[[ "$(node --version)" =~ ^v24\. ]] || { echo "Node.js 24.x is required; found $(node --version)" >&2; exit 1; }
command -v firebase >/dev/null || { echo 'Firebase CLI is required' >&2; exit 1; }
[[ -f infra/env/.env ]] || { echo 'Missing infra/env/.env; run make env' >&2; exit 1; }
set -a; source infra/env/.env; set +a
[[ -n "${FIREBASE_PROJECT_ID:-}" && "${FIREBASE_PROJECT_ID}" != CHANGE_ME* ]] || { echo 'FIREBASE_PROJECT_ID is required' >&2; exit 1; }
printf 'Firebase native configuration passed validation.\n'
