# ADR 0007: Product-agnostic capability boundaries

## Status

Accepted

## Context

Infra9CORE generates reusable infrastructure foundations. Earlier Firebase
application registrations could claim Firestore databases, Functions codebases,
and Hosting targets. That coupled a generic application record to consumer
resource topology.

## Decision

Application registrations are technology-neutral metadata: identifier, path,
recipe, capabilities, and workspace dependencies. They do not own backend
resources. Subsequent application creation is scaffolding only.

Firebase remains a first-class backend capability. Native Firebase projects use
the Firebase CLI, deny-by-default rules, index boundaries, and the Emulator
Suite without Docker by default. Named Firestore databases use native
project-owned Firebase configuration and documentation; they are never derived
from application registrations or created by default. Functions remains an
ownership/configuration boundary: a consuming project explicitly adds a valid
runtime, dependencies, entry point, and triggers before adding it to
`firebase.json`.

Existing registry Firebase mappings are deprecated metadata. Doctor keeps such
projects readable and upgrade diagnostics are read-only. No generated project,
remote resource, or legacy configuration is rewritten automatically.

This supersedes the application-to-resource ownership aspects of the Firebase
multi-application work and clarifies ADR 0002's manifest ownership boundary.
The revised acceptance contract verifies generic generator contracts, selected
backend capabilities, and generated-project smoke tests separately from
consumer-product topology and integration tests.

## Consequences

Consumer products own database topology, authorization, resource relationships,
Functions runtimes, Hosting targets, and deployment selection. They extend
`firebase/firebase.json` and related native Firebase files under normal source
control and validate those additions with product integration tests.
