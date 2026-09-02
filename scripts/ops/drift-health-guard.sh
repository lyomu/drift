#!/usr/bin/env bash
#
# Application-level health check for the Drift Tennis deployment. Fills the
# gap the disk guard doesn't cover: API reachability, TLS cert expiry, and
# container health/restarts. Reuses the same alerting channel the disk guard
# already proved works — alert.sh -> Jenkins ops-alert job -> email — rather
# than standing up new infrastructure.
#
# Installed on the box at /usr/local/sbin/drift-health-guard.sh, driven by
# /etc/cron.d/drift-health-guard. Kept in the repo so it is reviewable.
set -uo pipefail

ALERT="$(dirname "$0")/alert.sh"
# alert.sh defaults to a local Jenkins at 127.0.0.1:8080, which is not where
# Jenkins runs — it's on ci.einsbrand.com, a different box. The disk guard's
# cron entry sets this explicitly; match it here so a bare invocation still
# reaches the real Jenkins instead of failing silently with HTTP 000.
export JENKINS_URL="${JENKINS_URL:-https://ci.einsbrand.com}"
API_URL="${API_URL:-https://135.181.146.130/api/health}"
CERT_NAME="${CERT_NAME:-135.181.146.130}"
CERT_WARN_DAYS="${CERT_WARN_DAYS:-2}"
HOST_LABEL="${HOST_LABEL:-Drift-Tennis-135.181.146.130}"
CONTAINERS="drift-api drift-club-admin drift-platform-admin drift-postgres drift-redis"

DATE=$(date -u +%Y%m%d-%H%M%S)
FAILURES=()

echo "[$DATE] Health guard starting..."

# --------------------------------------------------------------- API health
CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$API_URL" || echo "000")
if [ "$CODE" != "200" ]; then
  FAILURES+=("API health check returned HTTP ${CODE} (expected 200) at ${API_URL}")
  echo "FAIL: API health -> HTTP ${CODE}"
else
  echo "OK: API health -> HTTP 200"
fi

# ------------------------------------------------------------- cert expiry
# certbot already renews on its own timer with a working reload hook (see
# LAUNCH_READINESS.md #2); this is the tripwire for if that pipeline ever
# silently stops working on a cert with only ~7 days of validity to begin with.
EXPIRY_EPOCH=$(openssl s_client -connect "${CERT_NAME}:443" -servername "$CERT_NAME" \
  </dev/null 2>/dev/null | openssl x509 -noout -enddate 2>/dev/null \
  | cut -d= -f2 | xargs -I{} date -d {} +%s 2>/dev/null)
if [ -z "$EXPIRY_EPOCH" ]; then
  FAILURES+=("Could not read the TLS certificate's expiry date for ${CERT_NAME}")
  echo "FAIL: could not read cert expiry"
else
  NOW_EPOCH=$(date +%s)
  DAYS_LEFT=$(( (EXPIRY_EPOCH - NOW_EPOCH) / 86400 ))
  if [ "$DAYS_LEFT" -lt "$CERT_WARN_DAYS" ]; then
    FAILURES+=("TLS certificate for ${CERT_NAME} expires in ${DAYS_LEFT} day(s) — renewal or reload may have stopped working")
    echo "FAIL: cert expires in ${DAYS_LEFT} day(s)"
  else
    echo "OK: cert has ${DAYS_LEFT} day(s) left"
  fi
fi

# ----------------------------------------------------------- container health
for name in $CONTAINERS; do
  STATE=$(docker inspect -f '{{.State.Status}}' "$name" 2>/dev/null || echo "missing")
  RESTARTS=$(docker inspect -f '{{.RestartCount}}' "$name" 2>/dev/null || echo "0")
  if [ "$STATE" != "running" ]; then
    FAILURES+=("Container ${name} is '${STATE}', expected 'running'")
    echo "FAIL: ${name} -> ${STATE}"
  elif [ "$RESTARTS" -gt 0 ]; then
    # Not fatal on its own — Docker restart policies recover transient
    # crashes — but a restart happened and is worth a human's attention.
    FAILURES+=("Container ${name} has restarted ${RESTARTS} time(s) since it was created")
    echo "NOTE: ${name} restart count = ${RESTARTS}"
  else
    echo "OK: ${name} running, 0 restarts"
  fi
done

# ------------------------------------------------------------------- report
if [ "${#FAILURES[@]}" -gt 0 ]; then
  LIST=""
  for f in "${FAILURES[@]}"; do
    LIST="${LIST}- ${f}
"
  done
  BODY="Health check on ${HOST_LABEL} found ${#FAILURES[@]} issue(s):

${LIST}
Run 'docker ps' and 'docker logs <container>' on the box to investigate."
  echo "ALERT: ${#FAILURES[@]} issue(s) found"
  "$ALERT" "[drift] Health check found ${#FAILURES[@]} issue(s)" "$BODY" || true
else
  echo "OK: all checks passed"
fi

echo "[$DATE] Health guard done."
