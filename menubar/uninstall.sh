#!/usr/bin/env bash
# Reverses install.sh: unloads and deletes the LaunchAgent, quits the app and deletes it from ~/Applications.
set -euo pipefail

app_name="Claude Accounts"
label="com.github.ndbroadbent.claude-accounts.menubar"
installed="$HOME/Applications/$app_name.app"
agent="$HOME/Library/LaunchAgents/$label.plist"
domain="gui/$(id -u)"

fail() {
  echo "error: $*" >&2
  exit 1
}

if launchctl print "$domain/$label" >/dev/null 2>&1; then
  echo "Unloading the LaunchAgent $label..."
  launchctl bootout "$domain/$label" || fail "launchctl bootout $domain/$label failed"
fi
if [[ -e "$agent" ]]; then
  echo "Deleting $agent..."
  rm -f "$agent"
fi
if pgrep -x "$app_name" >/dev/null; then
  echo "Quitting the running $app_name..."
  pkill -x "$app_name" || fail "couldn't quit the running $app_name"
fi
if [[ -e "$installed" ]]; then
  echo "Deleting $installed..."
  rm -rf "$installed"
fi

echo "Uninstalled $app_name."
