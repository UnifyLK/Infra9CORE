# Release recovery runbook

## Before publication

Stop the release if the tag/version guard, package smoke test, or manual
release-candidate gate fails. Correct the issue on a new commit, create a new
version tag if the old tag is public, and repeat validation.

## After publication

npm versions are immutable. Do not attempt to overwrite a published version.
Publish a corrected patch release, update the changelog and GitHub release notes,
and deprecate the faulty version with a precise replacement version when needed.

## Credential incident

Revoke the affected npm token immediately, remove the matching GitHub secret,
audit GitHub release workflow runs, and rotate maintainers if required. Trusted
publishing is preferred because it does not retain a long-lived npm publish
credential.

## Generated infrastructure incident

Follow the generated project's backup/restore runbook. Do not use generator
updates as an incident rollback mechanism; restore from verified backups and
immutable image digests instead.
