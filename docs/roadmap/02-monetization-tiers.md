# 02 — Monetization: Free / Pro / Self-host

How the tiers work, the feature matrix, and how to actually enforce them in code.

## Feature matrix

| Feature | Free | Pro (hosted) | Self-host (one-time) |
|---|:--:|:--:|:--:|
| Manual transactions, accounts, budgets, categories | ✅ | ✅ | ✅ |
| Reports & charts | ✅ | ✅ | ✅ |
| CSV / Excel **import & export** (no AI) | ✅ | ✅ | ✅ |
| Recurring transactions | ✅ | ✅ | ✅ |
| Light / Dark theme | ✅ | ✅ | ✅ |
| **AI statement import** (PDF/Excel/CSV/OCR) | — | ✅ | ✅ (own key) |
| **AI quick-entry** (plain-English) | — | ✅ | ✅ (own key) |
| **Paper theme** (+ future premium themes) | — | ✅ | ✅ |
| **Bring your own AI model/key** | — | ✅ | ✅ |
| **Connect your own database** | — | — | ✅ |
| Runs fully offline / your infra | — | — | ✅ |
| Priority support | — | ✅ | — |

**Rule of thumb:** Free is a genuinely useful tracker (so people stay and tell friends). Pro sells **AI + polish + control**. Self-host sells **ownership**.

## Pricing (suggested starting point — you decide)

- **Pro:** $4.99/mo or $39/yr (annual discount nudges commitment). Launch with an **early-adopter lifetime or 50%-off deal** for waitlist + first users — great for build-in-public.
- **Self-host / Offline:** one-time $29–49, includes 1 year of updates. (Obsidian charges ~$25 one-time for commercial-use license; a self-host build can command more.)
- Keep a **7-day Pro trial** or a small free monthly AI-import quota so free users *taste* the wedge feature.

## How to enforce tiers (entitlements)

This is a **`[Claude-Opus]`** job — payments + gating is the riskiest code.

1. **Add a `plan` concept to `User`** (`free` | `pro`), plus `planExpiresAt`. A single source of truth in the DB.
2. **Server-side gate, always.** Never trust the client for entitlement. The AI routes (`parse-text`, `parse-statement`) already funnel through `resolveAiForUser` — add a check there: *platform key is only usable by `pro` users*; free users get a friendly "Upgrade to Pro for AI import" (this is a legitimate, non-internal message, distinct from the generic "temporarily unavailable"). Own-key users on self-host bypass this.
3. **Client reflects, doesn't decide.** Show upgrade CTAs where Pro features live (AI import button, Paper theme, own-key toggle). The server is the enforcer.
4. **Paper theme gating:** the theme toggle already cycles light→dark→paper; gate "paper" behind `pro` with an upgrade prompt.
5. **Feature flags:** a tiny `entitlements.ts` helper (`canUseAi(user)`, `canUseTheme(user, theme)`) keeps checks consistent and testable.

## Payment processor — pick one

- **LemonSqueezy** (recommended to start): merchant-of-record, handles **global sales tax/VAT for you**, simple subscriptions + one-time, easy webhooks. Less paperwork than Stripe for a solo dev.
- **Stripe:** more control/lower fees, but you handle tax (or add Stripe Tax) and more setup.

Flow (either): checkout → webhook to your backend → set `user.plan = 'pro'`, `planExpiresAt`. `[You]` create the account + products + verify identity/tax; `[Claude-Opus]` wires the webhook + entitlement update + a "Manage subscription" link.

## Self-host / Offline — how to sell without revealing source

You want a **paid, installable package, source not exposed**. Options (design now, build post-launch):

1. **Docker image + license key (recommended).** Ship a prebuilt image (backend + web already-built static bundle) to a private registry; buyers `docker compose up` with a license key that the app validates on start (offline-friendly grace period). Source stays in your private repo; buyers get compiled/bundled artifacts only. This matches "just host or install the app."
2. **Signed desktop bundle** (Electron/Tauri wrapping the web app + a bundled Postgres/SQLite) for true one-machine offline. Heavier; do later.
3. **Own-DB connection** for self-host: a settings field for the user's database URL (encrypted), validated against SSRF. This is the BYODB idea, scoped to *self-host only* where the privacy story is real. (See main `plan.md` Phase 8.2/8.3 — Mongo is skipped; SQLite/Postgres only.)

**Honesty caveat to keep in your messaging:** hosted Pro = we hold your data (encrypted, backed up). Self-host = you hold it. Don't claim "zero-knowledge" for hosted — it isn't.

## Launch monetization sequence

1. Launch **Free + waitlist**, AI import **on via platform key** but **capped** (so you can afford it) and marked "Pro preview."
2. Turn on **Pro checkout** ~1–2 weeks post-launch once you've seen activation.
3. Announce **Self-host** as "coming" to gauge demand; build it after Pro is proven.
