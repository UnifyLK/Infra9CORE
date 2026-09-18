# Backup and restore runbook

## Backup

Run `make backup`. The command creates a PostgreSQL custom-format dump and SHA-256
file under `infra/backups/`. Encrypt it, transfer it to access-controlled off-host
storage, enforce retention, and remove local copies according to policy.

## Restore rehearsal

1. Provision an isolated non-production stack with no public routes.
2. Verify the dump checksum.
3. Set `CONFIRM_RESTORE=yes` and run
   `make restore BACKUP=/absolute/path/to/postgres-TIMESTAMP.dump`.
4. Apply migrations, run integrity checks and integration tests, and record RTO
   and RPO evidence.
5. Destroy rehearsal data securely.

Never test restores against production. A backup is not considered viable until
a restore rehearsal succeeds.
