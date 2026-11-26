#!/usr/bin/env bash
set -Eeuo pipefail
[[ "$(node --version)" =~ ^v24\. ]] || { echo "Node.js 24.x is required" >&2; exit 1; }
node --check tools/infra9core-configure.mjs
node --check tools/infra9core-app.mjs
for file in firebase/firestore.rules firebase/storage.rules firebase/firebase.json; do [[ -s "$file" ]] || exit 1; done
node tools/infra9core-app.mjs validate
if grep -RInE --exclude-dir='.git' --exclude='.env.example' --exclude='validate.sh' '(eyJ[A-Za-z0-9_-]{20,}|sk_(live|test)_[A-Za-z0-9]+|BEGIN PRIVATE KEY)' .; then exit 1; fi
printf 'Static native Firebase validation passed.\n'
