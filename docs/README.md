# Infra9CORE contributor documentation

Infra9CORE is built and maintained by [Unify IT Solutions](https://unify.lk).
These documents govern the public generator; they do not add Unify branding to
projects generated from it.

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

## Policies and runbooks

- [Long-term stability roadmap](long-term-stability-roadmap.md)
- [Support policy](support-policy.md)
- [Release execution plan](release-execution-plan.md)
- [Dependency and image maintenance policy](dependency-and-image-policy.md)
- [Release recovery runbook](runbooks/release-recovery.md)
- [Upstream reference review](upstream-reference-review.md)
