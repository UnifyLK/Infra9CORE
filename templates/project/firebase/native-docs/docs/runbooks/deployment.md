# Native Firebase deployment runbook

1. Review ADRs, API contracts, Firebase rules/indexes, and Emulator Suite test evidence.
2. Confirm the intended Firebase project with `firebase use` and approved CI identity.
3. Run `make app-validate` for generic application records and review the
   product-owned `firebase/firebase.json`, Rules, indexes, Functions, and
   Hosting configuration.
4. Test selected Firebase topology through the Emulator Suite.
5. Deploy only reviewed Firebase assets with `make firebase-deploy`.
6. Verify Auth, Firestore, Storage, Functions, Hosting, logs, and alerting in the selected Firebase project.

This native capability has no Docker Compose or Caddy deployment step. Do not
add one without an explicit containerization decision and its associated
security controls.
