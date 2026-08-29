#!/usr/bin/env bash
# Reliable "push latest code to the emulator" for the redesign work.
#
# Why not `flutter run`: this session can't send keystrokes to a backgrounded
# `flutter run`, so hot reload is unavailable, and leftover flutter_tools
# processes kept contending for the device and serving a stale APK. This
# builds a fresh debug APK and force-installs it.
#
#   bash tool/dev_run.sh          # build + install + launch
#   bash tool/dev_run.sh --clean  # also wipe .dart_tool/build first
set -euo pipefail

ADB="${ADB:-$HOME/AppData/Local/Android/Sdk/platform-tools/adb.exe}"
DEVICE="${DEVICE:-emulator-5554}"
PKG=com.drift.tennis.drift_tennis
APK=build/app/outputs/flutter-apk/app-debug.apk

cd "$(dirname "$0")/.."

# kill stray flutter/dart tooling so it can't re-push a stale build
powershell -NoProfile -Command \
  "Get-Process dart,dartaotruntime -ErrorAction SilentlyContinue | Stop-Process -Force" \
  2>/dev/null || true

if [[ "${1:-}" == "--clean" ]]; then
  flutter clean
  rm -rf .dart_tool build
  flutter pub get
fi

flutter build apk --debug
# uninstall first: a `-r` reinstall needs room for both copies and the AVD
# runs out of /data space (INSTALL_FAILED_INSUFFICIENT_STORAGE) after a while.
"$ADB" -s "$DEVICE" shell pm trim-caches 999999999999 || true
"$ADB" -s "$DEVICE" uninstall "$PKG" || true
"$ADB" -s "$DEVICE" install --abi x86_64 -r -d "$APK"
"$ADB" -s "$DEVICE" shell am start -n "$PKG/.MainActivity"
echo "installed + launched on $DEVICE"
