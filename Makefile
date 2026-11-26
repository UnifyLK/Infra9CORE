SHELL := /usr/bin/env bash
.DEFAULT_GOAL := help

.PHONY: help test pack validate git-status feature save push sync pr pr-status pr-merge release-validate release

##@ General

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

##@ Package quality

test: ## Run generator tests with Node.js 24
	@npm test

pack: ## Preview the npm package contents
	@npm run test:package

validate: ## Run all generator and template quality gates
	@tools/validate.sh

##@ Git workflow

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

##@ Release management

release-validate: ## Run the complete local multi-stack release gate
	@bash tools/release-validate.sh

release: ## Prompt, then validate, tag, release, publish, and verify
	@package_name="$$(node -p "require('./package.json').name")"; \
	version="$$(node -p "require('./package.json').version")"; \
	if [[ "$${CONFIRM_RELEASE:-}" != "1" ]]; then \
		read -r -p "Publish $${package_name}@$${version}? Type 'publish' to continue: " confirmation; \
		[[ "$$confirmation" == "publish" ]] || { echo "Release cancelled." >&2; exit 1; }; \
	fi; \
	CONFIRM_RELEASE=1 bash tools/release-publish.sh
