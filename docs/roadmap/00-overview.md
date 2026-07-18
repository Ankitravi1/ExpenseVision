# ExpenseVision — Launch Roadmap (Overview)

**Owner:** you · **Created:** 2026-07-18 · **Launch target:** ~2026-10-05 (2.5 months / 11 weeks)

This folder is your operating plan to go from "in development" to a **public, monetized, build-in-public launch**. Read this file first, then follow the numbered docs in order. Each has concrete, dated, ≤2h/day tasks split between **You** and **Claude**.

| Doc | What it covers |
|---|---|
| `00-overview.md` | Vision, business model, how to use this folder (this file) |
| `01-productionization.md` | The technical gap between "works on my machine" and "safe for real users" |
| `02-monetization-tiers.md` | Free vs Pro vs Self-host, the feature matrix, how to gate/paywall |
| `03-infra-deploy.md` | Oracle free tier, domain, HTTPS, Docker, backups, CI/CD — step by step |
| `04-launch-timeline.md` | Week-by-week (11 weeks) with **daily 1–2h tasks** |
| `05-marketing-buildinpublic.md` | Twitter/Reddit build-in-public, waitlist, launch channels |
| `06-daily-playbook.md` | The repeatable daily/weekly checklist + how to split work with Claude |

---

## The vision (one paragraph)

ExpenseVision is a **privacy-respecting personal finance app** — track spending, budgets, and import bank statements with AI. It runs on **web and mobile with one backend**, and (later) can be **self-hosted** so power users own their data. The wedge that makes it different from every other finance app: **AI statement import that Just Works**, and an **honest privacy story** (use our hosted version, or run your own).

## Business model — freemium, inspired by Obsidian

Obsidian's model is the template: **the core app is free**, they charge for **Sync** (a hosted convenience) and offer **commercial licensing**, and the product is lovable enough that people pay to support it. Adapt that:

| Tier | Price (suggested) | Who | Gets |
|---|---|---|---|
| **Free** | $0 | Everyone | Manual tracking, budgets, reports, CSV/Excel import & export, 1 theme |
| **Pro** (hosted) | ~$4–6/mo or $39/yr | Engaged users | **AI statement import**, **AI quick-entry**, **Paper theme** (+ future themes), **bring your own AI model/key**, priority features |
| **Self-host / Offline** | one-time ~$29–49 | Privacy/power users | Run the whole stack yourself (Docker), **connect your own database**, no data leaves your machine. Sold as an **installable package — source not revealed** |

Notes that matter:
- **Self-host is sold as a packaged/installable build, not open source.** You keep the code private; buyers get a runnable artifact + license key. (This is a real decision — see `02` for how to package without shipping source.)
- **Web and mobile are the same product**; mobile ships *after* web is stable and monetized (later stage, not for the 2.5-month launch).
- The 2.5-month goal is **not "everything"** — it's **"a hosted web app, live on a domain, with a waitlist → Pro paywall, that your friends and a small public audience can use, promoted build-in-public."** Mobile, self-host packaging, and some Pro features can trail the launch.

## What "launch" means in 11 weeks (scope guardrail)

**In scope for launch:**
- Hosted web app on your own domain, HTTPS, on Oracle free tier.
- Auth, core tracking, AI import (via the platform key you fund, gated to Pro), Free vs Pro tiers with a working paywall.
- Landing page + waitlist, privacy policy + terms, basic analytics + error tracking + DB backups.
- Build-in-public presence on Twitter/X + Reddit, a Product Hunt-style launch day.

**Deliberately deferred (post-launch):**
- Mobile app store release.
- Self-host packaged product + own-DB connection (design now, sell later).
- Multi-currency, household budgets, bank-specific parsers (Phase 7 backlog).

## How to work with Claude (your model routing)

Your stated convention — bake it in:
- **Fable** → planning, roadmapping, breaking work into tasks, writing/marketing copy drafts.
- **Sonnet** → small, well-scoped code tasks (copy fixes, single-component changes, wiring an endpoint).
- **Opus** → big/important/risky tasks (auth, payments, the paywall/entitlements system, security, data migrations, the self-host packaging).

Switch models in Claude Code with `/model`. In `04` and `06` every task is tagged `[You]`, `[Claude-Fable]`, `[Claude-Sonnet]`, or `[Claude-Opus]` so you know who does it and which model to use.

## Your job vs Claude's job (the honest split)

**Only you can do:** buy the domain, create the Oracle account, get AI provider keys + fund them, set up a payment processor (Stripe/LemonSqueezy) and complete its identity/tax verification, post to Twitter/Reddit/Product Hunt from your accounts, talk to your friends/early users, and make product/pricing decisions.

**Claude does:** write and fix code, wire the paywall/entitlements, write deploy scripts and Docker/CI config, draft the landing page, privacy policy, launch posts and thread copy, generate the waitlist page, and produce/maintain these plans.

Start with `01-productionization.md`.
