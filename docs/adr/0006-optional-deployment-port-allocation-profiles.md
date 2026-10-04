# ADR 0006: Optional deployment port-allocation profiles

- Status: Accepted
- Date: 2026-10-04

## Context

Infra9CORE generates product-agnostic multi-stack monorepos. Some generated
projects run on directly managed hosts, while several products share a
SarvaOps-managed host with a registered host-port allocation scheme. A coding
agent can incorrectly copy an internal container listener, such as Studio's
`3000` or Kong's `8000`, into a host binding or Caddy upstream. On a shared
host that creates collisions and bypasses the allocation process.

## Decision

The deployment identity uses an explicit `portAllocation` profile:

- `direct` is the provider-neutral default. Operators deliberately select host
  ports for their deployment and document the result in the project runbook.
- `sarvaops` is an opt-in shared operational profile. It requires a registered
  project number and derives loopback web, database, Studio, API, and Kong host
  ports from the SarvaOps P-E-SS contract.

The configurator applies derived ports only for the selected `sarvaops` profile
and emits `infra/caddy/SarvaOps.import.caddy` only for that profile. Generated
agent guidance must distinguish host bindings from container listeners and
prohibit treating container ports as host-port defaults.

## Consequences

Infra9CORE remains usable without SarvaOps and does not make it a runtime
dependency. The SarvaOps profile is deliberately narrow: its formula, project
number registration, and importer artifact are operational compatibility
features for shared hosts. Changes to that contract require this ADR to be
superseded, profile tests, and coordinated operator migration guidance.
