# Firebase infrastructure documentation

The Firebase backend profile provides Auth, Firestore, Storage, a deny-by-
default Rules baseline, index boundaries, Emulator Suite configuration, and
guarded deployment commands. Firebase is managed; Infra9CORE does not generate
a self-hosted Firebase runtime.

`.infra9core/apps/` is a generic application registry. `make app-create` adds
only a path and technology metadata. It does not create or claim Firebase
resources.

Products own database topology, Functions runtimes, Hosting targets, resource
relationships, authorization policy, and deployment selection in native
Firebase configuration. To use named Firestore databases, add standard
database-specific Rules and indexes entries to `firebase/firebase.json`, select
the database explicitly in the product SDK, and test the resulting topology in
the Emulator Suite. A Functions directory is merely an ownership boundary until
the product supplies a supported runtime, dependencies, entry point, triggers,
and explicit Firebase configuration.

`make firebase-emulators` starts only the baseline configured emulators with a
local/demo project identity. `make firebase-deploy` is guarded by the required
project ID and deploys the reviewed project-owned configuration.
