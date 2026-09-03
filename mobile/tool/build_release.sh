#!/usr/bin/env bash
# Build the Play Store artifact, with every flag that must not be forgotten.
#
# Why a script rather than a documented command: a store build needs the right
# signing key AND four --dart-define values, and each one fails differently and
# late. A missing API URL ships an app pointing at localhost. A missing server
# client ID makes Google sign-in complete and then hand back nothing usable. And
# the wrong signing key cannot be undone at all once Play has accepted it.
#
#   bash tool/build_release.sh            # app bundle (.aab) for Play
#   bash tool/build_release.sh --apk      # also a universal APK for sideloading
#
# Overridable, but correct by default:
#   DRIFT_API_BASE_URL, DRIFT_GOOGLE_SERVER_CLIENT_ID, DRIFT_SUPPORT_EMAIL
set -euo pipefail

cd "$(dirname "$0")/.."

API_BASE_URL="${DRIFT_API_BASE_URL:-https://drift.einsbrand.com/api}"
SUPPORT_EMAIL="${DRIFT_SUPPORT_EMAIL:-drift@einsbrand.com}"
# Public by design — it ships inside every build and can be read out of any APK.
# The Web ("server") client is what makes google_sign_in return an ID token on
# Android; the backend can verify nothing without it. docs/SOCIAL_SIGNIN_SETUP.md
GOOGLE_SERVER_CLIENT_ID="${DRIFT_GOOGLE_SERVER_CLIENT_ID:-921637855690-mpmeootgo8lnh4qh2k8eggfjfcr5q7ks.apps.googleusercontent.com}"

# Selects key.release.properties -> release-2026.keystore, alias drift-release.
# Without this the build falls back to key.properties, which points at the
# preview key; build.gradle.kts refuses that for a release task rather than
# letting Play bind the app to the wrong key permanently.
export DRIFT_ANDROID_KEY_PROPERTIES="${DRIFT_ANDROID_KEY_PROPERTIES:-key.release.properties}"

if [ ! -f "android/${DRIFT_ANDROID_KEY_PROPERTIES}" ]; then
  echo "Missing android/${DRIFT_ANDROID_KEY_PROPERTIES} — the release signing" >&2
  echo "credentials are machine-local and gitignored. See docs/SOCIAL_SIGNIN_SETUP.md." >&2
  exit 1
fi

# DRIFT_DEV_ACCESS/DRIFT_DEV_REFRESH seed a live session at splash to skip
# onboarding during QA. In a store build that is an authentication bypass
# shipped to the public, so refuse rather than quietly carry them through.
if [ -n "${DRIFT_DEV_ACCESS:-}${DRIFT_DEV_REFRESH:-}" ]; then
  echo "DRIFT_DEV_ACCESS/DRIFT_DEV_REFRESH are set. They seed a session at" >&2
  echo "startup and must never be present in a release build. Unset them." >&2
  exit 1
fi

DEFINES=(
  "--dart-define=DRIFT_API_BASE_URL=${API_BASE_URL}"
  "--dart-define=DRIFT_GOOGLE_SERVER_CLIENT_ID=${GOOGLE_SERVER_CLIENT_ID}"
  "--dart-define=DRIFT_SUPPORT_EMAIL=${SUPPORT_EMAIL}"
)

# Apple sign-in on Android falls back to a web flow, so unlike iOS it needs
# build-time values. Until the Developer Program exists these stay unset and the
# button reports "not available" — the intended state, not a bug. Tracker 4.5.
if [ -n "${DRIFT_APPLE_SERVICES_ID:-}" ] && [ -n "${DRIFT_APPLE_REDIRECT_URI:-}" ]; then
  DEFINES+=("--dart-define=DRIFT_APPLE_SERVICES_ID=${DRIFT_APPLE_SERVICES_ID}")
  DEFINES+=("--dart-define=DRIFT_APPLE_REDIRECT_URI=${DRIFT_APPLE_REDIRECT_URI}")
else
  echo "note: Apple sign-in not configured for Android; its button will report" >&2
  echo "      \"not available\". Expected until tracker 4.5 closes." >&2
fi

echo "API base URL     ${API_BASE_URL}"
echo "Support email    ${SUPPORT_EMAIL}"
echo "Signing profile  android/${DRIFT_ANDROID_KEY_PROPERTIES}"
echo

flutter build appbundle --release "${DEFINES[@]}"
echo "bundle: build/app/outputs/bundle/release/app-release.aab"

if [ "${1:-}" = "--apk" ]; then
  flutter build apk --release "${DEFINES[@]}"
  echo "apk:    build/app/outputs/flutter-apk/app-release.apk"
fi

# Verify what actually signed it rather than trusting the flags above. The
# fingerprint must match the release key recorded in docs/SOCIAL_SIGNIN_SETUP.md
# (B1:FF:6E:D1:BE:0F:19:1D:36:CA:18:D5:98:DD:86:5F:3C:46:CE:BF); anything else
# means the wrong keystore was picked up and the artifact must not be uploaded.
echo
echo "Confirm the signer before uploading:"
echo "  keytool -printcert -jarfile build/app/outputs/bundle/release/app-release.aab"
