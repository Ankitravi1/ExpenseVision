# 03 — Infrastructure & Deployment (Oracle free tier)

Getting ExpenseVision live on your own domain, over HTTPS, for free. Step by step.

## What you have to work with

- **Oracle Cloud Free Tier** — the generous bit is the **Ampere A1 ARM instance** (up to 4 vCPU / 24 GB RAM *always free*). That's plenty for a backend + Postgres + reverse proxy. Use **one A1 VM (Ubuntu 22.04 ARM)**.
- **Domain** — a real domain (~$10/yr, e.g. Namecheap/Cloudflare) is worth it for trust. A free option (e.g. a Cloudflare-fronted subdomain, or a free `.eu.org`/dynamic-DNS) works to start but looks less credible. **Recommendation:** buy one cheap `.com`/`.app` before launch; use Cloudflare for DNS (free) + proxy.

## Target architecture (simple, one VM)

```
Internet ──HTTPS──▶ Caddy (auto-TLS, reverse proxy) ──▶ Express backend :5000
                                    └────────────────▶ static web build (dist/)
                         Docker: postgres:15  (localhost:5433, volume + backups)
```

Everything on one Oracle A1 VM, orchestrated by `docker-compose`. Caddy gives you **automatic Let's Encrypt HTTPS** with near-zero config.

## Step-by-step (each ~15–45 min)

### A. Provision (You)
1. `[You]` Create Oracle Cloud account (needs a card for identity; free tier isn't charged). Create an **Ampere A1 Ubuntu 22.04** VM. Save the SSH key.
2. `[You]` Open ports **80** and **443** in the VM's security list / firewall (and close everything else; do **not** expose Postgres 5433 publicly).
3. `[You]` Buy a domain; point an `A` record to the VM's public IP (via Cloudflare DNS). Add `app.` or use apex + `www`.

### B. Server setup (Claude drafts scripts, You run them)
4. `[Claude-Sonnet]` Provide a `setup.sh`: installs Docker + docker-compose, creates a non-root deploy user, basic `ufw` firewall (allow 22/80/443), and fail2ban.
5. `[Claude-Sonnet]` Add a production `docker-compose.prod.yml`: `postgres`, `backend` (built image), `caddy`. Plus a `Caddyfile` that TLS-terminates your domain and reverse-proxies `/api` → backend and everything else → the web static build.
6. `[Claude-Opus]` Add a **Dockerfile for the backend** (multi-stage: build TS → run) and a **web build step** (output `dist/` served by Caddy). Ensure `prisma generate` + `prisma migrate deploy` run on container start.

### C. Ship it (You + Claude)
7. `[You]` Copy production `.env` (secrets from `01`) to the server (never commit).
8. `[You]` `docker compose -f docker-compose.prod.yml up -d --build`. Visit `https://yourdomain` — you should see the app over HTTPS.
9. `[Claude-Sonnet]` Add a `/health` endpoint; point **UptimeRobot** at it.

### D. Backups & CI (do right after first deploy)
10. `[Claude-Sonnet]` `backup.sh`: nightly `pg_dump` → gzip → Oracle Object Storage (free tier) with 7–14 day retention; add to cron. `[You]` run a **test restore** once.
11. `[Claude-Sonnet]` **GitHub Actions**: on push to `main`, build images + SSH deploy (or build on server via `git pull` + compose). Keep it dead simple to start.

## Database migrations in prod

- Dev uses `prisma db push`. **Production should use migrations**: `[Claude-Opus]` create an initial migration (`prisma migrate dev --name init` locally against a scratch DB), then `prisma migrate deploy` on the server. This gives you a safe, versioned schema history — important once real data exists. (Do this before real users; `db push` on a live DB with data is risky.)

## Cost reality

- Oracle A1 + Cloudflare DNS + Let's Encrypt = **$0/mo**.
- Domain ≈ **$10/yr**.
- **AI is your real cost** — every platform-key import/parse calls a paid API. This is exactly why AI is a **Pro feature with a per-user cap** (`01`, `02`). Start with a cheap model (e.g. a small/flash model) for the platform key.

## The Windows dev gotcha you keep hitting

`prisma generate` fails with `EPERM ... query_engine-windows.dll.node` while `npm run dev` is running (the running server locks the DLL). **Fix:** stop the backend → `npx prisma generate` (and `npx prisma db push` if schema changed) → restart. This is local-only and doesn't affect Linux/Docker prod.
