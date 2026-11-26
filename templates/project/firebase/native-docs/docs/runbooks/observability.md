# Native Firebase observability runbook

Use Firebase and Google Cloud logging, Error Reporting, and monitoring for
managed Auth, Firestore, Storage, Functions, and Hosting. Applications and
Functions must emit structured logs with a request or correlation identifier;
propagate that identifier across application and Functions boundaries.

Before production, define alerts for authentication failures, rules denials,
Function errors and latency, Firestore quota/error signals, Storage failures,
and Hosting availability. Document the project-specific dashboards, on-call
route, retention, and incident escalation path in an append-only ADR or
operations runbook.

This native capability has no Caddy or Docker service logs. Do not invent local
container checks as a substitute for Emulator Suite evidence or managed-service
telemetry.
