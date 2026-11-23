# ADR 0001: Managed Firebase infrastructure baseline

## Status

Accepted

## Decision

This project uses Infra9CORE's managed Firebase profile. Firebase Auth,
Firestore, Storage, Functions, and Emulator Suite are Google-managed services.
`firebase/` owns rules, indexes, Functions, and emulator configuration. Docker
is reserved for selected product server applications; native Caddy remains the
Ubuntu ingress for those applications. No self-hosted Firebase-compatible
runtime is generated or supported.

## Consequences

Firestore and Storage rules are authorization code and must be reviewed and
tested against the Emulator Suite. Firebase Admin credentials never enter Git.
Use Application Default Credentials or managed CI secrets. Domain code remains
independent of Firebase SDK adapters.
