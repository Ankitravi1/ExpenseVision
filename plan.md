# ExpenseVision — Project Roadmap

## Overview

ExpenseVision is a personal finance monorepo with three interconnected apps sharing one backend API:
- **Backend**: Express + Prisma + PostgreSQL (TypeScript ESM)
- **Web**: React 19 + Vite + Tailwind CSS
- **Mobile**: Expo React Native

This document tracks what has been built, what is in progress, and what is planned — with reasons why.

---

## ✅ Phase 1 — Foundation & Core Feature Set

*Goal: Get a working, beautiful expense tracker live across web and mobile.*

### 1.1 Backend API (Completed)
- Express REST API with TypeScript ESM + tsx for development
- Prisma ORM with SQLite (later migrated to PostgreSQL in Phase 3.4)
- Full CRUD for: Transactions, Accounts, Categories, Budgets, Recurring Rules
- JWT authentication (access token 15 min + refresh token 30 days)
- Atomic balance mutations inside `prisma.$transaction`
- Zod input validation; standardized `{ error: string }` error format

### 1.2 Auth & Onboarding (Completed)
- Email/password signup with optional SMTP email verification (auto-verified when SMTP not set)
- Google OAuth login
- Multi-stage onboarding: name → country/currency → first account
- Password reset via email token
- Profile photo stored as URL or base64

### 1.3 Web App — Core UI (Completed)
- React 19 + Vite + Tailwind CSS (PostCSS, not CDN)
- React Router v6 SPA routing
- Global state via `AppContext` (auth, theme, accounts, categories, transactions, budgets)
- Pages: Dashboard, All Transactions, Accounts, Budgets, Recurring, Reports, Settings

### 1.4 Mobile App — Core UI (Completed)
- Expo SDK 52 with React Navigation drawer + bottom tabs
- Screens: Dashboard, Transactions, Accounts, Budgets, Reports, Settings, Notifications
- Shared backend URL via `src/config.ts` (emulator vs physical device auto-detect)
- Tokens stored in `expo-secure-store`

---

## ✅ Phase 2 — Advanced UI/UX & Feature Parity

*Goal: Make the app production-quality with smart date navigation, dark mode, and premium design.*

### 2.1 Dashboard (Completed)
- Monthly summary cards: Total Expense (rose), Total Income (emerald), Balance (blue)
- Expense Distribution pie chart with Recharts
- Category breakdown list
- Month slider on left, date range badge on right
- Date badge label: "Showing transaction date from DD-MM-YYYY to DD-MM-YYYY"

### 2.2 All Transactions Page — Full Redesign (Completed)
- **Date Range Selector** with view modes: Daily / Weekly / Monthly / 3-Month / Yearly / Custom
- Left/right chevrons [◀][View▼][▶] shift the active period forward/backward
- Default Monthly: 1st of month → last of month (not till today)
- Manual date input auto-switches view to Custom
- Native `<input type="date">` with `colorScheme` style + global CSS to remove duplicate calendar icons
- Table columns in order: Checkbox, Date, Note, Amount, Account, Type, Category, Transfer To, Actions
- **Amount Range Popover**: Expense/Income toggle + Limit field, auto-applies instantly
- **Bulk actions**: Select all, bulk delete, Deselect (amber/yellow) button
- Stats cards with dashboard-inspired gradients (light + dark mode tinted)
- Balance always blue (`text-primary dark:text-indigo-400`) in both Net and Carry Over states
- Filter button highlighted with primary color; stats/filter grouped left, date badge right
- Carry Over checkbox + Import button grouped right

### 2.3 Reports Page (Completed)
- Mirror of Transactions date controls + period shift arrows
- Expense/Income/Balance stat cards (same gradients)
- Carry Over checkbox repositioned right (before Export/Import buttons)
- Export CSV (emerald) and Import Data (indigo) with matching button shape
- Dashboard-style category pie chart (Recharts, `innerRadius=90, outerRadius=140`) with center overlay text
- Collapsible AI Insights: Daily Burn Rate (amber), Top Category (indigo), Savings Rate (emerald), Unbudgeted (rose)

### 2.4 Accounts Page (Completed)
- Predefined account type gradients (Savings=teal, Credit=rose, Cash=emerald, Investment=indigo, Loan=amber)
- Transaction history modal: click row → opens edit modal
- Stats: Expense so far (rose), Income so far (emerald), Combined Balance (blue)
- Modal header background distinct from scrollable list

