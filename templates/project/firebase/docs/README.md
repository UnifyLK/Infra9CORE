# Engineering documentation

Build in this order: domain model, ADRs, API contracts, hexagonal boundaries,
Firebase data model and security rules, observability, CI/CD, frontend,
testing, then runbooks. ADRs are append-only.

The `firebase/` directory owns Firebase Functions, Firestore rules and indexes,
Storage rules, and Emulator Suite configuration. Firebase is a managed service;
do not introduce a self-hosted Firebase-compatible runtime. Every human and
coding agent must read root `AGENTS.md` before changing operations or structure.

## Multi-application Firebase projects

Use `.infra9core/apps/*.json` as the source-controlled registry for deployable
applications. Registrations support nested paths (for example
`apps/services/tenant-portal`), capabilities, package dependencies, and optional
Firebase resource mappings. A registration is not a request to create Firebase
resources: `make app-plan APP=tenant-portal` is non-mutating and documents the
remote identifiers that an approved operator must verify.

```bash
make app-create APP=tenant-portal GROUP=services TYPE=sveltekit \
  FIRESTORE_DATABASE=tenant-portal FUNCTIONS_CODEBASE=tenant-portal \
  HOSTING_TARGET=tenant-portal HOSTING_SITE=example-tenant-portal \
  HOSTING_PUBLIC=apps/services/tenant-portal/build
make app-validate
make app-config
make app-plan APP=tenant-portal
```

`make app-config` renders `firebase/firebase.generated.json` from validated
registrations without contacting Firebase. `make app-deploy APP=...` only deploys
the selected Functions codebase and Hosting target after `CONFIRM_DEPLOY=1`; it
does not deploy Firestore rules. For an existing Hosting site, first use the
operator command emitted by `make app-plan` to associate the reviewed target
with the existing site, review the resulting `.firebaserc` mapping, then set
`CONFIRM_TARGETS=1` for Hosting deployment. Review database-specific rules and
indexes with the full reviewed Firebase deployment workflow. Use 2nd-generation
Functions for named Firestore database triggers.
