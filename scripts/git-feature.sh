#!/usr/bin/env bash
set -euo pipefail

# ─── git-feature: start / finish / list feature branches ───
# Usage:
#   ./scripts/git-feature.sh start <name>   — create feature/<name> from develop
#   ./scripts/git-feature.sh finish [name]  — merge current (or named) feature into develop
#   ./scripts/git-feature.sh list           — show open feature branches

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

info()  { echo -e "${CYAN}→${NC} $*"; }
ok()    { echo -e "${GREEN}✓${NC} $*"; }
warn()  { echo -e "${YELLOW}!${NC} $*"; }
fail()  { echo -e "${RED}✗${NC} $*" >&2; exit 1; }

current_branch() { git rev-parse --abbrev-ref HEAD; }

# ── START ──
cmd_start() {
  local name="${1:?Usage: git-feature start <name>}"
  local branch="feature/${name}"

  git rev-parse --verify "$branch" &>/dev/null && fail "Branch '$branch' already exists"

  info "Switching to develop and pulling latest..."
  git checkout develop
  git pull origin develop

  info "Creating branch ${CYAN}${branch}${NC}..."
  git checkout -b "$branch"
  git push -u origin "$branch"

  ok "Feature branch ready. Happy coding!"
  echo ""
  echo -e "  When done:  ${YELLOW}npm run feature:finish${NC}"
}

# ── FINISH ──
cmd_finish() {
  local branch="${1:-$(current_branch)}"

  # If bare name given, prefix it
  [[ "$branch" == feature/* ]] || branch="feature/${branch}"

  git rev-parse --verify "$branch" &>/dev/null || fail "Branch '$branch' not found"

  # Make sure we're on the feature branch to run checks
  if [[ "$(current_branch)" != "$branch" ]]; then
    info "Checking out $branch..."
    git checkout "$branch"
  fi

  # Pre-merge build check
  info "Running build check..."
  if ! npm run build; then
    fail "Build failed — fix errors before finishing feature"
  fi
  ok "Build passed"

  info "Switching to develop and pulling latest..."
  git checkout develop
  git pull origin develop

  info "Merging ${CYAN}${branch}${NC} into develop..."
  git merge "$branch" --no-ff -m "Merge ${branch} into develop"

  info "Pushing develop..."
  git push origin develop

  # Ask about cleanup
  echo ""
  read -rp "$(echo -e "${YELLOW}Delete feature branch locally & remotely? [y/N]${NC} ")" answer
  if [[ "$answer" =~ ^[Yy]$ ]]; then
    git branch -d "$branch"
    git push origin --delete "$branch" 2>/dev/null || warn "Remote branch already deleted"
    ok "Branch $branch deleted"
  else
    info "Kept branch $branch"
  fi

  ok "Feature merged into develop!"
}

# ── LIST ──
cmd_list() {
  echo -e "${CYAN}Local feature branches:${NC}"
  git branch --list 'feature/*' | sed 's/^/  /'

  echo ""
  echo -e "${CYAN}Remote feature branches:${NC}"
  git branch -r --list 'origin/feature/*' | sed 's/^/  /'
}

# ── DISPATCH ──
case "${1:-}" in
  start)  shift; cmd_start "$@" ;;
  finish) shift; cmd_finish "$@" ;;
  list)   cmd_list ;;
  *)
    echo "Usage: git-feature <start|finish|list> [name]"
    echo ""
    echo "  start <name>   Create feature/<name> from latest develop"
    echo "  finish [name]  Build-check + merge into develop (default: current branch)"
    echo "  list           Show open feature branches"
    exit 1
    ;;
esac
