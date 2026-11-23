# Firebase deployment runbook

1. Review ADRs, API contracts, Firebase rules/indexes, and Emulator Suite test evidence.
2. Confirm the intended Firebase project with `firebase use` and approved CI identity.
3. Deploy only reviewed assets with `make firebase-deploy`.
4. Deploy Dockerized product services separately from Firebase and reload native Caddy only with operator approval.
5. Verify Auth, Firestore, Storage, Functions, logs, and alerting in the selected Firebase project.
