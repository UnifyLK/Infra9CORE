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

can_generate() {
  case "$1" in
    POSTGRES_PASSWORD|JWT_SECRET|SUPABASE_ANON_KEY|SUPABASE_SERVICE_ROLE_KEY|DASHBOARD_PASSWORD) return 0 ;;
    *) return 1 ;;
  esac
}

random_secret() {
  node -e 'console.log(require("node:crypto").randomBytes(Number(process.argv[1])).toString("base64url"))' "$1"
}

signed_supabase_key() {
  node - "${answers[JWT_SECRET]}" "$1" <<'NODE'
const { createHmac } = require("node:crypto");
const [secret, role] = process.argv.slice(2);
const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
const now = Math.floor(Date.now() / 1000);
const header = encode({ alg: "HS256", typ: "JWT" });
const payload = encode({ role, iss: "supabase-demo", iat: now, exp: now + (10 * 365 * 24 * 60 * 60) });
const signature = createHmac("sha256", secret).update(`${header}.${payload}`).digest("base64url");
process.stdout.write(`${header}.${payload}.${signature}`);
NODE
}

generate_value() {
  case "$1" in
    POSTGRES_PASSWORD|DASHBOARD_PASSWORD) random_secret 32 ;;
    JWT_SECRET) random_secret 48 ;;
    SUPABASE_ANON_KEY) signed_supabase_key anon ;;
    SUPABASE_SERVICE_ROLE_KEY) signed_supabase_key service_role ;;
    *) return 1 ;;
  esac
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
    prompt="${variable}: "
    can_generate "${variable}" && prompt="${variable} (leave blank to generate securely): "
    if is_secret "${variable}"; then
      read -r -s -p "${prompt}" value
      printf '\n'
    else
      read -r -p "${prompt}" value
    fi
    if [[ -z "${value}" ]] && can_generate "${variable}"; then
      value="$(generate_value "${variable}")"
      log info "Generated a local value for ${variable}"
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
