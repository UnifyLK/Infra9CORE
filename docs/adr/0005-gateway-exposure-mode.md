# ADR 0005: Explicit gateway exposure mode

- Status: Accepted
- Date: 2026-10-04

## Context

Some products use browser clients that call Supabase through native Caddy. Others
use a backend-for-frontend boundary and require Kong, Studio, and the remaining
Supabase services to be unreachable from the public ingress. A single generated
Caddy template cannot safely infer which architecture a product selected.

## Decision

The first-run deployment record has a required `gatewayExposureMode`:

- `public-supabase` is the compatibility default. It renders the reviewed
  Supabase gateway paths and protected Studio host in Caddy and requires a
  `supabasePublicUrl`.
- `private-bff` renders only the application Caddy route. It does not ask for a
  public Supabase URL, sets the Docker-only `SUPABASE_INTERNAL_URL` to
  `http://kong:8000`, and never renders Kong or Studio Caddy routes.

`private-bff` uses the public application URL for Auth's external URL variables;
it does not invent a public Kong endpoint.

## Consequences

Products must choose their exposure model explicitly. Existing generated records
without the new field are interpreted as `public-supabase` by the configurator,
preserving their existing behavior until an operator deliberately selects the
private BFF model.
