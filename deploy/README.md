# Deploy

Production stack: **Postgres + backend (Node) + web (Caddy, auto-HTTPS)** via
`docker-compose.prod.yml`. Target: a single Ubuntu VM (Oracle Ampere A1 free tier).

## First deploy

```bash
# on the VM, from the project root
bash deploy/setup.sh            # installs Docker, opens 80/443 (see note below)
# log out/in so your user picks up the docker group

cp backend/.env.prod.example backend/.env.prod   # fill in secrets (openssl rand -hex 32)
cat > .env <<'EOF'              # root env used by compose
POSTGRES_USER=expensevision
POSTGRES_PASSWORD=<strong-random>
POSTGRES_DB=expensevision
SITE_ADDRESS=your-domain.example
# VITE_GOOGLE_CLIENT_ID=...     # only if using Google login
EOF

docker compose -f docker-compose.prod.yml up -d --build
```

Point your domain's A/AAAA records at the VM's public IP first — Caddy needs it
to issue the TLS cert. On Oracle you must **also** open 80/443 in the VCN
Security List/NSG, not just the host firewall.

## Migrations

The backend container runs `prisma migrate deploy` on start. Until the first
migration exists, edit `backend/Dockerfile`'s `CMD` to use `prisma db push`
(see the comment there), or create the initial migration locally:
`cd backend && npx prisma migrate dev --name init`.

## Backups

Wire up the nightly dump (see `deploy/backup.sh` header for the cron line) and
**test a restore at least once**. Configure an off-site copy in that script.

## Updating

```bash
git pull
docker compose -f docker-compose.prod.yml up -d --build
```
