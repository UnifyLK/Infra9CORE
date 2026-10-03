<p align="center">
  <img src="docs/assets/unify-logo-banner.svg" width="360" alt="Built with Unify IT Solutions">
</p>

# Infra9CORE

Infra9CORE is a public, product-agnostic generator for production-minded,
multi-stack monorepos. It gives developers and AI coding agents the same safe
starting structure, operational rules, and lifecycle commands without copying a
previous product's domain, branding, secrets, or business logic.

```bash
npx @unifyit/create-infra9core@latest my-product
```

It requires Node.js 24 (`>=24 <25`).

Built and maintained by [Unify IT Solutions](https://unify.lk), a product studio
helping teams move from idea to first customers. Infra9CORE is an open
foundation: projects generated from it remain entirely yours.

## What it creates

Every generated project has a stable ownership contract:

```text
apps/       deployable product applications
packages/   reusable application packages
shared/     pure domain contracts and utilities
infra/      Docker Compose, native Caddy, environment templates, scripts, backups
supabase/   product functions, migrations, rollbacks, and database assets
tools/      repository automation and validation
docs/       ADRs, API contracts, architecture, and runbooks
```

The root `Makefile` is the operational interface. The generated root `AGENTS.md`
is the permanent instruction set for humans and coding agents: it defines folder
ownership, Docker/Caddy boundaries, secret handling, RLS, migration, and release
rules.

The Supabase split is deliberate: root `supabase/` contains product-owned Edge
Functions, migrations, and rollbacks; `infra/supabase/volumes/` contains only
self-hosted Kong/API and database-bootstrap runtime internals.

## Why this structure exists

Real projects become difficult to operate when application code, database
history, Docker files, Caddy rules, scripts, and temporary agent-generated files
accumulate without ownership boundaries. Infra9CORE makes those boundaries part
of the generated contract so a new service, migration, Dockerfile, or document
has an obvious home.

Its production-shaped local model is:

```text
Internet → native Caddy on Ubuntu/WSL → 127.0.0.1 loopback ports → Docker services
```

Docker owns server runtime services and self-hosted Supabase. Native Caddy owns
public TLS, host routing, security headers, and reverse proxying. Supabase,
Studio, databases, workers, and debug ports are never public by default.

## Supported recipes

Choose any combination of SvelteKit, Flutter, Python, Go, Rust, Tauri, and a
custom empty application boundary. SvelteKit, Python, Go, and Rust receive
Dockerfiles and generated Compose services. Flutter and Tauri are client
applications, so their device, emulator, and desktop packaging work remains
platform-specific rather than a long-running server container.

## Create a project

Interactive use:

```bash
npx @unifyit/create-infra9core@latest my-product
```

Non-interactive use, suitable for an agent or scripted bootstrap:

```bash
npx @unifyit/create-infra9core@latest my-product \
  --apps sveltekit,flutter,python \
  --features ci \
  --package-manager pnpm \
  --organization-id com.example \
  --yes
```

Use `--dry-run` to preview generation, `--no-git` to skip Git initialization,
and `create-infra9core --help` for all options.

## First run: configure, then operate

From the generated project:

```bash
make infra9core  # configure tracked, non-secret deployment identity
make env         # create local-only secrets; prompts for required values
make doctor      # verify tools, secrets, and Compose safety rules
make config      # render and validate the Compose graph
make build       # build selected Docker application services
make up          # start Docker services
make migrate     # apply product-owned forward migrations
make ps          # inspect service status
```

`make infra9core` previews and then manages `.infra9core/config.json`,
`infra/env/.env.example`, `infra/caddy/Caddyfile`, and
`docs/infra9core/FIRST_RUN_AGENT_PROMPT.md`. It never reads, creates, or
overwrites `infra/env/.env`. `make env` creates that local secret file only when
absent, uses mode `0600`, and never replaces an existing file.

## Daily operations

```bash
make logs SERVICE=web
make restart
make backup
make restore BACKUP=/absolute/path/file.dump
make rollback MIGRATION=001_example.sql
make validate
```

`make clean` removes stopped containers and local build output but keeps Docker
volumes and data. It is not a database reset command.

## Agent guidance

After generation, an AI coding agent should read `AGENTS.md`,
`docs/infra9core/FIRST_RUN_AGENT_PROMPT.md`, the baseline ADR, OpenAPI contract,
and relevant runbooks before changing structure or operations. Agents must use
existing ownership boundaries, add ADRs for material decisions, keep domain logic
independent of infrastructure adapters, use append-only migrations with
rollback/forward recovery, enforce RLS, and avoid secrets in Git or logs.

## Production expectations

Infra9CORE is a foundation, not a complete product. It does not invent your
domain model, API contract, RLS policies, provider integrations, public routing,
DNS, credentials, or deployment approval. Before production, provide reviewed
domain/ADR decisions, API and test evidence, private-registry images pinned by
digest with scan/sign evidence, real secret management, restore rehearsal,
observability, and an operator-approved Caddy/DNS change.

## Maintainers and releases

The generator itself is tested with Node 24:

```bash
nvm use
npm run validate
bash tools/release-validate.sh
```

The release gate builds and health-checks generated Docker services, validates a
generated native Caddyfile, and runs the all-stack SvelteKit, Tauri, Python, Go,
Rust, Flutter, and Android checks. It does not deploy anything.

For a new version, update `package.json` and `CHANGELOG.md`, merge reviewed work
into `main`, then run:

```bash
make release CONFIRM_RELEASE=1
```

This guarded command validates, tags, creates the GitHub Release, waits for
trusted npm publishing, and confirms the published version. It refuses dirty,
stale, non-`main`, already-tagged, or already-published releases.

Before every release, complete the advisory
[SarvaOps upstream reference review](docs/upstream-reference-review.md). SarvaOps
is an evolving operational reference, never an Infra9CORE dependency.

## Project policies

- [Support policy](docs/support-policy.md)
- [Security policy](SECURITY.md)
- [Contribution guide](CONTRIBUTING.md)
- [Changelog](CHANGELOG.md)
- [Long-term stability roadmap](docs/long-term-stability-roadmap.md)
