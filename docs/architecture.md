# Generator architecture

Infra9CORE is a zero-runtime-dependency Node.js 24 CLI. The executable delegates
to `src/cli.js`, which parses flags or collects prompts and passes normalized
configuration to `src/generator.js`.

The generator creates the invariant project skeleton, copies the base template,
merges selected feature templates, renders selected application templates, and
optionally initializes Git and installs JavaScript dependencies. It never clones
the Infra9CORE repository and never copies generator source into a new project.

Template files use explicit tokens such as `{{PROJECT_NAME}}`,
`{{PROJECT_SLUG}}`, and `{{PROJECT_SNAKE}}`. Application recipes select and render
templates; they do not contain embedded application source code.
