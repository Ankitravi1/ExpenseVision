# 04 — 11-Week Launch Timeline (daily, 1–2h/day)

**Start:** Mon 2026-07-21 · **Public launch:** week 11 (~2026-10-03) · **Buffer:** to 2026-10-05

How to read this: each week has a **theme + goal**, then daily tasks. Tags: `[You]` = only you can do it · `[F]` Claude-Fable (plan/copy) · `[S]` Claude-Sonnet (small code) · `[O]` Claude-Opus (big/risky code). Weekends are light/optional catch-up. If a day slips, push it — the weeks are ordered by dependency, not rigid dates.

> **This week's immediate unblock (do first, ~10 min):** stop the backend → `cd backend && npx prisma generate && npx prisma db push` → restart. This makes the Phase 8.1 platform-AI admin save work.

---

## Week 1 (Jul 21–25) — Stabilize & set up accounts
**Goal:** code is green, key accounts exist, launch decisions made.

- **Mon** — `[You]` Unblock Prisma (above), verify admin can save a platform AI key end-to-end. `[You]` Decide pricing from `02` (write your numbers down).
- **Tue** — `[O]` Finish the Float→Decimal money migration (fixes the 2 `auth.ts` typecheck errors); verify balances still compute.
- **Wed** — `[You]` Buy a domain; set Cloudflare DNS. `[You]` Create Oracle Cloud account + Ampere A1 Ubuntu VM.
- **Thu** — `[S]` Work UX audit high-priority batch #1: "Frozen"→"Paused" wording + explainer, Accounts "so far"→"all-time".
- **Fri** — `[S]` UX audit batch #2: Transactions "Carry Over" relabel/simplify (the triple-balance-label confusion). `[You]` Create LemonSqueezy account (start identity verification — it takes days).
- **Weekend** — `[You]` Read `01`–`03` fully; write any questions.

## Week 2 (Jul 28–Aug 1) — Get it live
**Goal:** the app is on your domain over HTTPS, with backups.

- **Mon** — `[O]` Backend Dockerfile + web build step; local `docker-compose.prod.yml` dry run.
- **Tue** — `[S]` `Caddyfile` (auto-TLS) + `setup.sh` (Docker, firewall, deploy user). `[You]` Run `setup.sh` on the VM.
- **Wed** — `[You]` Copy prod `.env` (strong secrets) to server; `docker compose up -d`. Get HTTPS working on your domain.
- **Thu** — `[O]` Switch prod to Prisma **migrations** (`migrate deploy`); create the initial migration. `[S]` `/health` route.
- **Fri** — `[S]` `backup.sh` nightly `pg_dump` → Oracle Object Storage + cron. `[You]` **Test a restore.**
- **Weekend** — `[You]` UptimeRobot on `/health`; celebrate — you're live (privately).

## Week 3 (Aug 4–8) — Entitlements & observability
**Goal:** Free vs Pro exists in code (no payment yet); you can see what users do.

- **Mon** — `[O]` Add `plan`/`planExpiresAt` to `User`; `entitlements.ts` helpers (`canUseAi`, `canUseTheme`).
- **Tue** — `[O]` Server-side gate AI routes to `pro` (free users get "Upgrade for AI import", distinct from the generic unavailable message).
- **Wed** — `[S]` Gate Paper theme + own-key toggle to Pro on the client with upgrade CTAs.
- **Thu** — `[You+S]` Add Sentry (web + backend). You make the account; Claude wires it.
- **Fri** — `[You+S]` Add PostHog/Plausible; track signup, first-transaction, first-import, upgrade-clicked.
- **Weekend** — `[You]` Set the platform AI key to a **cheap model** + a per-user daily cap value.

## Week 4 (Aug 11–15) — Payments
**Goal:** a real person can pay and become Pro (test mode).

- **Mon** — `[You]` Finish LemonSqueezy products (Pro monthly/yearly, Self-host later). Get API keys + webhook secret.
- **Tue** — `[O]` Checkout link + **webhook** → set `user.plan='pro'`, `planExpiresAt`.
- **Wed** — `[O]` "Upgrade to Pro" page/modal + "Manage subscription" link; handle cancel/expire.
- **Thu** — `[You]` End-to-end test in LemonSqueezy test mode: upgrade → AI unlocks → cancel → locks.
- **Fri** — `[S]` Early-adopter discount code/flow for waitlist + first users.
- **Weekend** — buffer.

## Week 5 (Aug 18–22) — Polish, onboarding, legal
**Goal:** a stranger's first 5 minutes are smooth and trustworthy.

