# Dependency and image maintenance policy

## Dependency refreshes

Dependency updates are batched into an explicit release candidate. Do not accept
unreviewed version drift simply because a template range resolves differently on
a later installation.

For every selected recipe, the release maintainer records the resolved versions,
license/security review result, compatibility impact, and rollback release in the
release notes. Generated projects own their lockfiles; Infra9CORE does not
overwrite them.

## Production image refreshes

Production images must be mirrored into the approved private registry, pinned by
digest, signed, and recorded in `infra/images/manifest.json`. A refresh requires:

1. source and mirror digest;
2. signature-verification and CVE-review dates;
3. compatibility test against the generated Compose stack;
4. approved rollback digest; and
5. restore/recovery impact assessment.

Mutable tags are permitted only for local development. `make doctor` rejects
non-digest production image values.

## Release evidence

Attach the manual release-candidate validation result, package checksum, image
approval inventory, and SBOM/license review output to the release record. A
failed or interrupted validation is not release evidence.
