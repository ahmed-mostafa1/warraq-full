#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DIST_DIR="$REPO_ROOT/frontend/dist"
PUBLIC_DIR="$REPO_ROOT/backend/public"

if [[ ! -d "$DIST_DIR" ]]; then
  echo "dist folder not found. Run npm run build:prod first." >&2
  exit 1
fi

if [[ ! -d "$PUBLIC_DIR" ]]; then
  echo "Laravel public directory not found at $PUBLIC_DIR" >&2
  exit 1
fi

# Items we must NOT delete from public/
PROTECTED=("index.php" ".htaccess" "uploads" "api")

should_skip() {
  local name="$1"
  for protected in "${PROTECTED[@]}"; do
    if [[ "$name" == "$protected" ]]; then
      return 0
    fi
  done
  return 1
}

echo "Cleaning existing public assets (excluding index.php, .htaccess, uploads, api)..."
shopt -s dotglob
for item in "$PUBLIC_DIR"/*; do
  name="$(basename "$item")"
  if should_skip "$name"; then
    continue
  fi
  rm -rf "$item"
done
shopt -u dotglob

# Ensure uploads exists (future-proof)
mkdir -p "$PUBLIC_DIR/uploads"

echo "Copying dist assets to public..."
cp -R "$DIST_DIR"/. "$PUBLIC_DIR/"

echo "Copy completed."
