#!/usr/bin/env bash
set -euo pipefail

# Shared-box deploy (46.225.106.43): pulls a pinned GHCR image rather than
# building on the box. Building here would contend for CPU/RAM with
# RetailFlow and harusi-ke's live traffic and add to this box's disk churn —
# exactly what SHARED_BOX_ADD_PRODUCT_RUNBOOK.md warns about. Used both for a
# manual break-glass deploy and as the thing the Jenkins "Deploy Prod" stage
# invokes over SSH, so there is one deploy code path, not two.

APP_DIR="${APP_DIR:-/srv/drift/prod}"
REPO_URL="${REPO_URL:-https://github.com/lyomu/drift.git}"
BRANCH="${BRANCH:-master}"

if [ -z "${DRIFT_IMAGE_TAG:-}" ]; then
  echo "DRIFT_IMAGE_TAG must be set (e.g. sha-0123456789ab from the release workflow run summary)." >&2
  echo "This box only ever runs a pinned, published image — never :local." >&2
  exit 1
fi

if [ ! -f "${APP_DIR}/.env.production" ]; then
  echo "Missing ${APP_DIR}/.env.production. Create it from docs/DEPLOYMENT.md before deploying." >&2
  exit 1
fi

# Keep this check deliberately independent of `source`: deployment config is
# data, not shell code, and a malformed value must not be able to execute on
# the production host. Compose still receives the original file below.
env_value() {
  local name="$1"
  local line key value=""

  while IFS= read -r line || [ -n "$line" ]; do
    line="${line%$'\r'}"
    [[ "$line" =~ ^[[:space:]]*# ]] && continue
    line="${line#export }"
    line="${line#export$'\t'}"
    [[ "$line" == *=* ]] || continue
    key="${line%%=*}"
    key="${key//[[:space:]]/}"
    [ "$key" = "$name" ] || continue
    value="${line#*=}"
  done < "${APP_DIR}/.env.production"

  # Treat an explicitly empty quoted value as missing too. Required values in
  # this deployment contain no meaningful leading/trailing whitespace.
  value="${value#\"}"
  value="${value%\"}"
  value="${value#\'}"
  value="${value%\'}"
  printf '%s' "$value"
}

require_env_var() {
  local name="$1"
  local value
  value="$(env_value "$name")"
  if [ -z "${value//[[:space:]]/}" ]; then
    echo "Missing or empty required variable ${name} in ${APP_DIR}/.env.production." >&2
    return 1
  fi
}

required_env_vars=(
  POSTGRES_DB
  POSTGRES_USER
  POSTGRES_PASSWORD
  PUBLIC_API_URL
  JWT_SECRET
  CORS_ALLOWED_ORIGINS
  BILLING_BETA
)

for required_env_var in "${required_env_vars[@]}"; do
  require_env_var "$required_env_var"
done

if [ ! -d "${APP_DIR}/.git" ]; then
  mkdir -p "${APP_DIR}"
  git clone --branch "${BRANCH}" "${REPO_URL}" "${APP_DIR}"
fi

cd "${APP_DIR}"
git fetch origin "${BRANCH}"
git checkout "${BRANCH}"
git pull --ff-only origin "${BRANCH}"

export DRIFT_IMAGE_TAG
docker compose -f docker-compose.prod.yml --env-file .env.production pull
docker compose -f docker-compose.prod.yml --env-file .env.production run --rm api npx prisma migrate deploy
docker compose -f docker-compose.prod.yml --env-file .env.production up -d
docker compose -f docker-compose.prod.yml --env-file .env.production ps
