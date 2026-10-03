# Deployment runbook

## Preconditions

- Ubuntu host patched and restricted by firewall/security groups.
- Docker Engine and Compose v2 installed; the deployer is least-privileged.
- Native Caddy installed through its signed package repository.
- DNS points the application and Studio hostnames at the server.
- Private registry authentication configured with read-only credentials.
- Images pinned by digest, vulnerability-scanned, and signature-verified.
- Encrypted off-host backup destination configured and restore tested.
- For a SarvaOps-managed host, choose the registered project number and use
  `portAllocation.provider: sarvaops` in `.infra9core/config.json`. The
  configurator derives the loopback web/db/Studio/API/Kong ports from the
  SarvaOps `P-E-SS` contract; never copy container ports such as `3000` into
  Caddy upstreams.

## First deployment

1. Clone into a versioned release directory using a deploy key.
2. Create `infra/env/.env`, set mode `0600`, and inject secrets from the approved
   secret store. Do not copy production secrets through shell history.
3. Set `IMAGE_REGISTRY` to the approved private registry and use signed images.
4. Run `make doctor` and `make config`.
5. Run `make up`, `make migrate`, and `make ps`.
6. Select the Caddy ownership model before changing the host:
   - For a directly managed native Caddy host, render and adapt
     `infra/caddy/Caddyfile.example` under `/etc/caddy/`, then validate with
     `caddy validate` before reload.
   - For SarvaOps-managed Caddy, import the generated
     `infra/caddy/SarvaOps.import.caddy` through the SarvaOps import preview.
     It contains only explicit single-host proxy and `www` redirect blocks;
     it deliberately excludes global options, logging, wildcard tenancy, Kong,
     and Studio. Review every importer warning before applying it.
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