- **Mon** — `[S]` New-user empty states (no accounts/transactions → clear first actions); reinforce the tour.
- **Tue** — `[S]` UX audit batch #3: Reports density (jump links/tabs), CSV button clarity, "Burn Rate"→"Daily Spending Average".
- **Wed** — `[S]` Responsive/mobile-web pass on the top 5 pages (many users visit on phones even pre-app).
- **Thu** — `[You+F]` Privacy Policy + ToS (Claude drafts, you fill entity/contact, publish). Remove placeholder support links.
- **Fri** — `[F]` Landing page rewrite: lead with the AI-import wedge + privacy story; add waitlist capture.
- **Weekend** — `[You]` Proofread everything a real user sees.

## Week 6 (Aug 25–29) — Private beta with friends
**Goal:** 5–15 real users, real feedback, real fixes.

- **Mon** — `[You]` Invite friends (personal messages > mass blast). Give them the discount + a feedback channel.
- **Tue–Thu** — `[You]` Watch them use it (PostHog + ask). `[S/O]` Fix the top 3 friction points each day.
- **Fri** — `[You+F]` Write your **first build-in-public post** (the "I built this, here's why" story). Don't post yet — draft.
- **Weekend** — `[You]` Decide: what's the ONE feature/story that makes people care? Sharpen positioning.

## Week 7 (Sep 1–5) — Build-in-public + waitlist growth
**Goal:** an audience starts existing before launch.

- **Mon** — `[You]` Post build-in-public #1 on Twitter/X; pin it. `[F]` draft a week of tweets.
- **Tue** — `[You]` Reddit: a **value post** (not an ad) in r/personalfinance-adjacent or r/selfhosted about the problem/approach.
- **Wed** — `[S]` Ship a small visible improvement + tweet the before/after (build-in-public loves progress).
- **Thu** — `[You]` DM/engage 10 relevant accounts; reply, don't broadcast.
- **Fri** — `[You+F]` Waitlist landing polish + a short demo GIF (record the AI import flow).
- **Weekend** — `[You]` Review analytics; note your activation rate.

## Week 8 (Sep 8–12) — Harden for strangers
**Goal:** it won't fall over or get abused on launch day.

- **Mon** — `[O]` Rate limiting on auth + AI routes. `[O]` AI per-user cost cap enforced.
- **Tue** — `[O]` Run `/security-review`; triage findings.
- **Wed–Thu** — `[O/S]` Fix security findings; add `helmet` + CORS lockdown + upload limits.
- **Fri** — `[You]` Full **backup → restore drill** again; load-sanity check (a few hundred transactions).
- **Weekend** — buffer / rest before the push.

## Week 9 (Sep 15–19) — Pre-launch marketing assets
**Goal:** launch-day kit ready.

- **Mon** — `[You+F]` Product Hunt assets: tagline, description, gallery images, first comment.
- **Tue** — `[You]` Record a 60–90s demo video (screen + voice). `[S]` polish any UI shown in it.
- **Wed** — `[F]` Draft the launch-day Twitter thread + Reddit posts (per-subreddit, rules-compliant).
- **Thu** — `[You]` Build an outreach list: friends, communities, small newsletters, anyone who'd share.
- **Fri** — `[You]` Line up 5–10 people to support launch morning (upvotes/comments/shares).
- **Weekend** — `[You]` Final pricing/copy review.

## Week 10 (Sep 22–26) — Soft launch
**Goal:** waitlist gets in; payments live; nothing on fire.

- **Mon** — `[You]` Open signups to the waitlist (batched). Turn on **Pro checkout** (live mode).
- **Tue–Thu** — `[You]` Monitor Sentry/analytics; `[S/O]` fix the daily top issue. Post progress build-in-public.
- **Fri** — `[You]` First **paying customer** target — celebrate + tweet it (with permission).
- **Weekend** — `[You]` Prep launch-day schedule hour by hour.

## Week 11 (Sep 29–Oct 3) — Public launch 🚀
**Goal:** launch on Product Hunt + Reddit + Twitter; be present all day.

- **Mon** — `[You]` Final checks: backups, uptime, payments, legal pages, error tracking all green.
- **Tue (launch day)** — `[You]` Product Hunt live at 00:01 PT; post the thread; Reddit posts; reply to **every** comment all day. `[S]` on standby for hotfixes.
- **Wed** — `[You]` Follow-up posts, thank supporters, share metrics. `[S/O]` fix launch feedback.
- **Thu–Fri** — `[You]` Convert interest → Pro; write a "launch retro" build-in-public post. Plan next month.
- **Buffer (Oct 5)** — slack for slippage.

---

## After launch (weeks 12+, not scheduled)
Mobile app store release · Self-host packaged build + own-DB connection · Bank-specific parsers · Multi-currency · Household budgets. Prioritize by what launch users actually ask for.
