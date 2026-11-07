# Infra9CORE npm release execution plan

## Purpose

This is the current procedure for publishing a reviewed, provenance-attested
version of `@unifyit/create-infra9core`. It applies to every release after the
initial public publication; historical bootstrap details belong in the changelog
and GitHub release history.

## Release contract

- Source: reviewed, clean `main` in `UnifyLK/Infra9CORE`.
- Runtime: Node.js 24.x only (`>=24 <25`).
- Current published version: `0.1.2`.
- Intended next version: `0.1.3`.
- Publication: annotated Git tag, GitHub Release, and npm publication with
  provenance through the `Publish package` workflow.
- Authority: the release owner reviews release evidence and explicitly approves
  merge and publication.

## Prepare the release candidate

1. Keep implementation, tests, changelog, public release documentation, and
   generated-project contract changes in the reviewed release candidate.
2. Add a dated changelog section matching the package version and summarize
   generated-project compatibility impact and any required operator action.
3. Confirm package metadata, lockfile metadata, and intended tag agree on the
   same semantic version.
4. Review public documentation for credentials, private hostnames, local paths,
   temporary directories, or unpublished operational details.
5. Merge the approved candidate into `main`, then fast-forward local `main` to
   `origin/main`.

## Validate from clean main

Run the full release gate only from a clean, current `main` checkout:

```bash
make release-validate
```

The gate installs package metadata, runs generator and package-content checks,
audits production dependencies, generates every supported recipe, scans for
unresolved template tokens, validates Compose/Caddy configuration, builds and
health-checks Docker services, and runs SvelteKit, Python, Go, Rust, and Flutter
checks. A stopped or interrupted run is not release evidence.

Record the successful command, commit SHA, Node.js version, and any material
tool versions in the GitHub Release notes.

## Release authorization and publication

Before publication, the release owner verifies npm organization ownership,
two-factor requirements, release-maintainer authority, and trusted publishing
for the GitHub workflow. Do not store npm passwords, personal tokens, or secret
values in the repository or shell history.

After review and explicit authorization:

```bash
make release CONFIRM_RELEASE=1
```

The guarded command refuses a dirty or stale checkout, an existing tag, or an
existing npm version. It validates again, creates and pushes the annotated tag,
creates the GitHub Release, waits for the publish workflow, and confirms npm
registry availability.

## Post-publication evidence

1. Verify the GitHub Release, `v0.1.3` tag, npm version, and npm provenance.
2. From a clean temporary directory, run an `npx` generation smoke test for the
   published version and execute the generated project's documented first-run
   commands.
3. Update the dated release-readiness audit with final validation, merge, tag,
   publication, and smoke-test evidence.
4. Delete merged release-candidate branches according to the repository's
   retention policy.

## Recovery

npm versions and public tags are immutable. For a faulty published version,
publish a corrected patch release, document the replacement in GitHub and npm,
and follow the [release recovery runbook](runbooks/release-recovery.md).
