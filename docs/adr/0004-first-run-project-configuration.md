# ADR 0004: Deterministic first-run project configuration

- Status: Accepted
- Date: 2026-10-04

## Context

Infra9CORE creates a deliberately generic repository. A project cannot safely
run its infrastructure until its deployment identity, domains, public URLs,
native Caddy endpoints, and image registry are decided. Asking a coding agent to
infer and edit those values is neither repeatable nor safe for secrets.

## Decision

Every generated project includes a committed `.infra9core/config.json` that
contains only non-secret deployment identity. `make infra9core` is the
authoritative interactive renderer. It presents the values and managed-file plan
before writing the configuration record, `infra/env/.env.example`, a managed
`infra/caddy/Caddyfile`, and `docs/infra9core/FIRST_RUN_AGENT_PROMPT.md`.

The command never creates or changes `infra/env/.env`. It refuses to replace an
unmanaged Caddyfile unless the operator explicitly supplies the force flag.
The generated agent brief explains the architecture and remaining product work,
but it does not replace the command as the source of infrastructure truth.

## Consequences

Projects gain a repeatable onboarding and configuration record that can be
reviewed in version control. Operators must still provide real credentials
locally, make product-specific routing decisions, and validate the result before
deployment.
