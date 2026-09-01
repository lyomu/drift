#!/usr/bin/env bash
set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
  echo "Run this script as root." >&2
  exit 1
fi

PRODUCT_DIR=/srv/drift
DEPLOY_USER=drift-deploy

apt-get update
apt-get install -y ca-certificates curl gnupg nginx apache2-utils ufw unattended-upgrades snapd

if ! command -v docker >/dev/null 2>&1; then
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
    | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg
  . /etc/os-release
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu ${VERSION_CODENAME} stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi

if [ ! -f /swapfile ]; then
  fallocate -l 4G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

snap install core || true
snap refresh core || true
if ! snap list certbot >/dev/null 2>&1; then
  snap install --classic certbot
fi
ln -sf /snap/bin/certbot /usr/bin/certbot

if ! id "${DEPLOY_USER}" >/dev/null 2>&1; then
  adduser --disabled-password --gecos '' "${DEPLOY_USER}"
fi
usermod -aG docker "${DEPLOY_USER}"

mkdir -p "${PRODUCT_DIR}" /var/www/certbot
chown -R "${DEPLOY_USER}:${DEPLOY_USER}" "${PRODUCT_DIR}"

cat >/etc/sudoers.d/drift-deploy <<'SUDOERS'
drift-deploy ALL=(root) NOPASSWD: /usr/sbin/nginx -t, /usr/sbin/nginx -s reload
SUDOERS
chmod 440 /etc/sudoers.d/drift-deploy

ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

systemctl enable --now nginx docker unattended-upgrades

echo "Provisioning complete. Add the deploy SSH key to /home/${DEPLOY_USER}/.ssh/authorized_keys before non-root deploys."

