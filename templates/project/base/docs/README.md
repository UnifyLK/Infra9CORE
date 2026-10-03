# Engineering documentation

Write documentation in the order used to build the system:

1. domain model and ubiquitous language
2. architecture decision records
3. OpenAPI contracts
4. hexagonal application boundaries
5. forward and rollback database migrations
6. authentication and RLS policy matrix
7. observability and trace propagation
8. CI/CD and release controls
9. frontend behavior and accessibility
10. unit, integration, and end-to-end test strategy
11. operational runbooks

ADRs are append-only historical records. When a decision changes, create a new
ADR that supersedes the old one rather than rewriting history.

Every human developer and coding agent must read the root `AGENTS.md` before
changing the repository structure or operational configuration.

The root `supabase/` directory is product-owned (functions, migrations, and
rollbacks). `infra/supabase/` is reserved for self-hosted runtime internals such
as Kong/API and database-bootstrap volume assets; never mix these boundaries.
