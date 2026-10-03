# Generator architecture

Infra9CORE is a zero-runtime-dependency Node.js 24 CLI. The executable delegates
to `src/cli.js`, which parses flags or collects prompts and passes normalized
configuration to `src/generator.js`.

The generator creates the invariant project skeleton and infrastructure, copies
the base template, merges selected overlays, renders application templates, and
optionally initializes Git and installs JavaScript dependencies. It never clones
the Infra9CORE repository and never copies generator source into a new project.

Generated projects also contain `.infra9core/config.json`, a committed non-secret
deployment profile. Their `make infra9core` command runs the shipped Node 24
renderer to collect deployment identity, preview managed output, and render the
environment template, native Caddyfile, and coding-agent brief. It never writes
the local secret file and protects an unmanaged Caddyfile from replacement.

Server-capable recipes (SvelteKit, Python, Go, and Rust) include Dockerfiles.
The generator renders `infra/docker/docker-compose.apps.yml` as an overlay on
the Supabase Compose stack, publishing services only on `127.0.0.1`. Native
Caddy remains the sole public entry point. Flutter and Tauri are client
applications and therefore are not emitted as long-running server services.

Template files use explicit tokens such as `{{PROJECT_NAME}}`,
`{{PROJECT_SLUG}}`, and `{{PROJECT_SNAKE}}`. Application recipes select and render
templates; they do not contain embedded application source code.
