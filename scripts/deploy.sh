#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/srv/drift/app}"
REPO_URL="${REPO_URL:-https://github.com/lyomu/drift.git}"
BRANCH="${BRANCH:-master}"

if [ ! -f "${APP_DIR}/.env.production" ]; then
  echo "Missing ${APP_DIR}/.env.production. Create it from docs/DEPLOYMENT.md before deploying." >&2
  exit 1
fi

if [ ! -d "${APP_DIR}/.git" ]; then
  mkdir -p "${APP_DIR}"
  git clone --branch "${BRANCH}" "${REPO_URL}" "${APP_DIR}"
fi

cd "${APP_DIR}"
git fetch origin "${BRANCH}"
git checkout "${BRANCH}"
git pull --ff-only origin "${BRANCH}"

docker compose -f docker-compose.prod.yml --env-file .env.production build
docker compose -f docker-compose.prod.yml --env-file .env.production run --rm api npx prisma migrate deploy
docker compose -f docker-compose.prod.yml --env-file .env.production up -d
docker compose -f docker-compose.prod.yml --env-file .env.production ps

