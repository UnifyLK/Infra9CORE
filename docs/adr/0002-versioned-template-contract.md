# ADR 0002: Versioned template contract

## Status

Accepted

## Context

Generated repositories outlive the generator release that created them. Without
an explicit identity record, maintainers cannot safely determine which generator
contract or selected recipes a project started with.

## Decision

Every generated repository contains `.infra9core/manifest.json`. It records the
generator package/version, template contract version, selected recipes/overlays,
package manager, and non-secret identity metadata. `doctor` and `update --check`
are read-only. No first-version updater writes generated-project files.

## Consequences

The manifest enables compatibility diagnostics without claiming ownership of
application code, secrets, lockfiles, runtime volumes, or backups. Future write
operations require per-file ownership/hashes and a separate ADR.
