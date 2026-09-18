SHELL := /usr/bin/env bash
.DEFAULT_GOAL := help

COMPOSE := docker compose --env-file infra/env/.env -f infra/docker/docker-compose.yml

.PHONY: help env doctor validate config up down restart ps logs migrate rollback backup restore clean

help: ## Show available commands
	@awk 'BEGIN {FS = ":.*## "; printf "Usage: make <target>\n\n"} /^[a-zA-Z0-9_-]+:.*## / {printf "  %-12s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

env: ## Create local environment configuration without overwriting it
	@infra/scripts/env-init.sh

doctor: ## Validate host tools and configuration
	@infra/scripts/doctor.sh

validate: ## Run repository-static quality gates
	@tools/validate.sh

config: ## Validate and render the Docker Compose configuration
	@infra/scripts/compose.sh config --quiet

up: ## Start the infrastructure stack
	@infra/scripts/compose.sh up --detach --remove-orphans

down: ## Stop the infrastructure stack
	@infra/scripts/compose.sh down

restart: down up ## Restart the infrastructure stack

ps: ## Show service status
	@infra/scripts/compose.sh ps

logs: ## Follow service logs (SERVICE=name is optional)
	@infra/scripts/logs.sh "$(SERVICE)"

migrate: ## Apply pending forward migrations
	@infra/scripts/db-migrate.sh

rollback: ## Apply one rollback (MIGRATION=001_name.sql)
	@infra/scripts/db-rollback.sh "$(MIGRATION)"

backup: ## Create a timestamped PostgreSQL backup
	@infra/scripts/db-backup.sh

restore: ## Restore a backup (BACKUP=/absolute/path/file.dump)
	@infra/scripts/db-restore.sh "$(BACKUP)"

clean: ## Remove stopped containers and local build output; keep volumes/data
	@infra/scripts/compose.sh rm --force --stop
	@find apps packages shared -type d \( -name dist -o -name build -o -name coverage \) -prune -exec rm -rf -- {} + 2>/dev/null || true
