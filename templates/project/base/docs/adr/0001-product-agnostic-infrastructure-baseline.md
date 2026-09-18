# ADR 0001: Product-agnostic infrastructure baseline

- Status: Accepted
- Date: 2026-09-15

## Context

Teams need a reusable starting point for production full-stack products without
inheriting another product's name, business model, endpoints, domains, ports, or
secrets. Deployments target Ubuntu, use Docker for application dependencies and
self-hosted Supabase, and use Caddy installed directly on the host.

## Decision

Maintain a parameterized monorepo baseline with these boundaries:

- product code in `apps/`, reusable packages in `packages/`, and pure shared
  contracts or utilities in `shared/`;
- Docker Compose owns the private backend network and persistent data volumes;
- native Caddy owns public TLS termination, static files, and reverse proxying;
- environment-specific identity, endpoints, ports, and secrets remain untracked;
- database changes use ordered forward migrations plus explicit rollback files;
- every application table enables RLS and grants access only through reviewed
  policies;
- production images come from a private, access-controlled registry and are
  pinned, scanned, and signed;
- request IDs cross every HTTP, job, database, and external-service boundary and
  logs are structured JSON.

The baseline supplies infrastructure capabilities but no product-specific app,
schema, route, integration, or brand.

## Consequences

New products must decide their domain model and app topology before adding code.
Operators receive consistent lifecycle, migration, backup, and recovery commands.
The template remains reusable because configuration carries deployment identity.
