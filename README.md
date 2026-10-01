# Infra9CORE

Infra9CORE is a product-agnostic, multi-stack monorepo generator published as
`@unifyit/create-infra9core`.

```bash
npx @unifyit/create-infra9core@latest
```

It creates a production-minded repository with selectable application stacks and
an invariant Supabase, Docker, native-Caddy, migration, observability, ADR, and
runbook baseline. CI is available as an optional overlay.

## Repository separation

- `src/` contains only the Infra9CORE generator implementation.
- `templates/project/base/` contains the invariant generated-project skeleton.
- `templates/project/features/` contains optional overlays such as CI.
- `templates/apps/` contains selectable application stacks.
- `test/` validates the CLI and its generated output.

Every generated project receives these top-level boundaries, even when an
optional feature or application stack is not selected: `apps/`, `docs/`,
`infra/`, `packages/`, `shared/`, `supabase/`, and `tools/`.

## Supported application recipes

- SvelteKit web application
- Flutter mobile application
- Python API or worker
- Go API or worker
- Rust API or worker
- Tauri desktop application
- Empty custom application boundary

The generator never imports product names, domains, ports, credentials, branding,
or business logic from existing projects.

## Non-interactive usage

```bash
npx @unifyit/create-infra9core@latest my-product \
  --apps sveltekit,flutter,python \
  --features ci \
  --package-manager pnpm
```

Use `--dry-run` to inspect the plan and `--yes` to accept defaults. Run
`create-infra9core --help` for every option.

## Development

Infra9CORE requires Node.js 24.x (`>=24 <25`). The repository's `.nvmrc` pins
the development runtime to Node 24.

```bash
nvm use
npm test
npm run test:package
node ./bin/create-infra9core.js demo --apps python,go --no-git
```

Publishing is performed by the `Publish package` GitHub Actions workflow, which
runs when a GitHub release is published (or by manual dispatch). npm trusted
publishing is configured for the `npm-production` environment, so the workflow
uses GitHub OIDC and publishes provenance without a long-lived npm token.

After a reviewed release branch is merged, update `package.json` and
`CHANGELOG.md`, check out an up-to-date local `main`, then run:

```bash
make release CONFIRM_RELEASE=1
```

This guarded command runs the full multi-stack release gate, verifies that the
version is unpublished, creates and pushes the matching annotated tag, publishes
the GitHub Release, waits for the publish workflow, and confirms npm exposes the
new version. It refuses dirty, stale, non-`main`, existing-tag, or already-published
release attempts.

Generated repositories keep domain logic pure and integrations behind
infrastructure adapters. They require RLS for every application table, reversible
migrations, contract-first APIs, structured traceable logs, private signed
production images, and a 70/20/10 unit/integration/e2e testing target.

## Project policies

- [Support policy](docs/support-policy.md)
- [Security policy](SECURITY.md)
- [Contribution guide](CONTRIBUTING.md)
- [Changelog](CHANGELOG.md)
- [Long-term stability roadmap](docs/long-term-stability-roadmap.md)
