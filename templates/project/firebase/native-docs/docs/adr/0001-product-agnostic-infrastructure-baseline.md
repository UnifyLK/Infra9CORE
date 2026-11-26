# ADR 0001: Native managed Firebase infrastructure baseline

## Status

Accepted

## Decision

This project uses Infra9CORE's native managed Firebase profile. Firebase Auth,
Firestore, Storage, Functions, Hosting, and Emulator Suite are Google-managed
services. `firebase/` owns rules, indexes, Functions, and emulator
configuration. No Docker, Docker Compose, Caddy, container registry, or
self-hosted Firebase-compatible runtime is generated or supported by this
capability.

## Consequences

Firestore and Storage rules are authorization code and must be reviewed and
tested against the Emulator Suite. Firebase Admin credentials never enter Git.
Use Application Default Credentials or managed CI secrets. Domain code remains
independent of Firebase SDK adapters. Selecting `docker-compose` is an explicit
future capability decision, not an implicit prerequisite for native Firebase.
