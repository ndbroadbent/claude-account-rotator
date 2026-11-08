#!/usr/bin/env bash
# Renders every fixture in dev/fixtures, light and dark, to PNGs in the directory given (default build/renders),
# plus the unreachable state. Nothing is shown on screen.
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
out="${1:-$here/build/renders}"
binary="${CLAUDE_ACCOUNTS_BINARY:-$here/.build/debug/ClaudeAccounts}"

if [[ ! -x "$binary" ]]; then
  (cd "$here" && swift build) || { echo "error: swift build failed" >&2; exit 1; }
fi
mkdir -p "$out"

for fixture in "$here"/dev/fixtures/*.json; do
  name="$(basename "$fixture" .json)"
  for appearance in light dark; do
    "$binary" --render "$out/$name-$appearance.png" --state "$fixture" --appearance "$appearance"
  done
done

# The unreachable state: point at a directory with no socket in it.
empty="$(mktemp -d)"
trap 'rm -rf "$empty"' EXIT
for appearance in light dark; do
  CLAUDE_ACCOUNT_ROTATOR_DIR="$empty" "$binary" --render "$out/unreachable-$appearance.png" --appearance "$appearance"
done
