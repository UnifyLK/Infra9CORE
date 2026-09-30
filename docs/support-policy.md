# Infra9CORE support policy

## Compatibility

- Generator runtime: Node.js 24.x only (`>=24 <25`).
- Generated JavaScript workspaces: Node.js 24.x only.
- Supported recipes: SvelteKit, Flutter, Python, Go, Rust, Tauri, and custom.
- Native recipe validation is performed by the explicit release-candidate gate;
  it is not an automatic pull-request or merge workflow.

## Versioning

- Patch releases repair generator behavior without changing the generated-project
  contract.
- Minor releases add recipes, optional features, or non-breaking baseline files.
- Major releases may change or remove generated-project contract behavior and
  include migration guidance.

## Generated-project ownership

Infra9CORE owns only files declared by the generated manifest and never owns
application code under `apps/`, secrets, lockfiles, build output, backups, or
runtime volumes. `create-infra9core doctor <path>` is read-only.

## Deprecation

Deprecated options or recipes are announced in a minor release and retained for
at least one subsequent minor release unless a security issue requires removal.
