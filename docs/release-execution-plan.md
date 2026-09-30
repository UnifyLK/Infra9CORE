# Infra9CORE npm release execution plan

## Objective

Publish the first public, provenance-attested release of
`@unifyit/create-infra9core` without exposing credentials and with a reproducible
rollback path.

## Release scope

- Package: `@unifyit/create-infra9core`
- Initial version: `0.1.0`
- Registry visibility: public
- Runtime requirement: Node.js 24 or newer
- Release source: protected `main` branch of `UnifyLK/Infra9CORE`
- Publishing path: the `Publish package` GitHub Actions workflow

## Current control status

| Control | Current state | Required action |
| --- | --- | --- |
| npm publisher identity | Not authenticated on the release workstation | Confirm `unifyit` organization ownership and configure CI publishing authority. |
| npm package name | Unclaimed | Reserve it by publishing the validated first release. |
| GitHub release environment | `npm-production` does not exist | Create it, require authorized reviewers, and scope publishing credentials to it. |
| `main` protection | Not configured | Restrict direct pushes and tag/release creation; release validation is explicit, not per-merge. |
| Release source integrity | Workflow validates tag/version and ancestry | Keep tag-driven releases only; do not publish arbitrary commits. |

## Phase 1: Confirm the release candidate

1. Verify `main` contains the intended release commit and has no unrelated
   uncommitted changes.
2. Run `npm run validate` with Node 24. This runs generator tests and verifies
   the exact npm tarball file list.
3. Generate a fresh project using every supported recipe and verify its
   required root contract: `apps`, `docs`, `infra`, `packages`, `shared`,
   `supabase`, `tools`, `.nvmrc`, `LICENSE`, `Makefile`, `README.md`,
   `.gitignore`, `.gitattributes`, and `.editorconfig`.
4. Run recipe-specific checks when their SDK is available: Svelte typecheck,
   Flutter analyze/test, Python Ruff/pytest, Go test, Rust check, and Tauri
   typecheck/lint/test.
5. Confirm `npm pack --dry-run` includes only the executable, source, templates,
   license, and package README; it must not include build outputs, credentials,
   or local audit artifacts.
6. Scan the generated project for unresolved `{{TOKEN}}` values and verify the
   copied Tauri icon is a valid binary PNG. This guards the text renderer from
   corrupting binary template assets.

Exit criterion: all checks pass and no generator template token remains in the
generated project.

The reproducible manual gate is `bash tools/release-validate.sh`. It is never
triggered by a pull request or merge; run it before creating a release tag.

## Phase 1.1: Close automation coverage gaps

1. Extend Generator CI with an all-recipe generation smoke test, including a
   token scan and binary icon validation.
2. Add a release-candidate native SDK job for Flutter creation and analyzer/test.
   Unit tests deliberately avoid SDK scaffolding, so they do not prove native
   runner generation.
3. Add recipe tests where a template currently only compiles: a Svelte test
   script, health-route tests for Go and Rust, and a meaningful Tauri test.
4. Keep full native compilation out of pull-request and merge automation. Run it
   as an explicit release-candidate gate before creating a release tag.

Exit criterion: the release candidate has a repeatable all-stack validation
record, not only generator unit-test evidence.

## Phase 2: Establish npm publishing authority

1. Confirm the `unifyit` npm organization owns or can create
   `@unifyit/create-infra9core`.
2. Configure branch protection for `main`: restrict direct pushes and limit
   tag/release creation to release maintainers. Do not require a workflow check
   for ordinary pull requests or merges; release validation is performed
   explicitly before tagging.
3. In the npm package settings, configure GitHub Actions trusted publishing for
   `UnifyLK/Infra9CORE` and the `Publish package` workflow. This is the preferred
   option because it uses short-lived identity tokens.
4. If trusted publishing cannot be configured before the first package exists,
   create an automation token with publish-only scope and store it as
   `NPM_TOKEN` in the protected GitHub environment `npm-production`.
5. Confirm the npm organization owner, required two-factor authentication, token
   expiry/rotation policy, and release approvers before granting publish access.
6. Restrict that environment to authorized release approvers. Do not store an
   npm password, personal token, or token value in the repository.

Exit criterion: the GitHub environment is protected and one of the two
authentication methods is configured.

## Phase 3: Publish

1. Create and push an annotated tag matching `package.json`, initially `v0.1.0`,
   from the protected `main` branch.
2. Create a GitHub release from that tag. The workflow explicitly checks out the
   tag, verifies it matches `package.json`, confirms it is reachable from `main`,
   installs dependencies with Node 24, reruns validation, and executes
   `npm publish --access public --provenance`.
3. Review the workflow log and verify that npm reports the expected package name,
   version, public access, and provenance.
4. From a clean temporary directory, run:

   ```bash
   npx @unifyit/create-infra9core@0.1.0 verify-infra9core --yes --no-git
   ```

5. Verify the generated repository structure and run its documented validation
   command.

Exit criterion: the public npx smoke test succeeds, `npm view` reports the
expected version and provenance, and the release workflow is green.

## Phase 4: Post-release operations

1. Add the npm package URL and first-release notes to the GitHub release.
2. Enable npm package notifications and review installation/error reports.
3. Use semantic versioning for all subsequent releases; never overwrite or
   republish `0.1.0`.
4. Keep a short release note describing changed templates, supported stacks,
   Node requirement, and any migration action.

## Failure handling

- Before npm publication: delete or correct the GitHub draft/release tag. If a
  public tag must be replaced, create a new versioned tag rather than moving it.
- After npm publication: do not overwrite the release. Publish a patched version
  and deprecate the faulty version with a clear replacement message if needed.
- Workflow credential failure: correct the protected environment configuration;
  do not fall back to a developer personal token in shell history.
- Provenance failure: resolve the GitHub trusted-publishing or token configuration
  and publish a new version only after validation is green.
