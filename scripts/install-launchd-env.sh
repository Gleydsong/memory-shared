#!/bin/sh
set -eu

REPO_ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
LOADER="${REPO_ROOT}/scripts/load-launchd-shared-memory-env.zsh"
LABEL=com.shared-memory.env
DEST="${HOME}/Library/LaunchAgents/${LABEL}.plist"

if [ ! -f "$LOADER" ]; then
  printf 'Shared Memory launchd loader is missing: %s\n' "$LOADER" >&2
  exit 1
fi

mkdir -p "${HOME}/Library/LaunchAgents"
tmp=$(mktemp)
trap 'rm -f "$tmp"' EXIT

cat > "$tmp" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${LABEL}</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/zsh</string>
    <string>${LOADER}</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
</dict>
</plist>
EOF

install -m 600 "$tmp" "$DEST"
printf 'Installed LaunchAgent %s -> %s\n' "$LABEL" "$DEST"
printf 'Load it with: launchctl bootstrap "gui/$(id -u)" %s\n' "$DEST"
