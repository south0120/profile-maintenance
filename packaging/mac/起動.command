#!/bin/bash
cd "$(dirname "$0")"
if [ "$(uname -m)" = "arm64" ]; then BIN="bin/server-arm64"; else BIN="bin/server-x64"; fi
xattr -dr com.apple.quarantine "$BIN" 2>/dev/null
chmod +x "$BIN" 2>/dev/null
exec "./$BIN"
