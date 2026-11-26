# Engineering agent contract

This is a long-lived, production-oriented monorepo using the managed Firebase
backend profile. Read this file before changing structure or operations.

## Repository ownership

- `apps/` contains deployable product applications.
- `.infra9core/apps/*.json` is the source-controlled application registry. It
  records each application's stable identity, path, capabilities, dependencies,
  and optional Firebase resource mappings. It is infrastructure configuration,
  not runtime business configuration or a credential store.
- `packages/` contains reusable application packages; `shared/` contains pure
  domain contracts with no Firebase SDK, HTTP, or Docker dependency.
- `firebase/` contains Firebase Functions, Firestore rules/indexes, Storage
  rules, and Emulator Suite configuration. Firebase is managed by Google; do
  not create a self-hosted Firebase-compatible runtime.
- `infra/` owns Docker Compose only for selected server apps, native Caddy,
  environment templates, and operational scripts.
- `docs/` contains ADRs, OpenAPI contracts, security-rule decisions, and
  runbooks. The root Makefile is the operational interface.

## Firebase guardrails

- Treat Firestore and Storage rules as production authorization code: version,
  test, and deploy them deliberately. Do not rely solely on client checks.
- Keep Firebase Admin credentials and service-account JSON out of the repo.
  Use Application Default Credentials or a managed secret provider in CI.
- Use the Emulator Suite for local integration tests. `firebase.json` and
  `.firebaserc.example` are configuration templates, not production identity.
- Define API contracts before Functions/Cloud Run adapters. Record material
  Firebase data-model or security-rule decisions in append-only ADRs.
- An application may depend on packages and shared contracts, never another
  application. Use `make app-validate` before build or deployment work. Use
  `make app-plan APP=...` to inspect an adoption-only plan; it never creates or
  changes remote Firebase resources. Named Firestore database triggers require
  2nd-generation Functions.
- Docker images for product server services must use the approved private
  registry, digest pinning, scanning, and signing in production.
