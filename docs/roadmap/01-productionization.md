# 01 — Productionization: the gap to "safe for real users"

Everything that must be true before strangers (not just you) can use ExpenseVision without you getting burned. Grouped by theme; each item tagged with who does it. Do the **🔴 blockers** before any public access, **🟡 soon** before promoting widely, **🟢 nice** when convenient.

## 1. Secrets & configuration

- 🔴 `[You]` Generate strong production secrets: `JWT_SECRET`, `AI_SETTINGS_SECRET` (32+ random bytes each). Never reuse dev values.
- 🔴 `[Claude-Sonnet]` Audit that the backend **fails fast** if required env vars are missing, and that all secrets come from env (no hardcoded fallbacks). `JWT_SECRET` already does this; confirm `AI_SETTINGS_SECRET` too.
- 🟡 `[Claude-Sonnet]` Move the hardcoded superadmin email to an env var (`SUPERADMIN_EMAIL`) with the current value as the default, so you can change it without a code edit. (Currently hardcoded in `backend/src/routes/admin.ts` — do not change the value without deciding.)
- 🟡 `[You]` Keep a private, backed-up copy of the production `.env` files (they're git-ignored). Losing `AI_SETTINGS_SECRET` makes every stored AI key undecryptable.

## 2. Security hardening

- 🔴 `[Claude-Opus]` Add **rate limiting** to auth endpoints (login, signup, forgot-password, parse-*) — protects against brute force and AI-cost abuse. (`express-rate-limit`.)
- 🔴 `[Claude-Opus]` Add **abuse/cost guard on AI endpoints** for platform-key users (per-user daily/monthly cap). Without this, one user can run up your AI bill. (Ties into `02` Pro gating.)
- 🟡 `[Claude-Sonnet]` Security headers (`helmet`), CORS locked to your domain(s), body-size limits on upload/parse routes.
- 🟡 `[Claude-Opus]` Run `/security-review` on the whole backend before launch; fix findings. (Phase 5.1 already closed IDOR/concurrency holes — re-verify nothing regressed.)
- 🟢 `[Claude-Sonnet]` Validate/limit the size and type of uploaded statement files server-side, not just client-side.

## 3. Reliability & data safety

- 🔴 `[Claude-Sonnet]` **Automated PostgreSQL backups** — daily `pg_dump` to a second location (Oracle object storage or another disk). A Docker volume can be wiped; backups are non-negotiable once real users exist. (Script + cron; see `03`.)
- 🔴 `[You]` Test a **restore** from backup at least once. A backup you haven't restored is a hope, not a backup.
- 🟡 `[Claude-Sonnet]` Graceful error boundaries on the web app (a crashed component shouldn't white-screen the whole app).
- 🟡 `[Claude-Sonnet]` Finish the **Float → Decimal money migration** (already in progress in your working tree — it's causing the 2 `auth.ts` typecheck errors). Money should never be floating point. `[Claude-Opus]` if the migration touches balance math broadly.

## 4. Observability

- 🟡 `[You + Claude-Sonnet]` **Error tracking**: add Sentry (free tier) to web + backend. You create the account; Claude wires the SDK.
- 🟡 `[You + Claude-Sonnet]` **Product analytics**: PostHog or Plausible (privacy-friendly, free tiers) — track signups, activation (first transaction / first import), Pro conversion. You create the account; Claude adds events.
- 🟢 `[Claude-Sonnet]` Basic uptime check (UptimeRobot free) pinging `/health`. Add a `/health` route if missing.

## 5. Legal & trust (required to charge money and hold data)

- 🔴 `[You + Claude-Fable]` **Privacy Policy** and **Terms of Service** pages. Claude drafts from a template; you review and put your real entity/contact. You hold users' financial data — this is not optional.
- 🔴 `[You]` Replace the **placeholder support/donation links** and `support@expensevision.com` (flagged in the UX audit, Settings #9) with real ones, or remove them.
- 🟡 `[You]` Decide your legal entity for payments (sole proprietor is fine to start; the payment processor will ask).
- 🟢 `[Claude-Fable]` A short, honest **privacy explainer** on the landing page ("your data lives in our EU/US Postgres; self-host coming for full control").

## 6. Product gaps that block a good first impression

- 🔴 `[Claude-Sonnet]` Finish the **AI platform-key flow** end-to-end (mostly done Phase 8.1): after you run `prisma generate` + restart, verify admin can save a platform key and a free-tier test user gets AI import via it. Then **gate AI import/quick-entry to Pro** (`02`).
- 🟡 `[Claude-Sonnet]` Work through the **high-priority UX audit items** (`docs/web-ux-audit.md`): "Carry Over" triple-label confusion, "Frozen" account wording, Reports density. First-time users bounce on confusion.
- 🟡 `[Claude-Sonnet]` A real **onboarding empty-state** for a brand-new account (no accounts/transactions yet) that points to "add your first account" → "add or import transactions". The tour helps; the empty states should reinforce it.
- 🟢 `[Claude-Sonnet]` Password strength meter + "stay logged in" (UX audit, Login #1–2).

## Definition of "production-ready" (checklist)

- [ ] Strong secrets in prod env; backend fails fast without them.
- [ ] Rate limiting + AI cost cap live.
- [ ] Daily DB backups running **and a restore tested**.
- [ ] Error tracking + analytics reporting.
- [ ] Privacy Policy + ToS published; placeholder links gone.
- [ ] `/security-review` findings resolved.
- [ ] AI platform key working; Pro gating enforced server-side.
- [ ] HTTPS on your domain (`03`).
