# Production image approval

Development may use the reviewed tags in `infra/env/.env.example`. Before a
production deployment, mirror every image into the approved private registry and
replace each image value with its immutable `@sha256:` digest.

For every approved image, record its private `image` name, immutable `digest`,
approved `rollbackDigest`, `sbom` location, vulnerability `scan` evidence, and
Cosign `signature` evidence in `manifest.json`. Configure the signing identity,
trusted certificate identity expression, OIDC issuer, and vulnerability threshold
only in the uncommitted production environment file. `make doctor` rejects
production configuration without private, digest-pinned image values and complete
approval evidence; `make up` verifies Cosign signatures before containers start.
