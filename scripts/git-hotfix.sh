#!/usr/bin/env bash
set -euo pipefail

# ─── git-hotfix: start / finish hotfix branches ───
# Usage:
#   ./scripts/git-hotfix.sh start <name>   — create hotfix/<name> from main
#   ./scripts/git-hotfix.sh finish [name]  — build-check, merge into main + develop

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
  local name="${1:?Usage: git-hotfix start <name>}"
  local branch="hotfix/${name}"

  git rev-parse --verify "$branch" &>/dev/null && fail "Branch '$branch' already exists"

  info "Switching to main and pulling latest..."
  git checkout main
  git pull origin main

  info "Creating branch ${CYAN}${branch}${NC}..."
  git checkout -b "$branch"
  git push -u origin "$branch"

  ok "Hotfix branch ready. Fix the bug!"
  echo ""
  echo -e "  When done:  ${YELLOW}npm run hotfix:finish${NC}"
}

# ── FINISH ──
cmd_finish() {
  local branch="${1:-$(current_branch)}"
  [[ "$branch" == hotfix/* ]] || branch="hotfix/${branch}"

  git rev-parse --verify "$branch" &>/dev/null || fail "Branch '$branch' not found"

  if [[ "$(current_branch)" != "$branch" ]]; then
    info "Checking out $branch..."
    git checkout "$branch"
  fi

  # Pre-merge build check
  info "Running build check..."
  if ! npm run build; then
    fail "Build failed — fix errors before finishing hotfix"
  fi
  ok "Build passed"

  # Merge into main
  info "Merging into main..."
  git checkout main
  git pull origin main
  git merge "$branch" --no-ff -m "Hotfix: merge ${branch} into main"
  git push origin main
  ok "Merged into main (Cloudflare will auto-deploy)"

  # Merge into develop so it stays in sync
  info "Merging into develop..."
  git checkout develop
  git pull origin develop
  git merge "$branch" --no-ff -m "Hotfix: merge ${branch} into develop"
  git push origin develop
  ok "Merged into develop"

  # Cleanup
  echo ""
  read -rp "$(echo -e "${YELLOW}Delete hotfix branch locally & remotely? [y/N]${NC} ")" answer
  if [[ "$answer" =~ ^[Yy]$ ]]; then
    git branch -d "$branch"
    git push origin --delete "$branch" 2>/dev/null || warn "Remote branch already deleted"
    ok "Branch $branch deleted"
  fi

  git checkout main
  ok "Hotfix complete! Production updated."
}

# ── DISPATCH ──
case "${1:-}" in
  start)  shift; cmd_start "$@" ;;
  finish) shift; cmd_finish "$@" ;;
  *)
    echo "Usage: git-hotfix <start|finish> [name]"
    echo ""
    echo "  start <name>   Create hotfix/<name> from main"
    echo "  finish [name]  Build-check + merge into main & develop"
    exit 1
    ;;
esac
