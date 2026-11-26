# Generic application registration and Firebase configuration

`.infra9core/apps/*.json` records generic application metadata: identifier,
path, technology type, capabilities, and workspace dependencies. It does not
own a database, Functions codebase, Hosting target, tenant, or business domain.

Use `make app-create APP=sample-app GROUP=services TYPE=sveltekit` to create a
generic application boundary, then use `make app-validate` to validate it. The
command creates no Firebase resources, rules/indexes, Functions codebases, or
deployment plans.

## Native Firebase topology belongs to the project

When a product needs named Firestore databases, define them directly in its
version-controlled `firebase/firebase.json` using Firebase CLI conventions.
Each database entry selects its own identifier, Rules file, and indexes file.
The product also owns SDK database selection, authorization policy, Emulator
tests, deployment review, and any Hosting or Functions configuration.

The generated baseline intentionally contains only the default Firestore and
Storage boundaries. It starts locally with `make firebase-emulators` using a
demo project identity and no cloud provisioning. A project may add executable
Functions only after it provides a supported runtime, dependencies, entry point,
and explicit native Firebase configuration. Do not add a placeholder Functions
directory to `firebase.json`.

Legacy registrations containing a `firebase` object remain readable but are
deprecated. Preserve their resource definitions in project-owned Firebase
configuration and migrate them through a reviewed consumer change; Infra9CORE
never rewrites or provisions those resources.