### 2.5 Budgets Page (Completed)
- Status filter tabs: All Budgets / Over Budget / Near Limit / On Track
- Month navigator header text fixed for dark mode (`dark:text-gray-100`)

### 2.6 Recurring Transactions Page (Completed)
- "New Rule" button highlighted with primary color
- Form header text fixed for dark mode
- Prominent Cancel Edit button (rose color) next to Update Rule in the edit form

### 2.7 Dark Mode Contrast & Readability (Completed)
- Native date pickers: `style={{ colorScheme: theme }}` on all inputs
- Global CSS override to remove Chrome's duplicate calendar icon
- High-contrast text on all filter boxes, view selectors, table headers
- Budget period navigator readable in dark mode

---

## ✅ Phase 3 — AI Integration, Import Pipeline & Admin

*Goal: Add intelligent import features and platform administration.*

### 3.1 AI Settings (Completed)
- Per-user AI configuration: provider (DeepSeek, OpenAI, Gemini, OpenRouter, custom), model, API keys
- API keys encrypted at rest with AES-256-GCM using `AI_SETTINGS_SECRET`
- Multiple keys per provider (stored as arrays)
- Custom providers with OpenAI-compatible base URLs
- Custom model names per provider
- Test connection button

### 3.2 Split AI Toggles (Completed)
- **AI Statement Imports** toggle: enables PDF/CSV/Excel/OCR image parsing
- **AI Transaction Auto-Parsing** toggle: enables natural language quick entry
- Each toggle stored as a proper `Boolean` column (`importEnabled`, `autoParseEnabled`) on the `AiSettings` model — independent, no cross-talk on refresh
- Backend enforces each toggle independently at the endpoint level

### 3.3 Unified Import Pipeline (Completed)
- Single upload zone accepting: `.csv`, `.xlsx`, `.xls`, `.pdf`, `.png/.jpg/.webp`, `.txt`
- CSV/Excel with matching template columns → parsed client-side (no AI needed)
- CSV/Excel with shuffled columns → AI column remapping via `/api/transactions/parse-statement`
- PDF → PDF.js text extraction → AI parsing
- PDF password-protected → prompted for password (up to 3 attempts)
- Receipt images → Tesseract.js OCR → AI parsing
- Pasted text → AI parsing
- Preview grid with duplicate detection badges (⚠️ Duplicate), duplicates unchecked by default
- Early client-side check: if AI Statement Imports is disabled or no key configured, shows clear error before attempting backend call

### 3.4 PostgreSQL Migration (Completed)
- Database migrated from SQLite to PostgreSQL on Docker (`localhost:5433`)
- All SQLite files removed (`prisma/dev.db`, `migrate_note.ts`, old SQLite migration folder)
- `prisma db push` used for schema sync (no migration history file needed in dev)
- All users migrated from SQLite to Postgres

### 3.5 Authentication Backend Enhancements (Completed)
- 2FA foundation (secret field in schema)
- Expo push token endpoint (`POST /api/profile/expo-token`)
- Web push notifications (VAPID) with `Notification` model
- AI Settings backend with encryption/decryption

### 3.6 Admin Panel (Completed)
- **Single superadmin**: Only `ankitravione@gmail.com` is protected superadmin; all others demoted to user
- **Reset Password**: Admin can reset any non-superadmin user's password (min 8 chars, re-confirm)
- **Delete User**: Permanently deletes user + all their data (accounts, transactions, budgets, categories)
- **Google/Manual badge**: Each user row shows how they signed up
- **Protected**: Superadmin row shows "Protected" — cannot be deleted or modified via the panel

### 3.7 Notifications (Completed)
- `Notification` model in Prisma
- `NotificationCenter` component (bell icon with unread badge, popover list)
- Individual Mark Read / Clear actions
- Mobile `NotificationsScreen` with same actions
- Backend sends notifications when recurring rules fire, budgets are near limit

---

## ✅ Phase 4 — Mobile Feature Parity (Completed)

*Goal: Bring web-level quality and features to the Expo mobile app.*

### 4.1 Reports Screen (Completed)
- Full period navigation (Daily/Weekly/Monthly/3-Month/Yearly/Custom) with carry-over toggle
- Expense + Income category donuts, money calendar heatmap, daily flow chart, accounts summary
- Daily Burn Rate / Top Category / Savings Rate / Unbudgeted insight tiles, CSV export via share sheet

