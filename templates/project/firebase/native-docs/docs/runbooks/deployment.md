# Native Firebase deployment runbook

1. Review ADRs, API contracts, Firebase rules/indexes, and Emulator Suite test evidence.
2. Confirm the intended Firebase project with `firebase use` and approved CI identity.
3. Run `make app-validate` and review `make app-plan APP=<id>` for every selected application; the plan is non-mutating.
4. Render and review `firebase/firebase.generated.json` with `make app-config` when application mappings changed.
5. Deploy only reviewed Firebase assets with `make firebase-deploy` or the explicitly confirmed selected-app deployment path.
6. Verify Auth, Firestore, Storage, Functions, Hosting, logs, and alerting in the selected Firebase project.

This native capability has no Docker Compose or Caddy deployment step. Do not
add one without an explicit containerization decision and its associated
security controls.
