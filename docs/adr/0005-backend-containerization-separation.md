# ADR 0005: Backend and containerization are independent capabilities

Firebase defaults to native tooling and Firebase-managed deployment. Container
infrastructure is added only with `--containerization docker-compose`. Supabase
continues to require Docker Compose because its supported architecture is
self-hosted Supabase, Kong, native Caddy, migrations, and operational services.
Legacy manifests without a Firebase containerization field are advisory-only and
retain their Docker behavior; Infra9CORE never rewrites existing projects.
