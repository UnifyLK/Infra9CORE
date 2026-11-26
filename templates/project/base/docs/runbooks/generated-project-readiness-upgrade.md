# Generated-project readiness upgrade

Infra9CORE does not modify existing generated repositories automatically. Run
`create-infra9core update . --check` first; it is advisory and read-only.

Legacy Firebase projects retain their existing Docker behavior. To keep it,
record `containerization: docker-compose` in future regenerated manifests and
retain reviewed container files. To move to native Firebase, create a fresh
native project as a reference, manually preserve `firebase/`, `.infra9core/apps`,
application code, and lockfiles, then remove Docker/Caddy only after confirming
no application deployment target depends on them.

For JavaScript workspaces, keep exactly one root lockfile matching the declared
`packageManager`: `package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`, or
`bun.lock`. Generate it deliberately with the selected manager, review it, and
commit it before enabling the upgraded CI workflow or workspace-aware Docker
build.

For a Firebase and pnpm SvelteKit monorepo: use Node 24, run `corepack enable`,
then `pnpm install`; review and commit `pnpm-lock.yaml`; change the SvelteKit
service build context to the repository root and pass `APP_PATH=apps/web` and
`PACKAGE_MANAGER=pnpm`; copy the CI helper and workflow; then run
`pnpm install --frozen-lockfile`, application lint/typecheck/build scripts, and
`make validate`.

For production containers, choose a private registry and signing identity,
mirror approved images by digest, complete `infra/images/manifest.json` with
image, rollback digest, SBOM, scan, and signature evidence, configure Cosign
trust variables in the uncommitted environment file, run `scan`, `sbom`, and
`sign` steps in the promotion pipeline, and require `tools/container-policy.sh verify` before
`docker compose up`. Development mode deliberately does not require credentials.
