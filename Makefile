SHELL := /usr/bin/env bash
.DEFAULT_GOAL := help

.PHONY: help test pack validate git-status feature save push sync pr pr-status pr-merge release-validate release

help: ## Show available commands
	@awk 'BEGIN {FS = ":.*## "; printf "Usage: make <target>\n\n"} /^[a-zA-Z0-9_-]+:.*## / {printf "  %-12s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

test: ## Run generator tests with Node.js 24
	@npm test

pack: ## Preview the npm package contents
	@npm run test:package

validate: ## Run all generator and template quality gates
	@tools/validate.sh

git-status: ## Fetch remote refs and show repository/branch status
	@bash tools/git-workflow.sh status

feature: ## Create feature/NAME from current origin/main (NAME=short-name)
	@bash tools/git-workflow.sh feature "$(NAME)"

save: ## Commit all changes and push (MESSAGE='type: summary')
	@bash tools/git-workflow.sh save "$(MESSAGE)"

push: ## Push the current clean feature branch
	@bash tools/git-workflow.sh push

sync: ## Merge origin/main into the current clean feature branch
	@bash tools/git-workflow.sh sync

pr: ## Push current branch and create/show its PR (TITLE='...' BODY='...')
	@bash tools/git-workflow.sh pr "$(TITLE)" "$(BODY)"

pr-status: ## Show GitHub pull-request status for this repository
	@bash tools/git-workflow.sh pr-status

pr-merge: ## Merge PR and update main (PR=123 CONFIRM_MERGE=1 METHOD=squash)
	@bash tools/git-workflow.sh pr-merge "$(PR)" "$(METHOD)"

release-validate: ## Run the complete local multi-stack release gate
	@bash tools/release-validate.sh

release: ## Validate, tag, release, publish, and verify (requires CONFIRM_RELEASE=1)
	@bash tools/release-publish.sh
