# Release readiness audit — 2026-11-07

## Scope and snapshot

This is a point-in-time release-readiness audit for the next Infra9CORE npm
release. It records observed repository, registry, and GitHub-control state; it
does not itself approve a release.

- Intended next package version: `0.1.3`.
- npm `latest` at the time of review: `0.1.2`.
- Release-candidate branch: `feature/initial-developer-handoff`.
- The candidate has not been merged into `main`.
- The working tree was clean when the audit started.

## Evidence gathered

- `npm run validate` passed with Node.js 24: 28 tests passed, package-content
  verification passed, and `npm audit --omit=dev --audit-level=high` reported
  no vulnerabilities.
- The npm registry has no `@unifyit/create-infra9core@0.1.3`; publishing that
  version remains available once the release gates are complete.
- An attempted `tools/release-validate.sh` run did not produce a conclusive
  completion record. A successful completion from clean, merged `main` is
  required before release; an interrupted run is not release evidence.

## Required work before release

### 1. Finalize the release candidate

1. Review and merge `feature/initial-developer-handoff` into `main`.
2. Ensure local `main` exactly matches `origin/main`.
3. Keep the source tree clean through tagging and publication.

The candidate adds the prominent first-developer-handoff banner and allows
`make env` to securely generate Infra9CORE-owned local secrets when users leave
those prompts blank. It does not generate external-provider values such as SMTP
credentials.

### 2. Complete release metadata

1. Add a dated `0.1.3` section to `CHANGELOG.md` before tagging.
2. Include all changes since `v0.1.2`, including gateway exposure modes,
   provider-neutral/direct and SarvaOps port allocation, first-run
   configuration, secret separation/quoting fixes, the first-agent handoff, and
   secure local secret generation.
3. Keep `docs/release-execution-plan.md` current with the published and intended
   release versions while preserving historical details in changelog and GitHub
   release records.

### 3. Close GitHub and npm release-governance gaps

The active `protect-main` ruleset protects the default branch from deletion and
non-fast-forward updates. It does not currently require pull-request review or
status checks. The `npm-production` environment exists but currently has no
configured protection rules or required reviewers.

Before release, the release owner should:

1. Decide and configure the intended review/check policy for `main`.
2. Configure authorized reviewers/protection for `npm-production` where this
   suits the organization's release workflow.
3. Verify npm trusted publishing is configured for the `Publish package`
   workflow, which publishes with GitHub OIDC (`id-token: write`).
4. Verify npm organization ownership, mandatory 2FA, and release-maintainer
   authority without storing a token or password in the repository.

### 4. Produce final release evidence

From clean `main`, with Node.js 24 and all required host tools available:

```bash
make release-validate
```

This must finish successfully, including generated-repository Docker builds and
health checks, SvelteKit checks, Python lint/tests, Go tests, Rust checks, and
Flutter analyze/test/debug-APK checks. Record the successful run in the GitHub
release notes.

## Release procedure

After all required work and final validation are complete:

```bash
git switch main
git pull --ff-only origin main
make release-validate
make release CONFIRM_RELEASE=1
```

The release command verifies a clean, current `main`; confirms that `v0.1.3`
and npm version `0.1.3` do not already exist; validates; creates and pushes the
annotated tag; creates the GitHub Release; waits for npm publication; and
verifies the published version.

## Non-blocking cleanup

- Keep `feature/initial-developer-handoff` until it is merged. It is the
  release candidate, not a stale branch.
- After merge and publication, delete the merged feature branch according to
  the repository's normal branch-retention policy.
- Preserve the historical first-release details in the release-execution plan,
  but clearly distinguish them from current release instructions.
