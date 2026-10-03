# Changelog

All notable changes to Infra9CORE are documented here. The project follows
[Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- Generated projects now include a non-secret first-run configuration record,
  `make infra9core`, and a coding-agent first-run brief. The guided command
  previews and renders managed environment-template and native-Caddy files
  without creating or overwriting local secrets.
- SvelteKit, Python, Go, and Rust recipes now include Dockerfiles and generated
  application-service Compose overlays. Their ports bind only to loopback for
  native Caddy on Ubuntu/WSL.

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
