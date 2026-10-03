# Engineering agent contract

This is a long-lived, production-oriented monorepo. Follow this file before
creating, moving, or deleting any file or directory.

## Repository ownership contract

- `apps/` contains deployable product applications only. Each application owns
  its runtime source, tests, and Dockerfile.
- `packages/` contains reusable, versioned application packages.
- `shared/` contains pure shared domain contracts and utilities. It must not
  depend on Supabase, Docker, HTTP clients, or other infrastructure adapters.
- `infra/` owns Docker Compose, native Caddy configuration, environment
  templates, image manifests, lifecycle scripts, backups, and runtime concerns.
- `supabase/` owns product migrations, rollback files, Edge Functions, and
  database assets. Migrations are append-only and every application table needs
  explicit RLS enablement and reviewed policies.
- `tools/` contains repository automation and validation tooling.
- `docs/` contains ADRs, API contracts, architecture, operating runbooks, and
  durable engineering guidance.
- The root `Makefile` is the stable human and agent operational interface.

Do not add root directories, root scripts, stray Compose files, unowned Docker
files, database migrations, or configuration files for convenience. First use
an existing ownership boundary. An exception requires an ADR and documentation
update before implementation.

## Supabase placement is a strict split

- `supabase/functions/`, `supabase/migrations/`, and `supabase/rollbacks/` are
  product-owned application assets. Put Edge Functions, forward SQL migrations,
  and matching rollback/recovery assets there only.
- `infra/supabase/volumes/` is runtime-owned self-hosted Supabase internals.
  It contains Kong/API configuration, database bootstrap files, and Compose
  volume-mounted runtime assets only.
- Never place product migrations, Edge Functions, domain SQL, or RLS policies
  under `infra/supabase/`. Never place Kong templates, database-init internals,
  or Docker runtime volume assets under root `supabase/`.

## Runtime and operations

- Docker owns server runtime services. Bind published container ports to
  `127.0.0.1`; native Caddy on Ubuntu/WSL is the only public ingress.
- `private-bff` gateway mode permits native Caddy to expose only application
  routes; Kong, Supabase services, and Studio stay private. `public-supabase`
  is the explicit exception for reviewed Supabase gateway routes. Validate Caddy
  before any operator-approved reload.
- Use `make infra9core`, `make env`, `make doctor`, `make build`, `make up`,
  `make migrate`, and `make validate` rather than ad-hoc lifecycle commands.
- Never commit `.env` files, credentials, JWTs, password hashes, provider tokens,
  or private registry credentials. `infra/env/.env` is local-only.
- Production images come from the approved private registry, are pinned by
  digest, scanned, and signed.

## Delivery rules

1. Define the domain model and record material decisions as append-only ADRs.
2. Define API contracts before adapters. Keep domain logic independent of
   infrastructure implementations.
3. Pair every forward migration with a rollback or documented forward recovery.
4. Add structured traceable logging and proportional unit, integration, and e2e
   coverage before calling work complete.
5. Preserve unrelated work. Do not deploy, reload native Caddy, change DNS,
   publish images, or delete volumes/data without explicit operator approval.
