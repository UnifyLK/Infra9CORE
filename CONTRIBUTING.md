# Contributing to Infra9CORE

Infra9CORE is an open-source project maintained by
[Unify IT Solutions](https://unify.lk). Contributions improve the public
generator, never a generated product's business logic or brand.

## Runtime and validation

Use Node.js 24.x only. Run the fast generator checks before committing:

```bash
npm run validate
```

Run the full, manual native release-candidate gate when changing application
recipes, infrastructure templates, package contents, or release behavior:

```bash
bash tools/release-validate.sh
```

This repository intentionally does not run workflows automatically for pull
requests or merges.

## GitHub workflow

Use the root Makefile for the standard main-centric workflow:

```bash
make git-status
make feature NAME=short-description
make save MESSAGE="feat: short description"
make sync
make push
make pr TITLE="feat: short description"
make pr-status
make pr-merge PR=123 CONFIRM_MERGE=1 METHOD=squash
```

`make save` stages, validates, commits, and pushes the current feature branch.
`make pr` refuses dirty branches and opens or shows the current branch's pull
request against `main`. `make pr-merge` is deliberately confirmation-gated,
deletes the merged remote branch, and fast-forwards the local checkout to
`main`. Release publication remains separate and requires `make release
CONFIRM_RELEASE=1`.

## Generated-project contract

Do not copy product code, domains, credentials, brands, or ports into templates.
Changes to invariant root directories, manifests, infrastructure scripts, or
recipe behavior must be documented as generated-project contract impact and
covered by tests.

`apps/` generated code becomes product-owned immediately. Never design an
automated generator update that overwrites application code, environment files,
lockfiles, backups, or runtime data.

## Pull requests and releases

Use the pull-request template. Update `CHANGELOG.md`, support/security policy,
and ADRs when a change affects compatibility, security, release governance, or
the template contract. Releases are created from immutable tags by maintainers.
