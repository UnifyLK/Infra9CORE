# Firebase recovery runbook

Firebase backup, export, restore, and retention are managed-service operations.
Define the approved project, retention policy, export destination, access
controls, recovery objectives, and restore authorization before production use.

Native Firebase projects have no local Docker volumes, Compose database, or
Caddy state to back up. Test Firestore and Storage recovery procedures in a
separate approved environment; never restore into production without a
documented change approval.
