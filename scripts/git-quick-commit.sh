#!/usr/bin/env bash
set -euo pipefail

# ─── git-quick-commit: stage all, build-check, commit, push ───
# Usage:
#   ./scripts/git-quick-commit.sh "commit message"
#   ./scripts/git-quick-commit.sh              — auto-generates message from diff

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

info()  { echo -e "${CYAN}→${NC} $*"; }
ok()    { echo -e "${GREEN}✓${NC} $*"; }
fail()  { echo -e "${RED}✗${NC} $*" >&2; exit 1; }

BRANCH="$(git rev-parse --abbrev-ref HEAD)"

# Ensure we're on a feature/hotfix branch
if [[ "$BRANCH" == "main" || "$BRANCH" == "develop" ]]; then
  fail "Don't commit directly on $BRANCH — create a feature branch first: npm run feature:start <name>"
fi

# Check for changes
if [[ -z "$(git status --porcelain)" ]]; then
  fail "Nothing to commit"
fi

# Show what's changing
echo -e "${CYAN}Changes:${NC}"
git status --short | sed 's/^/  /'
echo ""

# Build check
info "Running build check..."
if ! npm run build; then
  fail "Build failed — fix errors before committing"
fi
ok "Build passed"

# Stage
info "Staging changes..."
git add -A

# Commit message
MSG="${1:-}"
if [[ -z "$MSG" ]]; then
  # Auto-generate from changed files
  CHANGED=$(git diff --cached --name-only | head -5 | xargs -I{} basename {} | paste -sd ', ' -)
  COUNT=$(git diff --cached --name-only | wc -l | tr -d ' ')
  MSG="Update ${CHANGED}"
  if [[ "$COUNT" -gt 5 ]]; then
    MSG="${MSG} and $((COUNT - 5)) more files"
  fi
fi

git commit -m "$MSG"

info "Pushing to origin/${BRANCH}..."
git push origin "$BRANCH"

ok "Committed and pushed to ${CYAN}${BRANCH}${NC}"
