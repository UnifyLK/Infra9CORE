# ADR 0004: Generated-project readiness controls

## Status

Accepted

## Context

Generated projects need deterministic JavaScript dependency resolution,
workspace-aware SvelteKit builds, enforceable Node support, and production
container evidence without forcing network access or credentials during initial
generation.

## Decision

Generation remains offline-capable and does not create lockfiles unless the
operator explicitly requests installation. A selected JavaScript workspace has
one authoritative root lockfile; CI and Docker use manager-specific frozen or
immutable installation and fail with remediation when it is absent or conflicts.

Generated doctor and validation require Node 24. The optional CI overlay installs
Node 24, invokes a generic helper for selected-manager installation, and runs
declared application quality scripts.

Production container policy is configuration-driven. It requires a private
registry, digest-pinned approved images and SvelteKit Node base image, SBOM and
scan evidence, rollback digests, and Cosign identity/issuer verification before
container startup. Development does not require signing credentials. Firebase
managed services are outside this policy; Docker-owned Firebase application
services remain in scope.

Upgrade diagnostics are read-only. Existing projects receive advisory migration
guidance; no automatic migration engine is introduced.

## Consequences

First CI runs for a generated JavaScript project require a reviewed committed
lockfile. Production operators must provide their own registry, trust policy,
scanner, SBOM storage, and signing workflow. These are deliberately not
organization-specific defaults.
