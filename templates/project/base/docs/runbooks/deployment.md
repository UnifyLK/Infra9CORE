# Deployment runbook

## Preconditions

- Ubuntu host patched and restricted by firewall/security groups.
- Docker Engine and Compose v2 installed; the deployer is least-privileged.
- Native Caddy installed through its signed package repository.
- DNS points the application and Studio hostnames at the server.
- Private registry authentication configured with read-only credentials.
- Images pinned by digest, vulnerability-scanned, and signature-verified.
- Encrypted off-host backup destination configured and restore tested.

## First deployment

1. Clone into a versioned release directory using a deploy key.
2. Create `infra/env/.env`, set mode `0600`, and inject secrets from the approved
   secret store. Do not copy production secrets through shell history.
3. Set `IMAGE_REGISTRY` to the approved private registry and use signed images.
4. Run `make doctor` and `make config`.
5. Run `make up`, `make migrate`, and `make ps`.
6. Copy and adapt `infra/caddy/Caddyfile.example` under `/etc/caddy/`; validate
   with `caddy validate` before reloading the Caddy service.
7. Probe application, API, authentication, storage, and database health.
8. Confirm JSON logs include the edge request ID and application trace ID.

## Release

1. Back up the database and verify its checksum.
2. Pull only approved image digests.
3. Apply backward-compatible migrations before application rollout.
4. Deploy, perform smoke tests, then monitor errors, latency, and saturation.
5. Record release version, image digests, migration set, and operator identity.

## Rollback

Roll application images back first. Apply a database rollback only when its data
loss characteristics were reviewed and a fresh backup exists. Run
`make rollback MIGRATION=NNN_name.sql`; never edit the migration ledger manually.
