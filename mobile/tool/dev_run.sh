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
PKG=app.driftsports.drift
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

# The Web ("server") client ID is what makes google_sign_in return an ID token
# on Android -- without it the flow completes and the button reports "isn't
# configured". Public by design; it ships in every build. The debug keystore's
# own Android client is registered too (docs/SOCIAL_SIGNIN_SETUP.md), so a
# debug APK can sign in against the local backend as-is.
GOOGLE_SERVER_CLIENT_ID="${DRIFT_GOOGLE_SERVER_CLIENT_ID:-921637855690-mpmeootgo8lnh4qh2k8eggfjfcr5q7ks.apps.googleusercontent.com}"

# Analytics keys are optional: with none exported the app builds and runs
# exactly as before, just uninstrumented (core/analytics/analytics.dart).
DEFINES=("--dart-define=DRIFT_GOOGLE_SERVER_CLIENT_ID=${GOOGLE_SERVER_CLIENT_ID}")
# Clarity's project ID is public (it appears in the SDK setup code), so it is
# safe to default here for the Drift Sports Mobile project.
DEFINES+=("--dart-define=DRIFT_CLARITY_PROJECT_ID=${DRIFT_CLARITY_PROJECT_ID:-yswcrvnw99}")
# PostHog's project token is write-only and meant for public clients, so it is
# safe to default here, the same way the Google client ID is.
DEFINES+=("--dart-define=DRIFT_POSTHOG_KEY=${DRIFT_POSTHOG_KEY:-phc_vuzamTmPe6cXuzoArgavhyt9rsZLjMV2NVcQimSakHfB}")
[[ -n "${DRIFT_POSTHOG_HOST:-}" ]] && DEFINES+=("--dart-define=DRIFT_POSTHOG_HOST=$DRIFT_POSTHOG_HOST")

flutter build apk --debug ${DEFINES[@]+"${DEFINES[@]}"}
# uninstall first: a `-r` reinstall needs room for both copies and the AVD
# runs out of /data space (INSTALL_FAILED_INSUFFICIENT_STORAGE) after a while.
"$ADB" -s "$DEVICE" shell pm trim-caches 999999999999 || true
"$ADB" -s "$DEVICE" uninstall "$PKG" || true
"$ADB" -s "$DEVICE" install --abi x86_64 -r -d "$APK"
"$ADB" -s "$DEVICE" shell am start -n "$PKG/.MainActivity"
echo "installed + launched on $DEVICE"
