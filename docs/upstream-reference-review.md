# Upstream reference review

Infra9CORE is self-contained. Generated projects do not require SarvaOps, and
SarvaOps is not an Infra9CORE dependency or a prescribed product stack.

SarvaOps is nevertheless a useful, evolving reference implementation for
native-Caddy and Docker operations. Before each Infra9CORE release, the release
maintainer should review its current `docs/AGENT_GUIDE.md` and consider only
general operational improvements.

## Review boundary

Adopt principles only when they are product-agnostic and compatible with the
Infra9CORE template contract. Examples include loopback-only service bindings,
port allocation, Caddy validation before reload, safe managed-file boundaries,
TLS, reverse-proxy, and Studio-access patterns.

Do not copy SarvaOps product behavior, branding, customer-panel flows, mail
stack behavior, provider integrations, credentials, or deployment assumptions.

## Release checklist

1. Record the SarvaOps commit or release reviewed and the review date in the
   Infra9CORE release notes or PR.
2. Inspect changes relevant to `docs/AGENT_GUIDE.md`, `docs/PORTS.md`,
   `infra/caddy/`, `infra/docker/`, and Caddy validation/reload scripts.
3. For each relevant change, record one outcome: adopted, intentionally not
   applicable, or deferred with an issue/ADR.
4. Update Infra9CORE documentation, template tests, and release notes for every
   adopted principle.

This is an explicit maintenance check, not an automated dependency or a claim
that every Infra9CORE project uses SarvaOps.
