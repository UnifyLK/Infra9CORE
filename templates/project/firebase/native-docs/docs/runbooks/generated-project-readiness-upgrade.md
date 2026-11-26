# Native Firebase generated-project migration

This generated project selected `backend=firebase` and
`containerization=none`. It already uses the native Firebase capability; do not
add Docker, Compose, Caddy, image registry, or container-policy files as an
upgrade step.

For a legacy Firebase manifest that lacks `project.containerization`, run the
generator update check to obtain read-only advisories. Decide deliberately:

1. Retain the legacy Docker-capable layout and set `containerization=docker-compose` only after reviewing its private-registry and Caddy controls; or
2. Migrate to this native layout after preserving application code, lockfiles,
   Firebase configuration, and `.infra9core/apps` registrations outside the
   generated replacement.

Never overwrite an existing project automatically. Re-run `make app-validate`,
review project-owned Firebase Rules and indexes in the Emulator Suite, and
require normal change approval before Firebase deployment. Legacy application
records with Firebase resource mappings remain readable but are deprecated;
preserve those definitions in native Firebase configuration through a reviewed
consumer migration.