### 4.2 Push Notifications on Mobile (Completed)
- `expo-notifications` integrated
- Push token registered to backend
- Foreground notification handler set
- Guarded against running in Expo Go (requires dev build or physical device)
- Tap-to-navigate (budget/recurring/transaction keyword routing) + pull-to-refresh

### 4.3 Mobile AI Settings (Completed)
- Multiple API keys per provider, reveal/delete individual keys, custom model addition
- Split AI toggles (Statement Imports vs Auto-Parsing) matching web

### 4.4 Advanced Date Navigator on Mobile (Completed)
- Period shift arrows [◀][Monthly▼][▶] plus 3-Month and Custom view modes on Transactions
- End-of-range transactions no longer dropped (date compares fixed to ignore time component)

### 4.5 Bulk Actions on Mobile (Completed)
- Long-press selection mode, select-all, floating action bar, bulk delete on Transactions
- Amount range filter and "apply filters to stats" toggle

### 4.6 Account Gradient Cards on Mobile (Completed)
- Predefined account type gradients ported from web; account type list aligned with web's
- Tap-to-edit from account history

### 4.7 Accounts / Budgets / Dashboard / Recurring / Admin Parity (Completed)
- Budgets: status filter tabs (All/Over/Near Limit/On Track) + overall progress card
- Dashboard: month navigation, % change vs previous month, accounts summary
- Recurring: pause/resume, run-now, execution history expander, end-date display
- Admin: password reset, signup-method badge, superadmin protection

### 4.8 Mobile Core Services Hardening (Completed)
- Single-flight token refresh (was causing random forced logouts under concurrent 401s)
- Production API URL via `EXPO_PUBLIC_API_URL`
- iOS date/time pickers no longer close mid-scroll
- Session restore fetches/refreshes the cached user instead of trusting a stale copy

---

## ✅ Phase 5 — Full Audit, Account Freeze & Import/Export Redesign (Completed)

*Goal: Full UI/UX/functionality audit of web + mobile, fix what's broken, and rebuild import/export as a dedicated flow.*

### 5.1 Backend Security & Correctness Audit Fixes (Completed)
- Closed two IDOR holes: bulk transaction import (mass assignment + unscoped account lookups) and recurring-rule create/update could mutate another user's account balances via forged ids
- Recurring rule materialization: optimistic-lock claim prevents double-firing when two devices load `/initial-data` concurrently; a past `startDate` on edit no longer re-fires historical occurrences
- Balance mutations converted from read-then-write (lost-update risk under concurrency) to atomic `increment`/`decrement` on create, update, and bulk
- Transfers now require a destination account at the schema level (previously could debit the source and credit nothing)
- Date-range filters use an exclusive next-day bound so same-day timestamped transactions aren't dropped
- `reset-password` enforces the 8-char minimum; `forgot-password` returns a generic response regardless of whether the email exists
- Refresh-token reuse (a revoked token presented again) now revokes the user's entire token family

### 5.2 Web Frontend Audit Fixes (Completed)
- Icon registry: 13 icons used across the app were missing and silently rendered a fallback glyph (reveal/eye, loader spinners, run-now, etc.)
- Responsive navigation: sidebar becomes a hamburger-triggered overlay drawer below the `lg` breakpoint (previously unusable on phone-width viewports)
- Import duplicate detection was comparing a date-only string against a date+time string and never matched; the import modal also didn't reset state after a successful import, allowing accidental re-import
- Local-date parsing fixes UTC off-by-one bugs in period navigation on Reports and Transactions; 3-Month view corrected to span exactly 3 calendar months
- Bulk-delete selection now clears when filters/period change (previously could delete rows no longer visible)
- Context data-mutators (`addTransaction`, `updateAccount`, `addRecurring`, etc.) now return `Promise<boolean>` so forms only clear on confirmed success
- ~45 invalid Tailwind color-shade classes (silently produced no CSS) corrected across Reports, Transactions, Budgets, Recurring, Accounts, Settings, Admin
- Rules-of-Hooks violations fixed in Profile/Settings/AddCategoryModal; various dark-mode contrast and empty-state gaps closed

