# Changelog

All notable changes to Infra9CORE are documented here. The project follows
[Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.1.3] - 2026-11-07

### Added

- Added explicit `private-bff` and `public-supabase` gateway exposure modes,
  with generated Caddy and environment configuration that keeps Kong and Studio
  private in BFF mode.
- Added provider-neutral direct host-port allocation and the opt-in SarvaOps
  allocation profile, including a versioned port contract and reviewed SarvaOps
  Caddy import artifact.
- Added a prominent first-developer handoff prompt to generated-project output
  and README guidance.
- Added guarded Makefile commands for the main-centric GitHub workflow:
  creating a feature branch, saving/pushing work, synchronizing with `main`,
  creating or checking pull requests, and confirmation-gated PR merges.

### Fixed

- `make env` can securely generate the local database password, JWT secret,
  Supabase anon/service keys, and dashboard password when the corresponding
  prompts are left blank; external-provider values remain operator supplied.
- Reject identical database and JWT secrets, quote shell-sourced Studio values,
  and normalize generated Caddyfile output.

## [0.1.2] - 2026-10-04

### Added

- Expanded public documentation covering the generator's ownership model,
  first-run flow, daily operations, agent guidance, production expectations,
  and release lifecycle; added Unify IT Solutions attribution to the package
  documentation and metadata without branding generated projects.

- Generated projects now include a non-secret first-run configuration record,
  `make infra9core`, and a coding-agent first-run brief. The guided command
  previews and renders managed environment-template and native-Caddy files
  without creating or overwriting local secrets.
- SvelteKit, Python, Go, and Rust recipes now include Dockerfiles and generated
  application-service Compose overlays. Their ports bind only to loopback for
  native Caddy on Ubuntu/WSL.
- Generated projects now include a root `AGENTS.md` defining the monorepo
  ownership contract and safe operational boundaries for coding agents.
- The generated agent contract now explicitly separates product-owned
  `supabase/` functions/migrations/rollbacks from `infra/supabase/` runtime
  volumes and Kong/database-bootstrap internals.
- `create-infra9core doctor` now enforces that Supabase split and flags the
  prohibited `supabase/runtime/` location.

## [0.1.1] - 2026-10-01

### Fixed

- Declare the selected npm, pnpm, Yarn, or Bun version in every generated
  JavaScript workspace so Turborepo can execute root scripts.
- Correct the Python recipe's `httpx` development dependency.
- Clarify dependency-lockfile ownership in generated project READMEs.

## [0.1.0] - 2026-09-30

### Added

- Initial public multi-stack generator release.
- SvelteKit, Flutter, Python, Go, Rust, Tauri, and custom application recipes.
- Supabase, Docker, native Caddy, migration, backup/restore, and observability
  generated-project baseline.

### Security

- Public bootstrap release was published interactively with npm 2FA. Future
  releases are intended to use npm trusted publishing and provenance.
