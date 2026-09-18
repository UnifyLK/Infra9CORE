# Infra9CORE contributor documentation

This directory documents the generator itself. Files destined for generated
repositories belong under `templates/project/`, never here.

## Boundaries

- `bin/`: npm executable entry point
- `src/`: CLI orchestration, prompts, validation, and template rendering
- `templates/apps/`: selectable application skeletons
- `templates/project/base/`: files included in every generated repository
- `templates/project/features/`: optional overlays such as generated-project CI
- `test/`: generator behavior and generated-output contract tests

Generated repositories must always contain `apps`, `docs`, `infra`, `packages`,
`shared`, `supabase`, and `tools`, plus the documented root configuration files.
