SHELL := /usr/bin/env bash
.DEFAULT_GOAL := help

.PHONY: help test pack validate release-validate release

help: ## Show available commands
	@awk 'BEGIN {FS = ":.*## "; printf "Usage: make <target>\n\n"} /^[a-zA-Z0-9_-]+:.*## / {printf "  %-12s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

test: ## Run generator tests with Node.js 24
	@npm test

pack: ## Preview the npm package contents
	@npm run test:package

validate: ## Run all generator and template quality gates
	@tools/validate.sh

release-validate: ## Run the complete local multi-stack release gate
	@bash tools/release-validate.sh

release: ## Validate, tag, release, publish, and verify (requires CONFIRM_RELEASE=1)
	@bash tools/release-publish.sh
