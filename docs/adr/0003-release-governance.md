# ADR 0003: Explicit, provenance-backed release governance

## Status

Accepted

## Context

Infra9CORE is an npm generator with infrastructure consequences. Routine merges
must not automatically publish or run costly native validations.

## Decision

Release maintainers explicitly run `tools/release-validate.sh`, create an
immutable version tag, and publish through the protected GitHub release workflow.
The workflow validates tag/version/main ancestry. npm trusted publishing is the
target authentication method; the interactive `0.1.0` bootstrap release is an
exception documented in the release execution plan.

## Consequences

There are no automatic pull-request or merge workflows. Releases require human
approval and retain an auditable validation record. Future npm releases should
carry provenance from GitHub Actions.
