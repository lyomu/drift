#!/usr/bin/env bash
set -euo pipefail

# Product-scoped provisioning for the shared box (46.225.106.43), per
# SHARED_BOX_ADD_PRODUCT_RUNBOOK.md §4. Unlike the old dedicated-box version
# of this script, it does NOT install Docker/nginx/certbot/UFW or create a
# swapfile — that box-wide baseline (and the box's own 2GB swap) already
# exists and is shared with RetailFlow and harusi-ke; re-running a
# from-scratch bootstrap here would step on their live setup. This script
# only creates Drift's own confined slice of it.

if [ "$(id -u)" -ne 0 ]; then
  echo "Run this script as root." >&2
  exit 1
fi

PRODUCT_DIR=/srv/drift
DEPLOY_USER=drift-deploy

if ! id "${DEPLOY_USER}" >/dev/null 2>&1; then
  adduser --disabled-password --gecos '' "${DEPLOY_USER}"
fi
usermod -aG docker "${DEPLOY_USER}"

mkdir -p "${PRODUCT_DIR}/prod"
chown -R "${DEPLOY_USER}:${DEPLOY_USER}" "${PRODUCT_DIR}"
chmod 750 "${PRODUCT_DIR}"

cat >/etc/sudoers.d/drift-deploy <<'SUDOERS'
drift-deploy ALL=(root) NOPASSWD: /usr/sbin/nginx -t, /usr/sbin/nginx -s reload
SUDOERS
chmod 440 /etc/sudoers.d/drift-deploy

echo "Drift provisioning complete. Verify isolation before trusting it:"
echo "  sudo -u deploy ls ${PRODUCT_DIR}            # must fail: Permission denied"
echo "  sudo -u ${DEPLOY_USER} ls /srv/harusi-ke     # must fail: Permission denied"
echo "Add the drift-deploy-key public half to /home/${DEPLOY_USER}/.ssh/authorized_keys before non-root deploys."
