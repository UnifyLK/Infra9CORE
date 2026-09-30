# Production image approval

Development may use the reviewed tags in `infra/env/.env.example`. Before a
production deployment, mirror every image into the approved private registry and
replace each image value with its immutable `@sha256:` digest.

Record the source image, mirror, digest, signature-verification date, CVE review,
and approved rollback digest in `manifest.json`. `make doctor` rejects production
configuration without private, digest-pinned image values.
