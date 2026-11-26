#!/usr/bin/env bash
set -Eeuo pipefail

root="$(cd -- "$(dirname -- "$0")/.." && pwd)"
cd "$root"
mode="${1:-validate}"
env_file="${INFRA9CORE_ENV_FILE:-infra/env/.env}"
die() { printf 'Container policy failed: %s\n' "$*" >&2; exit 1; }
[[ -f "$env_file" ]] || die "missing $env_file"
set -a; source "$env_file"; set +a
[[ "${DEPLOY_ENV:-development}" == "production" ]] || { printf 'Container policy: development mode; production attestation is not required.\n'; exit 0; }
manifest="${IMAGE_APPROVAL_MANIFEST:-infra/images/manifest.json}"
[[ "${IMAGE_REGISTRY:-docker.io}" != "docker.io" ]] || die "production containers must use a private IMAGE_REGISTRY"
for variable in CONTAINER_SIGNING_IDENTITY COSIGN_CERTIFICATE_IDENTITY_REGEXP COSIGN_OIDC_ISSUER VULNERABILITY_SEVERITY_THRESHOLD; do
  [[ -n "${!variable:-}" ]] || die "${variable} is required in production"
done
[[ -f "$manifest" ]] || die "production image approval manifest is missing: $manifest"

node - "$manifest" <<'NODE'
const fs = require("fs");
const manifest = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const required = ["image", "digest", "rollbackDigest", "sbom", "scan", "signature"];
if (!Array.isArray(manifest.images) || manifest.images.length === 0) throw new Error("manifest must contain approved images");
for (const image of manifest.images) {
  for (const field of required) if (typeof image[field] !== "string" || !image[field] || image[field].includes("CHANGE_ME")) throw new Error(`image approval is missing ${field}`);
  if (!image.digest.startsWith("sha256:") || !image.rollbackDigest.startsWith("sha256:")) throw new Error("image and rollback digests must be sha256 values");
}
NODE
if node -e 'const m=require("./.infra9core/manifest.json"); process.exit(m.project.apps.includes("sveltekit") ? 0 : 1)'; then
  [[ "${NODE_IMAGE:-}" == *@sha256:* ]] || die "NODE_IMAGE must be digest-pinned for production SvelteKit builds"
fi

images() { node - "$manifest" <<'NODE'
const fs = require("fs"); for (const x of JSON.parse(fs.readFileSync(process.argv[2], "utf8")).images) console.log(`${x.image}\t${x.digest}`);
NODE
}
case "$mode" in
  validate) printf 'Container policy validation passed.\n' ;;
  verify)
    command -v cosign >/dev/null 2>&1 || die "cosign is required for production verification"
    while IFS=$'\t' read -r image digest; do cosign verify --certificate-identity-regexp "$COSIGN_CERTIFICATE_IDENTITY_REGEXP" --certificate-oidc-issuer "$COSIGN_OIDC_ISSUER" "$image@$digest" >/dev/null; done < <(images)
    printf 'Container signature verification passed.\n' ;;
  scan)
    command -v trivy >/dev/null 2>&1 || die "trivy is required for vulnerability scanning"
    while IFS=$'\t' read -r image digest; do trivy image --exit-code 1 --severity "$VULNERABILITY_SEVERITY_THRESHOLD" "$image@$digest"; done < <(images) ;;
  sbom)
    command -v syft >/dev/null 2>&1 || die "syft is required for SBOM generation"
    mkdir -p artifacts/sbom
    while IFS=$'\t' read -r image digest; do syft "$image@$digest" -o cyclonedx-json > "artifacts/sbom/$(echo "$image" | tr '/:' '__').cdx.json"; done < <(images) ;;
  sign)
    command -v cosign >/dev/null 2>&1 || die "cosign is required for production signing"
    while IFS=$'\t' read -r image digest; do cosign sign --yes "$image@$digest"; done < <(images) ;;
  *) die "use: container-policy.sh <validate|verify|scan|sbom|sign>" ;;
esac
