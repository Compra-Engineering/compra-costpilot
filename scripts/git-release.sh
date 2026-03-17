#!/usr/bin/env bash
set -euo pipefail

# ─── git-release: merge develop → main for production deploy ───
# Usage:
#   ./scripts/git-release.sh [tag]   — optional version tag like v1.2.0

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

info()  { echo -e "${CYAN}→${NC} $*"; }
ok()    { echo -e "${GREEN}✓${NC} $*"; }
fail()  { echo -e "${RED}✗${NC} $*" >&2; exit 1; }

TAG="${1:-}"

# Ensure clean working tree
if [[ -n "$(git status --porcelain)" ]]; then
  fail "Working tree is dirty — commit or stash changes first"
fi

# Build check on develop
info "Checking out develop and pulling latest..."
git checkout develop
git pull origin develop

info "Running build check on develop..."
if ! npm run build; then
  fail "Build failed on develop — fix before releasing"
fi
ok "Build passed"

# Show what will be released
echo ""
echo -e "${CYAN}Commits to release:${NC}"
git log main..develop --oneline --no-merges | sed 's/^/  /'
echo ""

read -rp "$(echo -e "${YELLOW}Proceed with release? [y/N]${NC} ")" answer
[[ "$answer" =~ ^[Yy]$ ]] || { echo "Aborted."; exit 0; }

# Merge into main
info "Merging develop into main..."
git checkout main
git pull origin main
git merge develop --no-ff -m "Release: merge develop into main"

# Tag if provided
if [[ -n "$TAG" ]]; then
  info "Tagging ${CYAN}${TAG}${NC}..."
  git tag -a "$TAG" -m "Release ${TAG}"
fi

# Push
info "Pushing main..."
git push origin main
if [[ -n "$TAG" ]]; then
  git push origin "$TAG"
  ok "Tagged and pushed ${TAG}"
fi

ok "Released to production! Cloudflare will auto-deploy."
echo ""
echo -e "  ${CYAN}main${NC} is now up to date with ${CYAN}develop${NC}"
