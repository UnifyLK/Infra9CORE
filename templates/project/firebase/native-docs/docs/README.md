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

## Application and Firebase boundaries

Use `.infra9core/apps/*.json` only for generic application identity, path,
technology, capabilities, and dependencies. `make app-create` never creates a
database, Rules/indexes, Functions codebase, Hosting target, or remote resource.

The product owns Firebase topology in `firebase/firebase.json` and related
native Firebase files. Add named databases, database-specific Rules/indexes,
Functions runtimes, and Hosting only after recording the product decision and
testing it through the Emulator Suite. The generated `functions/` directory is
an ownership boundary, not an executable runtime.
