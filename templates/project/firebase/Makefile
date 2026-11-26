SHELL := /usr/bin/env bash
.DEFAULT_GOAL := help
COMPOSE := docker compose --env-file infra/env/.env -f infra/docker/docker-compose.yml -f infra/docker/docker-compose.apps.yml

.PHONY: help infra9core env doctor validate config up down ps logs build firebase-emulators firebase-deploy app-create app-list app-validate app-plan app-config app-build app-test app-deploy clean

##@ Getting started

help: ## Show available commands
	@{ \
		if [ -t 1 ] && [ "$${TERM:-dumb}" != "dumb" ] && [ -z "$${NO_COLOR:-}" ]; then \
			title="$$(printf '\033[1;36m')"; section="$$(printf '\033[1;34m')"; command="$$(printf '\033[0;32m')"; reset="$$(printf '\033[0m')"; \
		fi; \
		awk -v title="$$title" -v section="$$section" -v command="$$command" -v reset="$$reset" ' \
			BEGIN { FS = ":.*## "; printf "%sUsage:%s make <target>\n", title, reset } \
			/^##@ / { printf "\n%s%s%s\n", section, substr($$0, 5), reset; next } \
			/^[a-zA-Z0-9_-]+:.*## / { printf "  %s%-18s%s %s\n", command, $$1, reset, $$2 } \
		' $(MAKEFILE_LIST); \
	}

infra9core: ## Configure tracked Firebase and deployment identity
	@node tools/infra9core-configure.mjs

##@ Local environment

env: ## Create local Firebase configuration without overwriting it
	@infra/scripts/env-init.sh
doctor: ## Validate local Firebase tooling and configuration
	@infra/scripts/doctor.sh
validate: ## Run repository-static quality gates
	@tools/validate.sh
config: ## Validate the selected server-application Compose graph
	@infra/scripts/compose.sh config --quiet

##@ Stack operations

up: ## Start selected Docker server applications
	@infra/scripts/compose.sh up --detach --remove-orphans
down: ## Stop selected Docker server applications
	@infra/scripts/compose.sh down
ps: ## Show server-application status
	@infra/scripts/compose.sh ps
logs: ## Follow server-application logs (SERVICE=name is optional)
	@infra/scripts/compose.sh logs --follow "$(SERVICE)"
build: ## Build selected Docker server applications
	@infra/scripts/compose.sh build

##@ Firebase operations

firebase-emulators: ## Start Firebase Emulator Suite for local integration work
	@firebase emulators:start --config firebase/firebase.json --project "$${FIREBASE_PROJECT_ID:-demo-infra9core}"
firebase-deploy: ## Deploy reviewed Firebase rules, indexes, and Functions
	@firebase deploy --config firebase/firebase.json --project "$${FIREBASE_PROJECT_ID:?run make env first}"

##@ Application management

app-create: ## Register a generic app (APP=id; optional GROUP, TYPE, Firebase mappings)
	@node tools/infra9core-app.mjs create APP="$(APP)" GROUP="$(GROUP)" TYPE="$(TYPE)" CAPABILITIES="$(CAPABILITIES)" DEPENDENCIES="$(DEPENDENCIES)" FIRESTORE_DATABASE="$(FIRESTORE_DATABASE)" FUNCTIONS_CODEBASE="$(FUNCTIONS_CODEBASE)" HOSTING_TARGET="$(HOSTING_TARGET)" HOSTING_SITE="$(HOSTING_SITE)" HOSTING_PUBLIC="$(HOSTING_PUBLIC)"
app-list: ## List registered applications
	@node tools/infra9core-app.mjs list
app-validate: ## Validate application registrations (APP is optional)
	@node tools/infra9core-app.mjs validate
app-plan: ## Show a non-mutating Firebase adoption/provisioning plan (APP=id)
	@node tools/infra9core-app.mjs plan APP="$(APP)"
app-config: ## Render Firebase CLI config from registrations without changing remote resources
	@node tools/infra9core-app.mjs firebase-config
app-build: ## Build one registered JavaScript app (APP=id)
	@node tools/infra9core-app.mjs run APP="$(APP)" SCRIPT=build
app-test: ## Test one registered JavaScript app (APP=id)
	@node tools/infra9core-app.mjs run APP="$(APP)" SCRIPT=test
app-deploy: ## Deploy Functions/Hosting (APP=id CONFIRM_DEPLOY=1; Hosting also CONFIRM_TARGETS=1)
	@CONFIRM_DEPLOY="$(CONFIRM_DEPLOY)" CONFIRM_TARGETS="$(CONFIRM_TARGETS)" FIREBASE_PROJECT_ID="$${FIREBASE_PROJECT_ID:-}" node tools/infra9core-app.mjs deploy APP="$(APP)"

##@ Cleanup

clean: ## Remove stopped containers and local build output; keep data
	@infra/scripts/compose.sh rm --force --stop
	@find apps packages shared -type d \( -name dist -o -name build -o -name coverage \) -prune -exec rm -rf -- {} + 2>/dev/null || true
