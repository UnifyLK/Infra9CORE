# Infra9CORE support policy

Infra9CORE is maintained by [Unify IT Solutions](https://unify.lk). Report
generator defects through the repository's issue tracker; report vulnerabilities
through the private route in [SECURITY.md](../SECURITY.md).

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

Manifest schema v1 records project identity and selected recipes; it does not
claim ownership of generated files. Infra9CORE never overwrites application code
under `apps/`, secrets, lockfiles, build output, backups, or runtime volumes.
`create-infra9core doctor <path>` and `update --check` are read-only.

## Deprecation

Deprecated options or recipes are announced in a minor release and retained for
at least one subsequent minor release unless a security issue requires removal.
