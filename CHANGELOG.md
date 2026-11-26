# Changelog

## 0.2.0

- Realign Firebase application registration as technology-neutral metadata;
  consumer projects now own Firebase resource topology through native files.
- Deprecate legacy application-to-resource mappings with read-only diagnostics.
- Preserve native Firebase Functions as an inactive configuration boundary until
  a consuming project supplies a valid runtime and explicit configuration.
- Separate Firebase backend selection from optional Docker Compose capability.
- Default Firebase projects to native Emulator Suite development and managed deployment.
- Add Node 24, reproducible package-manager, CI, workspace Docker, and container supply-chain readiness controls.
- Preserve Supabase self-hosted Docker, Kong, Caddy, migration, RLS, backup, and restore defaults.
