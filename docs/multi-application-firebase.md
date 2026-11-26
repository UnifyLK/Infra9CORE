# Multi-application Firebase projects

Infra9CORE's Firebase profile supports independently deployable applications in
one repository while keeping product domain configuration outside framework
infrastructure.

## Application registry

`.infra9core/apps/*.json` is source-controlled infrastructure configuration.
Each registration has a stable identifier, an explicit path below `apps/`, a
type, capabilities, package dependency declarations, and optional Firebase
resource mappings. It must not contain runtime business settings, application
content, API keys, service accounts, or deployment credentials.

Nested groups are supported by workspace discovery, for example:

```text
apps/
├── console/
└── services/
    └── tenant-portal/
```

Applications may depend on reusable `packages/` and pure `shared/` contracts;
they must not depend directly on another application.

## Firebase mappings

A registration can map one application to a named Firestore database,
Functions codebase, Hosting target/site, and Hosting public directory. The
validator rejects path traversal, malformed identifiers, duplicate application
IDs/paths, and duplicate ownership of Firestore databases, Functions codebases,
Hosting targets, or Hosting sites.

```bash
make app-create APP=tenant-portal GROUP=services TYPE=sveltekit \
  FIRESTORE_DATABASE=tenant-portal FUNCTIONS_CODEBASE=tenant-portal \
  HOSTING_TARGET=tenant-portal HOSTING_SITE=example-tenant-portal \
  HOSTING_PUBLIC=apps/services/tenant-portal/build
make app-validate
make app-config
```

`make app-config` renders `firebase/firebase.generated.json`; it does not
contact Firebase. It creates entries for database-specific Rules and indexes,
independent Functions codebases, and Hosting targets.

## Adoption and deployment

`make app-plan APP=tenant-portal` is an adoption-only, non-mutating plan. The
operator must verify the Firebase project, IAM, and all resource identifiers.
For an existing Hosting site, the plan emits the required `firebase target:apply`
command; review its `.firebaserc` result before deployment.

`make app-deploy APP=tenant-portal CONFIRM_DEPLOY=1` deploys only the selected
Functions codebase and Hosting target. Hosting additionally requires
`CONFIRM_TARGETS=1`. Database Rules and indexes are deliberately excluded from
selective deploys and must use the reviewed full Firebase deployment workflow.

Use 2nd-generation Functions for named Firestore database triggers. Test Rules,
client configuration, and Functions through the Emulator Suite before a remote
deployment. Firebase resource creation, production provisioning, and credential
management remain operator-approved activities.
