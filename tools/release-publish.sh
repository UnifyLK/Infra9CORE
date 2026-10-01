#!/usr/bin/env bash
set -Eeuo pipefail

repo_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
cd "$repo_root"

die() {
  printf 'Release aborted: %s\n' "$*" >&2
  exit 1
}

for command_name in git gh npm node; do
  command -v "$command_name" >/dev/null 2>&1 || die "required command is unavailable: $command_name"
done

[[ "${CONFIRM_RELEASE:-}" == "1" ]] || die "run: make release CONFIRM_RELEASE=1"
[[ "$(git branch --show-current)" == "main" ]] || die "releases must be run from local main"
[[ -z "$(git status --porcelain)" ]] || die "working tree is not clean"

git fetch origin main --tags
[[ "$(git rev-parse HEAD)" == "$(git rev-parse origin/main)" ]] || \
  die "local main must exactly match origin/main"

version=$(node -p "require('./package.json').version")
[[ "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+([-.][0-9A-Za-z.-]+)?$ ]] || \
  die "package.json has an invalid semantic version: $version"
tag="v$version"
package_name=$(node -p "require('./package.json').name")
repository=$(gh repo view --json nameWithOwner --jq .nameWithOwner)

git check-ref-format "refs/tags/$tag" || die "invalid release tag: $tag"
git rev-parse --verify --quiet "refs/tags/$tag" >/dev/null && die "tag already exists locally: $tag"
git ls-remote --exit-code --tags origin "refs/tags/$tag" >/dev/null 2>&1 && \
  die "tag already exists on origin: $tag"

# Verify registry access first. A failed lookup for the target version is expected
# and proves it has not already been published; a lookup for the package itself
# must succeed so a transient registry outage cannot be mistaken for availability.
npm view "$package_name" version >/dev/null || die "npm registry lookup failed"
npm view "$package_name@$version" version >/dev/null 2>&1 && \
  die "npm version already exists: $package_name@$version"

printf 'Preparing %s from %s at %s\n' "$tag" "$repository" "$(git rev-parse --short HEAD)"
bash tools/release-validate.sh

git tag -a "$tag" -m "Infra9CORE $tag"
git push origin "$tag"
gh release create "$tag" --repo "$repository" --title "Infra9CORE $tag" --generate-notes --verify-tag

run_id=""
for _attempt in $(seq 1 24); do
  run_id=$(gh run list --repo "$repository" --workflow publish.yml --event release \
    --branch "$tag" --limit 1 --json databaseId --jq '.[0].databaseId')
  [[ -n "$run_id" && "$run_id" != "null" ]] && break
  sleep 5
done
[[ -n "$run_id" && "$run_id" != "null" ]] || die "release was created but its publish workflow was not found"

gh run watch "$run_id" --repo "$repository" --exit-status

for _attempt in $(seq 1 24); do
  published_version=$(npm view "$package_name@$version" version 2>/dev/null || true)
  [[ "$published_version" == "$version" ]] && break
  sleep 5
done
[[ "${published_version:-}" == "$version" ]] || \
  die "GitHub publish succeeded but npm has not exposed $package_name@$version yet"

printf 'Release complete: %s@%s\n' "$package_name" "$version"
