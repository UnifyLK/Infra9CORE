# Production application image approval

This inventory applies only to Docker-owned application services. It does not
apply to Firebase-managed Auth, Firestore, Storage, Functions, Hosting, or the
Emulator Suite. Before production deployment, record each private mirrored image
with its immutable digest, approved rollback digest, SBOM location, vulnerability
scan evidence, and Cosign signature evidence. `make doctor` and production
`make up` fail closed if the required trust configuration is incomplete.
