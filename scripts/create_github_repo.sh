#!/usr/bin/env bash
set -euo pipefail

# Usage: ./scripts/create_github_repo.sh <github-username-or-org> <repo-name>
# Example: ./scripts/create_github_repo.sh kirill team8

if [ "$#" -lt 2 ]; then
  echo "Usage: $0 <github-user-or-org> <repo-name>"
  exit 2
fi

OWNER="$1"
REPO="$2"

if ! command -v gh >/dev/null 2>&1; then
  echo "gh (GitHub CLI) not found. Install from https://cli.github.com/ and authenticate with 'gh auth login'"
  exit 3
fi

# Ensure we're in repository root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT_DIR"

# Ensure git repo exists
if [ ! -d .git ]; then
  echo "Initializing git repository"
  git init
fi

# Ensure there's a main branch
if ! git rev-parse --verify main >/dev/null 2>&1; then
  # create main branch from current HEAD (or empty commit)
  if git rev-parse --verify HEAD >/dev/null 2>&1; then
    git checkout -b main
  else
    git checkout --orphan main
    git rm -rf . >/dev/null 2>&1 || true
    git clean -fdx || true
    git commit --allow-empty -m "chore: initial commit"
  fi
fi

# Add all files and commit if needed
git add -A
if ! git diff --cached --quiet; then
  git commit -m "chore: initial commit"
fi

# Create repo (private) and add remote
FULL_NAME="$OWNER/$REPO"
if gh repo view "$FULL_NAME" >/dev/null 2>&1; then
  echo "Repository $FULL_NAME already exists on GitHub. Adding/setting remote 'origin'."
  gh repo clone "$FULL_NAME" -- --no-checkout 2>/dev/null || true
  git remote remove origin 2>/dev/null || true
  git remote add origin "https://github.com/$FULL_NAME.git"
else
  echo "Creating private repository $FULL_NAME on GitHub"
  gh repo create "$FULL_NAME" --private --source=. --remote=origin --push
fi

# Push main branch
git push -u origin main

echo "Private repository created and pushed: https://github.com/$FULL_NAME"