### 5.3 Mobile Audit Fixes (Completed)
- Token-refresh race: concurrent 401s each rotated the single-use refresh token, randomly forcing logout — now single-flighted
- End-of-range transactions were dropped in Transactions/Reports due to the same date-only-vs-timestamp comparison bug as web
- iOS date/time pickers closed after the first scroll tick; session restore now fetches/refreshes the cached user instead of trusting a stale copy
- Settings' CSV import pointed at a non-existent backend route and called an undefined method — removed and replaced by the new Import/Export screen

### 5.4 Account Freeze / Disable (Completed)
- `Account.frozen` boolean; freezing pauses the account everywhere money moves — new/updated transactions, bulk import, and recurring rules (create, update, run-now, auto-materialization) are all blocked or skipped against a frozen account, while historical data and edits to already-existing transactions are untouched
- Web + mobile: freeze via confirm, unfreeze in one tap; frozen accounts get a badge, are hidden from the main list behind a "Show frozen" toggle, and are excluded from balance totals and from account pickers in New Transaction / Recurring (with a labeled exception so editing a rule/transaction already pointing at a newly-frozen account doesn't blank the field)

### 5.5 Dedicated Import / Export Page (Completed)
- Replaces the import/export UI previously scattered across Settings, Transactions, and Reports with one page (`/import-export` on web, a drawer screen on mobile), Import section first by default
- **Import** (6-step wizard): file/paste → text extraction (CSV/XLSX/PDF w/ password retry, OCR for receipt images on web; paste-text only on mobile) → bank name + AI field-mapping guidance (Expense=Debit, Income=Credit, Category=AI-decided, Note=summary, Date=date, Time=AI-extracted or defaults to 12:00) → AI-structured preview → editable, filterable preview table (Excel-style inline edit, not yet committed to real transactions) → optional duplicate detection (date+amount match) with multi-select delete from the preview → commit to real transactions via bulk import
- **Export**: Transactions-style period/filter/calendar/carry-forward controls over a live-filtered table, exported as CSV or Excel (PDF marked "coming soon" — no PDF library in the project yet, see 7.4)
- Transactions page's Import button and Reports' Export button now deep-link into this page instead of opening the old modal; the old `ImportTransactionsModal` component was removed as fully unreferenced

### 5.6 Account Drag-Reorder & Web Polish (Completed)
- Accounts page: press-and-hold-then-drag reordering of account cards (native pointer events, no new dependency), persisted via a new `Account.sortOrder` field + `PUT /accounts/reorder` endpoint
- Budgets "All Budgets" tab sorts by urgency (Over Budget → Near Limit → On Track) instead of insertion order
- New Transaction side panel: color-coded type toggle, tinted header, backdrop blur, anchored footer — plus a fix for an inert `hover:bg-primary-dark` class (undefined in the Tailwind config)

### 5.7 Second-Round Mobile Audit & Web↔Mobile UI Mirror (Completed)
- Mobile header reordered (Net Worth moved to the rightmost position, next to the notification bell; Reports icon removed) and Dashboard reorganized (Net Worth card removed in favor of a header pointer, a Report shortcut added to the Expense Distribution card, Recent Transactions moved below Accounts Summary) to mirror equivalent web adjustments
- Full mobile audit across every screen surfaced ~20 real issues, all fixed: a budget-cache collision when a category has both a recurring and a month-specific override, month-navigation day-overflow on Budgets, frozen-account balance figures that disagreed across Transactions/Dashboard/Accounts, Money Calendar's Income tab silently showing expense data, an AI-import gating race, duplicate detection that missed repeats within the same pasted batch, a Monday/Sunday week-definition mismatch between Reports and Import/Export, several missing pull-to-refresh/empty-states, and a handful of hardcoded colors that broke dark-mode theming

### 5.8 First-Time Onboarding Tour, Tips & Dashboard Clarity (Completed — web)

*Goal: make the app usable by people who don't know finance/technical terms.*

- **Guided product tour** (`web/context/TourContext.tsx`): a skippable, 8-step spotlight walkthrough that auto-runs once on a user's first authenticated visit and never nags again (state in `localStorage: ev_tour_completed`). Steps cover the summary cards, month switcher, New Transaction button, Import/Export, Reports, and adding an AI key. Each step can navigate to a page and highlight an element tagged `data-tour="…"`; if a target isn't found it falls back to a centered card. Replayable from **Settings → Help & Tips** and the **sidebar profile menu → Take a Tour**.
- **Tips banner** (`web/components/TipBanner.tsx`): a rotating, dismissible plain-language hint at the top of the Dashboard, with a global opt-out (**Settings → Help & Tips → Show Tips**, stored in `localStorage: ev_tips_enabled`).
- **Dashboard wording for non-experts**: the "Balance (net flow)" card renamed to **"This Month's Balance"** with an "Income minus Expenses" subtitle, and it now turns **red** when the balance is negative. The date-range badge caps the current month at *today* ("… to today (DD-MM-YYYY)") instead of showing future dates.
- **Import template restored**: the Import wizard again offers **CSV and Excel template downloads** (Excel generated on the fly via the existing SheetJS loader — no new dependency).
- `Card` now forwards arbitrary DOM props (e.g. `data-tour`) so sections can be targeted by the tour.
- **Not yet ported to mobile** — the tour/tips currently exist on web only.

---

## 📋 Phase 6 — Stability, Performance & Production Readiness

*Goal: Make the main branch a stable, deployable release.*

### 6.1 Git Branching Strategy (Priority)

**Recommended approach for stable `main`:**

```
main          ← always stable, deployable, tested
  └── dev     ← active development branch
        └── feature/xxx  ← individual feature branches
```

Steps:
1. Create a `dev` branch from current `main`
2. All new features merged into `dev` first
3. When `dev` is stable and tested → merge into `main` as a release
4. Tag releases: `git tag v1.0.0 -m "First stable release"`
5. Protect `main` on GitHub: require PR + review before merge

### 6.2 Build & Production Deployment (Planned)
- `npm run build` in web/ → static files served by Express or a CDN
- Backend deployed to a VPS / Railway / Render with env vars set
- PostgreSQL hosted (Railway Postgres, Supabase, or self-hosted)
- HTTPS via reverse proxy (nginx / Caddy)

### 6.3 Paginated Transaction API (Planned)
- Add `?page=1&limit=50` query params to `GET /api/transactions`
- **Why**: Users with 1,000+ transactions will see slow loads on current full-list fetch

### 6.4 Automated Database Backups (Planned)
- Daily `pg_dump` to a local or S3 backup
- **Why**: PostgreSQL in Docker can lose data if the volume is deleted — backups are essential for production

---

## 📋 Phase 7 — Future Enhancements

*Ideas validated by usage — not yet scheduled.*

### 7.1 AI Parser Improvements
- Pre-baked regex templates for major banks (HDFC, SBI, Chase, BOA) to handle structured statements without AI
- **Why**: Reduces AI API cost for users with compatible bank statements

### 7.2 Category Rule Fine-Tuning
- Let users define keyword→category mappings ("Swiggy" → Food)
- **Why**: Reduces manual categorization after AI imports

### 7.3 Multi-Currency Support
- Per-transaction currency with live exchange rate conversion in reports
- **Why**: Users who travel or have accounts in multiple currencies currently can't track accurately

### 7.4 Remaining Export Formats
- PDF (monthly statement) and QIF (accounting software) export — CSV and Excel are done (Phase 5.5); no PDF-generation library is in the project yet, so PDF export currently shows "coming soon" on web and isn't offered on mobile
- **Why**: Power users and accountants need richer export options

### 7.5 Shared Household Budgets
- Multiple users sharing a household budget/account pool
- **Why**: Couples and families want joint tracking without separate apps

---

## 📋 Phase 8 — Data Ownership & Platform-vs-Own AI Key (Designed, not built)

*Goal: let privacy-conscious users keep their financial data in their own database, and let the platform (admin) provide a shared AI key that normal users rely on by default — while power users bring their own. Both must default to the host so a normal signup Just Works.*

### 8.1 Platform-Provided AI Key with Per-User Override (✅ Web built — needs `db push` + mobile)
**Was:** AI was per-user only — no shared platform key. A user with no key got no AI features.
**Built (web + backend):**
- New `PlatformSettings` singleton model (encrypted `aiKey`, provider, model, baseUrl, `aiEnabled`), admin-only endpoints `GET/PUT /api/admin/platform-ai` (key never returned to the browser — only `hasKey`).
- New per-user `AiSettings.useOwnKey` (default **false** = rely on platform). Web Settings gains a **"Which AI to use"** chooser; the technical provider/model/key fields are **hidden unless the user opts into their own key** (also fixes UX-audit Critical #1 — AI config exposed to all users).
- Shared backend resolver `resolveAiForUser()` used by both `parse-text` and `parse-statement`: prefers the user's own key when they chose it, otherwise the platform key, falling back to whichever exists. Brand-new users (no settings row) get platform AI with zero setup.
- Admin panel gets a **Platform AI Key** card (enable, provider, model, base URL, key with Test/Save/Remove).
- **Cost model (added):** **bring-your-own-key is available to every user** (free or pro) and is **unlimited + not billed to the host**. The **platform key is host-funded and capped per day by plan** — **free = 10/day, pro = 40/day** — enforced only on `autoparse` (AI quick-entry) for now via a new `AiUsage` counter + `User.plan`. Own-key usage is never counted. When a free user hits the cap they're told to upgrade or add their own key.
- **Admin (enriched):** the Platform AI card now uses the **same multi-provider UI as users** (shared `web/components/AiProviderConfig.tsx`: provider select, model chips, multiple keys with active-star/reveal, test connection). Superadmin can read back the keys they set (like a user reads their own). Admin user table gains a **Free/Pro plan toggle** (`PUT /api/admin/users/:id/plan`).
- **Schema (needs `db push` + `generate`):** `User.plan`, new `AiUsage` model, and `PlatformSettings` reshaped to the multi-provider map form (`aiKeys`/`aiCustomModels`/`aiBaseUrl` JSON; old single `aiKey` dropped — re-enter the platform key after pushing).
- **Remaining:** port the Settings "Which AI to use" toggle + BYO to **mobile**; wire `plan` to real payments (Phase 8 / roadmap `02`); optionally cap platform-key **import** too (currently only quick-entry is capped).

### 8.2 Bring-Your-Own-Database (BYODB) for Financial Data (larger)
**Today:** one shared PostgreSQL (Docker, `localhost:5433`); all tenants are separated by row-level `userId` scoping through a single Prisma client (`backend/src/lib/prisma.ts`).
**Target:** a user may point their **financial data** (Accounts, Transactions, Categories, Budgets, Recurring) at **their own Postgres**, so that data at rest lives in *their* database, not the platform's. Normal users stay on the host DB by default.

Required architecture changes:
1. **Split the schema into two tiers.** *Identity/platform DB* keeps `User`, auth tokens, `AiSettings`, `Notification`, and — per user — an **encrypted connection string** to their data DB. *Data DB* holds the financial models. (Identity must stay on the platform DB, otherwise there's a chicken-and-egg: you can't authenticate a user whose credentials live only in a DB you can't reach yet.)
2. **Per-tenant Prisma client**, resolved per request from the user's (decrypted) connection string, with a bounded client cache / connection pool. Users on default stay on the shared client.
3. **Schema provisioning**: on connect, run `prisma db push`/migrations against the user's DB so it matches the app schema; handle version drift.
4. **Security hardening**: encrypt the connection string (AES-256-GCM, as with AI keys); **validate the URL to prevent SSRF** (block internal/link-local hosts); enforce TLS; fail gracefully when the user's DB is unreachable (read-only degraded state, clear error).
5. **Admin controls**: allow/disallow BYODB globally; see which users are external; a migrate-in / migrate-out tool to move a user's rows between host DB and their DB.
6. **User controls**: add/test/change/remove their DB URL; a one-click "move my data to my DB" and "move back to host".

**Important honesty caveat (needs a product decision):** BYODB gives **data residency/ownership** (rows live in the user's DB), **not zero-knowledge privacy**. The backend still executes the queries, so the platform process reads the plaintext *in transit* to "help record" — exactly as described. If the goal is that the platform can *never* read the data, that's a different, much larger project (client-side end-to-end encryption), or simply **self-hosting the whole stack** (already possible today via `docker-compose` — the most private option, zero code).

**Suggested rollout order:** 8.1 (platform AI key + quotas) → self-host docs for the privacy story → 8.2 BYODB behind an admin flag.
- **Why:** meets both requests (a working default host + an opt-in private path) while being honest about what BYODB does and doesn't guarantee, and sequences the low-risk, high-value piece first.

> **Decision (2026-07):** Per-user BYODB is **dropped for now**. Instead, the DB direction to explore later is **host-level engine portability** (8.3 below). Phase 8.1 (platform AI key) is being built first.

### 8.3 Database-Engine Portability (research for later — not a user feature yet)
**Question raised:** should the host be able to choose/switch the backing database — PostgreSQL (today), **MongoDB**, or **SQLite** — so we can later decide how to offer it to users?

**Reality via Prisma (current ORM):**
- **SQLite** — trivial. The project *started* on SQLite and migrated to Postgres (Phase 3.4); switching back is a `datasource` provider change + `prisma db push`. Good for local/dev or a lightweight single-user self-host. Caveats: no real concurrency, and one enum/array pattern may need review.
- **PostgreSQL ↔ MySQL** — easy; both are relational, minimal schema edits.
- **MongoDB** — the **big lift**. Prisma's Mongo connector needs `id String @id @default(auto()) @map("_id") @db.ObjectId` on every model, has different relation/transaction semantics, and doesn't support `prisma migrate` (push only). Our atomic balance mutations rely on relational `$transaction` behavior, so they'd need re-validation. Treat Mongo as a separate adapter, not a config flag.

**Recommendation:** Keep **one canonical engine (Postgres)** for the hosted platform. Make the provider **configurable via env** so a self-hoster can drop to **SQLite** for a personal instance (low effort, real value). Defer **Mongo** — it's an ORM-adapter project, not a switch, and offers little over Postgres for this workload. Revisit only if a concrete user need appears.

---

## 🔐 Security Notes

- JWT secret is required at startup (`backend` fails fast without it)
- AI API keys encrypted at rest with AES-256-GCM
- Passwords hashed with bcrypt (cost factor 10)
- All superadmin actions guarded server-side (not just frontend)
- Single superadmin email hardcoded in backend (`ankitravione@gmail.com`)
- Google OAuth users can have a password set by admin for emergency access
- Account ownership enforced on every transaction/recurring-rule endpoint (bulk import and recurring create/update were the two gaps closed in Phase 5.1); balance mutations are atomic to avoid lost updates under concurrent requests

---

## 📊 Current Status Summary

| Area | Status |
|---|---|
| Backend API | ✅ Stable — all CRUD, auth, AI, admin endpoints; audited for IDOR/concurrency (Phase 5.1) |
| Web App | ✅ Feature-complete — dashboard, transactions, reports, import/export page, account freeze, admin |
| Mobile App | ✅ Feature parity reached with web (Phase 4), including account freeze + Import/Export screen (Phase 5.4–5.5) |
| Database | ✅ PostgreSQL via Docker — all users migrated from SQLite |
| AI Integration | ✅ Per-user keys, two independent toggles, import pipeline (web + mobile) |
| Admin Panel | ✅ Single superadmin, password reset, user list with auth badges (web + mobile) |
| Account Freeze | ✅ Freeze/unfreeze on web + mobile, enforced server-side everywhere money moves |
| Import / Export | ✅ Dedicated page/screen on web + mobile, replacing the old scattered UI |
| Onboarding tour & tips | ✅ Web (Phase 5.8) — auto first-run, replayable, opt-out tips; 📋 not yet on mobile |
| Platform AI key (default) | 📋 Designed (Phase 8.1) — today AI is user-key-only, no host fallback |
| Bring-your-own-DB | 📋 Designed (Phase 8.2) — single shared Postgres today; needs identity/data DB split |
| Stable Branch | 📋 Planned — need `dev` branch workflow (see Phase 6.1) |

## 🔜 What's left (short list)

1. **Merge `dev` → stable `main`** with the branch workflow + first tag (Phase 6.1).
2. **Production deploy**: build web, host backend + Postgres, HTTPS reverse proxy (6.2).
3. **Scale/perf**: paginated transactions API (6.3) and automated `pg_dump` backups (6.4).
4. **Port the onboarding tour + tips to mobile** (Phase 5.8 is web-only).
5. **Phase 8.1** — platform-provided AI key with per-user override + admin quotas (the smaller half of your BYODB/AI request).
6. **Phase 8.2** — bring-your-own-database, behind an admin flag (the larger half; note the residency-vs-zero-knowledge caveat).
7. **Money precision**: migrate Float money fields → Decimal (noted in `AGENTS.md`).
8. Backlog ideas (unscheduled): bank-specific parser templates, keyword→category rules, multi-currency, PDF/QIF export, household budgets (Phase 7).
