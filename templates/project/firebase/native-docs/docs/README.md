# Engineering documentation

Build in this order: domain model, ADRs, API contracts, hexagonal boundaries,
Firebase data model and security rules, observability, CI/CD, frontend,
testing, then runbooks. ADRs are append-only.

The `firebase/` directory owns Firebase Functions, Firestore rules and indexes,
Storage rules, and Emulator Suite configuration. This is the native Firebase
capability: Firebase is managed and local integration runs through the Emulator
Suite. Docker, Docker Compose, Caddy, and container image registry controls are
not generated. Every human and coding agent must read root `AGENTS.md` before
changing operations or structure.

## Multi-application Firebase projects

Use `.infra9core/apps/*.json` as the source-controlled registry for deployable
applications. Registrations support nested paths, capabilities, package
dependencies, and optional Firebase resource mappings. A registration never
creates Firebase resources: `make app-plan APP=tenant-portal` is non-mutating
and identifies remote resources an approved operator must verify.

`make app-config` renders `firebase/firebase.generated.json` from validated
registrations without contacting Firebase. `make app-deploy APP=...` requires
explicit confirmation and deploys only the selected Functions codebase and
Hosting target; it does not deploy Firestore rules. Review database-specific
rules and indexes through the approved Firebase deployment workflow.
