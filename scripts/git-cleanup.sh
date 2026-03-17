#!/usr/bin/env bash
set -euo pipefail

# ─── git-cleanup: delete merged feature/hotfix branches ───

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

info()  { echo -e "${CYAN}→${NC} $*"; }
ok()    { echo -e "${GREEN}✓${NC} $*"; }
warn()  { echo -e "${YELLOW}!${NC} $*"; }

info "Fetching and pruning..."
git fetch --all --prune

# Find local branches merged into develop (excluding main/develop themselves)
MERGED=$(git branch --merged develop | grep -E '^\s+(feature|hotfix)/' | sed 's/^[* ]*//' || true)

if [[ -z "$MERGED" ]]; then
  ok "No merged branches to clean up"
  exit 0
fi

echo -e "${CYAN}Merged branches found:${NC}"
echo "$MERGED" | sed 's/^/  /'
echo ""

read -rp "$(echo -e "${YELLOW}Delete these branches locally & remotely? [y/N]${NC} ")" answer
if [[ ! "$answer" =~ ^[Yy]$ ]]; then
  echo "Aborted."
  exit 0
fi

while IFS= read -r branch; do
  [[ -z "$branch" ]] && continue
  info "Deleting $branch..."
  git branch -d "$branch" 2>/dev/null || warn "Could not delete local $branch"
  git push origin --delete "$branch" 2>/dev/null || warn "Remote $branch already gone"
done <<< "$MERGED"

ok "Cleanup complete!"
