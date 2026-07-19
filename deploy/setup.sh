#!/usr/bin/env bash
# One-time server bootstrap for a fresh Ubuntu VM (e.g. Oracle Ampere A1).
# Run as a sudo-capable user:  bash deploy/setup.sh
set -euo pipefail

echo "==> Updating packages"
sudo apt-get update -y && sudo apt-get upgrade -y

echo "==> Installing Docker Engine + Compose plugin"
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sudo sh
fi
sudo usermod -aG docker "$USER" || true

echo "==> Firewall: allow SSH + HTTP + HTTPS only"
if command -v ufw >/dev/null 2>&1; then
  sudo ufw allow OpenSSH || sudo ufw allow 22/tcp
  sudo ufw allow 80/tcp
  sudo ufw allow 443/tcp
  sudo ufw --force enable
fi

# NOTE: On Oracle Cloud you ALSO must open 80/443 in the VCN Security List /
# Network Security Group — the host firewall alone is not enough.

echo
echo "Done. Log out and back in (for docker group), then:"
echo "  1) cp backend/.env.prod.example backend/.env.prod   # fill in secrets"
echo "  2) create a root .env with POSTGRES_*, SITE_ADDRESS, VITE_GOOGLE_CLIENT_ID"
echo "  3) docker compose -f docker-compose.prod.yml up -d --build"
