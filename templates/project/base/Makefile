SHELL := /usr/bin/env bash
.DEFAULT_GOAL := help

COMPOSE := docker compose --env-file infra/env/.env -f infra/docker/docker-compose.yml -f infra/docker/docker-compose.apps.yml

.PHONY: help infra9core env doctor validate config up down restart ps logs migrate rollback backup restore build clean

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

infra9core: ## Configure tracked infrastructure and generate the coding-agent brief
	@node tools/infra9core-configure.mjs

##@ Local environment

env: ## Create local environment configuration without overwriting it
	@infra/scripts/env-init.sh

doctor: ## Validate host tools and configuration
	@infra/scripts/doctor.sh

validate: ## Run repository-static quality gates
	@tools/validate.sh

config: ## Validate and render the Docker Compose configuration
	@infra/scripts/compose.sh config --quiet

##@ Stack operations

up: ## Start the infrastructure stack
	@infra/scripts/compose.sh up --detach --remove-orphans

build: ## Build every selected containerized application service
	@infra/scripts/compose.sh build

down: ## Stop the infrastructure stack
	@infra/scripts/compose.sh down

restart: down up ## Restart the infrastructure stack

ps: ## Show service status
	@infra/scripts/compose.sh ps

logs: ## Follow service logs (SERVICE=name is optional)
	@infra/scripts/logs.sh "$(SERVICE)"

##@ Database operations

migrate: ## Apply pending forward migrations
	@infra/scripts/db-migrate.sh

rollback: ## Apply one rollback (MIGRATION=001_name.sql)
	@infra/scripts/db-rollback.sh "$(MIGRATION)"

backup: ## Create a timestamped PostgreSQL backup
	@infra/scripts/db-backup.sh

restore: ## Restore a backup (BACKUP=/absolute/path/file.dump)
	@infra/scripts/db-restore.sh "$(BACKUP)"

##@ Cleanup

clean: ## Remove stopped containers and local build output; keep volumes/data
	@infra/scripts/compose.sh rm --force --stop
	@find apps packages shared -type d \( -name dist -o -name build -o -name coverage \) -prune -exec rm -rf -- {} + 2>/dev/null || true
