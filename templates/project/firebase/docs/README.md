# Engineering documentation

Build in this order: domain model, ADRs, API contracts, hexagonal boundaries,
Firebase data model and security rules, observability, CI/CD, frontend,
testing, then runbooks. ADRs are append-only.

The `firebase/` directory owns Firebase Functions, Firestore rules and indexes,
Storage rules, and Emulator Suite configuration. Firebase is a managed service;
do not introduce a self-hosted Firebase-compatible runtime. Every human and
coding agent must read root `AGENTS.md` before changing operations or structure.
