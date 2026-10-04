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

is_secret() {
  [[ "$1" =~ (PASSWORD|SECRET|KEY|PASS)$ ]]
}

validate_value() {
  local key="$1"
  local value="$2"
  [[ -n "${value}" ]] || die "${key} cannot be empty"
  [[ "${value}" != CHANGE_ME* ]] || die "${key} must be a real value, not a placeholder"
  [[ "${value}" != *$'\n'* && "${value}" != *$'\r'* ]] || die "${key} must be a single line"
  [[ "${value}" != *[[:space:]\"\'\`\\\$\|\#]* ]] || \
    die "${key} contains characters unsafe for the local environment-file format"
}

declare -a required_variables=()
declare -A answers=()
while IFS= read -r variable; do
  required_variables+=("${variable}")
done < <(awk -F= '/^[A-Z][A-Z0-9_]*=CHANGE_ME/ { print $1 }' "${template}")

(( ${#required_variables[@]} > 0 )) || die "Environment template has no required values"
log info "Collecting required local values. Secret input is hidden. This never overwrites an existing .env."
for variable in "${required_variables[@]}"; do
  while true; do
    if is_secret "${variable}"; then
      read -r -s -p "${variable}: " value
      printf '\n'
    else
      read -r -p "${variable}: " value
    fi
    if validate_value "${variable}" "${value}"; then
      answers["${variable}"]="${value}"
      break
    fi
  done
done

[[ "${answers[JWT_SECRET]}" != "${answers[POSTGRES_PASSWORD]}" ]] || \
  die "JWT_SECRET must differ from POSTGRES_PASSWORD"

cp -- "${template}" "${target}"
for variable in "${required_variables[@]}"; do
  sed -i "s|^${variable}=.*$|${variable}=${answers[${variable}]}|" "${target}"
done
chmod 600 "${target}"
log info "Created infra/env/.env with all required values. Run make doctor before startup."
