#!/usr/bin/env bash
#
# Nightly Postgres backup for the Drift Tennis deployment.
#
# Installed on the box at /usr/local/sbin/drift-backup.sh and driven by
# /etc/cron.d/drift-backup. Kept in the repo so the procedure is reviewable and
# reproducible rather than living only on one server.
#
#   drift-backup.sh                 # take a backup, prune old ones
#   VERIFY=1 drift-backup.sh        # also restore into a scratch DB and check
#
# Custom format (-Fc) rather than plain SQL: it is compressed, and pg_restore
# can read it selectively, which matters when you are restoring one table at
# 3am rather than the whole database.
#
# OFFSITE: syncs to a Hetzner Storage Box over SSH-key auth once
# STORAGE_BOX_HOST/STORAGE_BOX_USER are set (see the OFFSITE section below) —
# until then the local dump still happens but nothing leaves this disk.
set -euo pipefail

CONTAINER="${CONTAINER:-drift-postgres}"
DB_USER="${DB_USER:-drift}"
DB_NAME="${DB_NAME:-drift_tennis}"
BACKUP_DIR="${BACKUP_DIR:-/srv/drift/backups}"
RETAIN_DAYS="${RETAIN_DAYS:-14}"
VERIFY="${VERIFY:-0}"

stamp() { date -u +%Y%m%dT%H%M%SZ; }
log() { echo "[$(date -u +%FT%TZ)] $*"; }

mkdir -p "$BACKUP_DIR"

TS="$(stamp)"
OUT="${BACKUP_DIR}/${DB_NAME}-${TS}.dump"

log "starting backup of ${DB_NAME} -> ${OUT}"

# Stream the dump out of the container so it never occupies container-local
# disk. Failure anywhere in the pipe must fail the script, hence pipefail above.
docker exec "$CONTAINER" pg_dump -U "$DB_USER" -d "$DB_NAME" -Fc --no-owner \
  > "${OUT}.partial"

# Only promote to the real name once the dump completed. A half-written file
# with a valid name is the classic way a backup silently becomes useless.
mv "${OUT}.partial" "$OUT"
chmod 600 "$OUT"

SIZE="$(du -h "$OUT" | cut -f1)"
log "backup complete: ${OUT} (${SIZE})"

# A dump that pg_restore cannot even list is not a backup. This is cheap and
# catches truncation immediately.
if ! docker exec -i "$CONTAINER" pg_restore --list < "$OUT" > /dev/null 2>&1; then
  log "FATAL: ${OUT} is not a readable pg_restore archive"
  exit 1
fi
log "archive readable by pg_restore"

# ---------------------------------------------------------------- verify
# Full rehearsal: restore into a scratch database and compare table counts
# against the live one. Never touches ${DB_NAME}.
if [ "$VERIFY" = "1" ]; then
  SCRATCH="restore_check_${TS,,}"
  log "verify: restoring into scratch database ${SCRATCH}"

  docker exec "$CONTAINER" psql -U "$DB_USER" -d postgres -q \
    -c "DROP DATABASE IF EXISTS ${SCRATCH};" \
    -c "CREATE DATABASE ${SCRATCH};"

  docker exec -i "$CONTAINER" pg_restore -U "$DB_USER" -d "$SCRATCH" \
    --no-owner --exit-on-error < "$OUT"

  live_tables=$(docker exec "$CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -t -A \
    -c "select count(*) from information_schema.tables where table_schema='public';")
  rest_tables=$(docker exec "$CONTAINER" psql -U "$DB_USER" -d "$SCRATCH" -t -A \
    -c "select count(*) from information_schema.tables where table_schema='public';")
  live_users=$(docker exec "$CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -t -A \
    -c "select count(*) from users;")
  rest_users=$(docker exec "$CONTAINER" psql -U "$DB_USER" -d "$SCRATCH" -t -A \
    -c "select count(*) from users;")

  log "verify: tables live=${live_tables} restored=${rest_tables}"
  log "verify: users  live=${live_users} restored=${rest_users}"

  docker exec "$CONTAINER" psql -U "$DB_USER" -d postgres -q \
    -c "DROP DATABASE ${SCRATCH};"

  if [ "$live_tables" != "$rest_tables" ] || [ "$live_users" != "$rest_users" ]; then
    log "FATAL: restored database does not match live counts"
    exit 1
  fi
  log "verify: PASSED — scratch database dropped"
fi

# ---------------------------------------------------------------- prune
DELETED=$(find "$BACKUP_DIR" -name "${DB_NAME}-*.dump" -mtime "+${RETAIN_DAYS}" -print -delete | wc -l)
log "pruned ${DELETED} backup(s) older than ${RETAIN_DAYS} days"
find "$BACKUP_DIR" -name '*.partial' -mmin +120 -delete 2>/dev/null || true

log "done. ${BACKUP_DIR} now holds $(find "$BACKUP_DIR" -name "${DB_NAME}-*.dump" | wc -l) backup(s)."

# ---------------------------------------------------------------- OFFSITE
# Hetzner Storage Box, over SSH key auth — no password ever touches disk.
# A dedicated ed25519 key was generated at /root/.ssh/drift-storagebox
# specifically for this (never the box's main login key), so it can be
# revoked from the Storage Box's own key list without touching SSH access
# to the server itself.
#
# STORAGE_BOX_HOST is unset until the box exists and the key above has been
# added to it in the Hetzner console — until then this step is skipped
# rather than failing the whole backup run.
STORAGE_BOX_HOST="${STORAGE_BOX_HOST:-}"   # e.g. u123456.your-storagebox.de
STORAGE_BOX_USER="${STORAGE_BOX_USER:-}"   # e.g. u123456
STORAGE_BOX_KEY="${STORAGE_BOX_KEY:-/root/.ssh/drift-storagebox}"

if [ -n "$STORAGE_BOX_HOST" ] && [ -n "$STORAGE_BOX_USER" ]; then
  log "offsite: syncing ${BACKUP_DIR} -> ${STORAGE_BOX_USER}@${STORAGE_BOX_HOST}:drift/"
  if rsync -az --delete -e "ssh -i ${STORAGE_BOX_KEY} -o StrictHostKeyChecking=accept-new -p 23" \
      "${BACKUP_DIR}/" "${STORAGE_BOX_USER}@${STORAGE_BOX_HOST}:drift/"; then
    log "offsite: sync complete"
  else
    # Non-fatal: the local backup this run just made and verified is still
    # good. A failed offsite hop should not be reported as "no backup exists".
    log "OFFSITE SYNC FAILED — local backup is fine, offsite copy is stale"
  fi
else
  log "offsite: STORAGE_BOX_HOST/STORAGE_BOX_USER not set — skipping (see script header)"
fi
