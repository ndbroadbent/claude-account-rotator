#!/usr/bin/env bash
# Reverses install.sh: unloads and deletes the LaunchAgent, quits the app and deletes it from /Applications (and
# from ~/Applications, where versions before 0.6.5 installed it).
set -euo pipefail

app_name="Claude Accounts"
label="com.github.ndbroadbent.claude-accounts.menubar"
bundle_id="com.github.ndbroadbent.claude-accounts"
agent="$HOME/Library/LaunchAgents/$label.plist"
domain="gui/$(id -u)"

fail() {
  echo "error: $*" >&2
  exit 1
}

# Asks the running app to quit, by its bundle ID (never by process name), and waits for it to go.
quit_app() {
  osascript -e "application id \"$bundle_id\" is running" 2>/dev/null | grep -qx true || return 0
  echo "Quitting the running $app_name..."
  osascript -e "tell application id \"$bundle_id\" to quit" >/dev/null || fail "couldn't quit the running $app_name"
  for _ in $(seq 1 50); do
    osascript -e "application id \"$bundle_id\" is running" 2>/dev/null | grep -qx true || return 0
    sleep 0.1
  done
  fail "$app_name didn't quit"
}

if launchctl print "$domain/$label" >/dev/null 2>&1; then
  echo "Unloading the LaunchAgent $label..."
  launchctl bootout "$domain/$label" || fail "launchctl bootout $domain/$label failed"
fi
if [[ -e "$agent" ]]; then
  echo "Deleting $agent..."
  rm -f "$agent"
fi
quit_app
for installed in "/Applications/$app_name.app" "$HOME/Applications/$app_name.app"; do
  if [[ -e "$installed" ]]; then
    echo "Deleting $installed..."
    rm -rf "$installed"
  fi
done

echo "Uninstalled $app_name."
