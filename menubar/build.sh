#!/usr/bin/env bash
# Builds "build/Claude Accounts.app": a release build of the Swift package, an Info.plist with LSUIElement (no Dock
# icon) and an ad-hoc signature.
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
app_name="Claude Accounts"
bundle_id="com.github.ndbroadbent.claude-accounts"
version="0.4.0"
app="$here/build/$app_name.app"

fail() {
  echo "error: $*" >&2
  exit 1
}

command -v swift >/dev/null || fail "swift isn't on PATH: install Xcode or the Swift toolchain"
cd "$here"

echo "Building the release binary..."
swift build -c release --product ClaudeAccounts || fail "swift build failed"
bin_dir="$(swift build -c release --show-bin-path)" || fail "swift build --show-bin-path failed"
binary="$bin_dir/ClaudeAccounts"
[[ -x "$binary" ]] || fail "the build made no binary at $binary"

echo "Assembling $app..."
rm -rf "$app"
mkdir -p "$app/Contents/MacOS" "$app/Contents/Resources"
cp "$binary" "$app/Contents/MacOS/$app_name"

cat > "$app/Contents/Info.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleDevelopmentRegion</key>
  <string>en</string>
  <key>CFBundleDisplayName</key>
  <string>$app_name</string>
  <key>CFBundleExecutable</key>
  <string>$app_name</string>
  <key>CFBundleIdentifier</key>
  <string>$bundle_id</string>
  <key>CFBundleInfoDictionaryVersion</key>
  <string>6.0</string>
  <key>CFBundleName</key>
  <string>$app_name</string>
  <key>CFBundlePackageType</key>
  <string>APPL</string>
  <key>CFBundleShortVersionString</key>
  <string>$version</string>
  <key>CFBundleVersion</key>
  <string>$version</string>
  <key>LSMinimumSystemVersion</key>
  <string>14.0</string>
  <key>LSUIElement</key>
  <true/>
  <key>NSHighResolutionCapable</key>
  <true/>
</dict>
</plist>
PLIST
plutil -lint "$app/Contents/Info.plist" >/dev/null || fail "the Info.plist isn't valid"

echo "Signing (ad hoc)..."
codesign --force --sign - --identifier "$bundle_id" "$app" || fail "codesign failed"
codesign --verify --strict "$app" || fail "the signature doesn't verify"

echo "Built $app"
