#!/usr/bin/env bash
# Regenerate a package's package-lock.json on Linux, the way CI installs it.
#
# Why: a lock file written by `npm install` on Windows can leave out
# Linux-only optional packages (@emnapi/*, @floating-ui/dom), and CI's
# `npm ci` then refuses to install. That broke backend, club-admin and
# platform-admin in October 2026. Run this after changing dependencies.
#
#   bash scripts/lockfile.sh backend
#   bash scripts/lockfile.sh club-admin platform-admin
#
# Needs Docker. Only package-lock.json is rewritten; node_modules is untouched.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
IMAGE="node:24-bookworm-slim"

if [ "$#" -eq 0 ]; then
  echo "usage: bash scripts/lockfile.sh <package-dir> [<package-dir> ...]" >&2
  exit 1
fi

for pkg in "$@"; do
  dir="$ROOT/$pkg"
  if [ ! -f "$dir/package.json" ]; then
    echo "skip $pkg: no package.json" >&2
    continue
  fi

  # Work on a copy so the container never touches the host's node_modules.
  work="$(mktemp -d)"
  cp "$dir/package.json" "$work/"
  [ -f "$dir/package-lock.json" ] && cp "$dir/package-lock.json" "$work/"

  # On Git Bash, Docker needs a Windows path for the mount and must not have
  # /w rewritten; on Linux/macOS cygpath is absent and the path is used as is.
  mount="$(cygpath -m "$work" 2>/dev/null || echo "$work")"
  MSYS_NO_PATHCONV=1 docker run --rm -v "$mount:/w" -w /w "$IMAGE" sh -c \
    "npm install --package-lock-only --ignore-scripts >/dev/null && npm ci --dry-run --ignore-scripts >/dev/null"

  cp "$work/package-lock.json" "$dir/package-lock.json"
  rm -rf "$work"
  echo "$pkg: package-lock.json regenerated and verified with npm ci on Linux"
done
