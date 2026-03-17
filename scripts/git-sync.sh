#!/usr/bin/env bash
set -euo pipefail

# ─── git-sync: pull latest on main + develop, prune stale remotes ───

RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m'

info()  { echo -e "${CYAN}→${NC} $*"; }
ok()    { echo -e "${GREEN}✓${NC} $*"; }
fail()  { echo -e "${RED}✗${NC} $*" >&2; exit 1; }

ORIGINAL_BRANCH="$(git rev-parse --abbrev-ref HEAD)"

# Ensure clean working tree
if [[ -n "$(git status --porcelain)" ]]; then
  fail "Working tree is dirty — commit or stash first"
fi

info "Fetching all remotes + pruning stale refs..."
git fetch --all --prune

info "Updating main..."
git checkout main
git pull origin main
ok "main up to date"

info "Updating develop..."
git checkout develop
git pull origin develop
ok "develop up to date"

# Return to original branch
git checkout "$ORIGINAL_BRANCH"

echo ""
echo -e "${GREEN}✓ Synced!${NC} main and develop are up to date."

# Show divergence
BEHIND_MAIN=$(git rev-list --count main..develop 2>/dev/null || echo 0)
if [[ "$BEHIND_MAIN" -gt 0 ]]; then
  echo -e "  develop is ${CYAN}${BEHIND_MAIN}${NC} commit(s) ahead of main"
fi
