#!/usr/bin/env bash
set -Eeuo pipefail

repo_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
cd "$repo_root"

die() {
  printf 'Git workflow aborted: %s\n' "$*" >&2
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || die "required command is unavailable: $1"
}

require_clean_tree() {
  [[ -z "$(git status --porcelain)" ]] || die "working tree is not clean"
}

current_branch() {
  git branch --show-current
}

require_feature_branch() {
  local branch
  branch=$(current_branch)
  [[ -n "$branch" && "$branch" != "main" ]] || die "switch to a feature branch first"
  printf '%s\n' "$branch"
}

require_github() {
  require_command gh
  gh auth status >/dev/null 2>&1 || die "GitHub CLI is not authenticated; run gh auth login"
}

usage() {
  cat <<'EOF'
Usage: tools/git-workflow.sh <command> [arguments]

Commands:
  status
  feature <name>
  save <message>
  push
  sync
  pr [title] [body]
  pr-status
  pr-merge <pr-number> [merge|rebase|squash]
EOF
}

command_name=${1:-}
case "$command_name" in
  status)
    git fetch --prune origin
    git status --short --branch
    git branch -vv
    ;;
  feature)
    name=${2:-}
    [[ "$name" =~ ^[a-z0-9][a-z0-9._-]*$ ]] || die "feature name must use lowercase letters, digits, dots, underscores, or hyphens"
    require_clean_tree
    git fetch origin main
    git switch main
    git pull --ff-only origin main
    git switch -c "feature/$name"
    ;;
  save)
    message=${2:-}
    [[ -n "$message" ]] || die "provide a commit message: make save MESSAGE='type: summary'"
    require_feature_branch >/dev/null
    git add -A
    [[ -n "$(git diff --cached --name-only)" ]] || die "no changes to commit"
    git diff --cached --check
    git commit -m "$message"
    git push -u origin "$(current_branch)"
    ;;
  push)
    branch=$(require_feature_branch)
    require_clean_tree
    git push -u origin "$branch"
    ;;
  sync)
    branch=$(require_feature_branch)
    require_clean_tree
    git fetch origin main
    git merge --no-edit origin/main
    printf 'Synchronized %s with origin/main. Push the merge with make push.\n' "$branch"
    ;;
  pr)
    branch=$(require_feature_branch)
    require_clean_tree
    require_github
    git fetch origin main
    [[ -n "$(git log origin/main..HEAD)" ]] || die "no commits ahead of origin/main"
    git push -u origin "$branch"
    if gh pr view "$branch" --json url --jq .url >/dev/null 2>&1; then
      gh pr view "$branch" --json number,title,url,state
      exit 0
    fi
    title=${2:-$(git log -1 --format=%s)}
    body=${3:-"$(git log --format='- %s' origin/main..HEAD)"}
    gh pr create --base main --head "$branch" --title "$title" --body "$body"
    ;;
  pr-status)
    require_github
    gh pr status
    ;;
  pr-merge)
    pr_number=${2:-}
    method=${3:-squash}
    [[ "$pr_number" =~ ^[0-9]+$ ]] || die "provide a pull-request number: make pr-merge PR=123"
    [[ "$method" =~ ^(merge|rebase|squash)$ ]] || die "merge method must be merge, rebase, or squash"
    [[ "${CONFIRM_MERGE:-}" == "1" ]] || die "run: make pr-merge PR=$pr_number CONFIRM_MERGE=1"
    require_clean_tree
    require_github
    gh pr merge "$pr_number" "--$method" --delete-branch
    git fetch --prune origin
    git switch main
    git pull --ff-only origin main
    ;;
  help|--help|-h|"")
    usage
    ;;
  *)
    usage >&2
    die "unknown command: $command_name"
    ;;
esac
