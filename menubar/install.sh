#!/usr/bin/env bash
# Builds the app, copies it to ~/Applications and starts it now and at every login with a LaunchAgent.
# uninstall.sh reverses this.
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
app_name="Claude Accounts"
label="com.github.ndbroadbent.claude-accounts.menubar"
applications="$HOME/Applications"
installed="$applications/$app_name.app"
executable="$installed/Contents/MacOS/$app_name"
agents="$HOME/Library/LaunchAgents"
agent="$agents/$label.plist"
domain="gui/$(id -u)"

fail() {
  echo "error: $*" >&2
  exit 1
}

xml_escape() {
  local s="$1"
  s="${s//&/&amp;}"
  s="${s//</&lt;}"
  s="${s//>/&gt;}"
  printf '%s' "$s"
}

"$here/build.sh" || fail "build.sh failed"

# Stop the running copy before replacing it.
if launchctl print "$domain/$label" >/dev/null 2>&1; then
  echo "Stopping the LaunchAgent $label..."
  launchctl bootout "$domain/$label" || fail "launchctl bootout $domain/$label failed"
fi
if pgrep -x "$app_name" >/dev/null; then
  echo "Quitting the running $app_name..."
  pkill -x "$app_name" || fail "couldn't quit the running $app_name"
fi

echo "Copying the app to $installed..."
mkdir -p "$applications"
rm -rf "$installed"
ditto "$here/build/$app_name.app" "$installed" || fail "couldn't copy the app to $installed"
[[ -x "$executable" ]] || fail "no executable at $executable"

echo "Writing $agent..."
mkdir -p "$agents"
cat > "$agent" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>$label</string>
  <key>ProgramArguments</key>
  <array>
    <string>$(xml_escape "$executable")</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <false/>
  <key>LimitLoadToSessionType</key>
  <string>Aqua</string>
  <key>ProcessType</key>
  <string>Interactive</string>
</dict>
</plist>
PLIST
plutil -lint "$agent" >/dev/null || fail "the LaunchAgent plist isn't valid: $agent"

echo "Loading it..."
launchctl bootstrap "$domain" "$agent" || fail "launchctl bootstrap $domain $agent failed"

echo "Installed $installed; it starts at login. Run $here/uninstall.sh to remove it."
