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

## 🔄 Phase 4 — Mobile Feature Parity (In Progress / Partially Done)

*Goal: Bring web-level quality and features to the Expo mobile app.*

### 4.1 Reports Screen (Completed)
- Pie chart using `react-native-chart-kit` + `react-native-svg`

### 4.2 Push Notifications on Mobile (Completed)
- `expo-notifications` integrated
- Push token registered to backend
- Foreground notification handler set
- Guarded against running in Expo Go (requires dev build or physical device)

### 4.3 Mobile AI Settings (Completed)
- Multiple API keys per provider
- Reveal/delete individual keys
- Custom model addition

### ⬜ 4.4 Advanced Date Navigator on Mobile (Planned)
- Port the period shift arrows [◀][Monthly▼][▶] to the mobile transaction list
- **Why**: Users expect the same navigation convenience on mobile as web

### ⬜ 4.5 Bulk Actions on Mobile (Planned)
- Floating action footer for bulk delete/move on the transactions list
- **Why**: Power users need batch operations on mobile too

### ⬜ 4.6 Account Gradient Cards on Mobile (Planned)
- Port predefined account type gradients from web to mobile account cards
- **Why**: Visual parity and a more premium look

---

## 📋 Phase 5 — Stability, Performance & Production Readiness

*Goal: Make the main branch a stable, deployable release.*

### 5.1 Git Branching Strategy (Priority)

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

### 5.2 Build & Production Deployment (Planned)
- `npm run build` in web/ → static files served by Express or a CDN
- Backend deployed to a VPS / Railway / Render with env vars set
- PostgreSQL hosted (Railway Postgres, Supabase, or self-hosted)
- HTTPS via reverse proxy (nginx / Caddy)

### 5.3 Paginated Transaction API (Planned)
- Add `?page=1&limit=50` query params to `GET /api/transactions`
- **Why**: Users with 1,000+ transactions will see slow loads on current full-list fetch

### 5.4 Automated Database Backups (Planned)
- Daily `pg_dump` to a local or S3 backup
- **Why**: PostgreSQL in Docker can lose data if the volume is deleted — backups are essential for production

---

## 📋 Phase 6 — Future Enhancements

*Ideas validated by usage — not yet scheduled.*

### 6.1 AI Parser Improvements
- Pre-baked regex templates for major banks (HDFC, SBI, Chase, BOA) to handle structured statements without AI
- **Why**: Reduces AI API cost for users with compatible bank statements

### 6.2 Category Rule Fine-Tuning
- Let users define keyword→category mappings ("Swiggy" → Food)
- **Why**: Reduces manual categorization after AI imports

### 6.3 Multi-Currency Support
- Per-transaction currency with live exchange rate conversion in reports
- **Why**: Users who travel or have accounts in multiple currencies currently can't track accurately

### 6.4 Data Export Formats
- Export to PDF (monthly statement), XLSX (Excel), or QIF (for accounting software)
- **Why**: Power users and accountants need richer export options

### 6.5 Shared Household Budgets
- Multiple users sharing a household budget/account pool
- **Why**: Couples and families want joint tracking without separate apps

---

## 🔐 Security Notes

- JWT secret is required at startup (`backend` fails fast without it)
- AI API keys encrypted at rest with AES-256-GCM
- Passwords hashed with bcrypt (cost factor 10)
- All superadmin actions guarded server-side (not just frontend)
- Single superadmin email hardcoded in backend (`ankitravione@gmail.com`)
- Google OAuth users can have a password set by admin for emergency access

---

## 📊 Current Status Summary

| Area | Status |
|---|---|
| Backend API | ✅ Stable — all CRUD, auth, AI, admin endpoints |
| Web App | ✅ Feature-complete — dashboard, transactions, reports, import, admin |
| Mobile App | 🔄 Feature parity in progress — AI settings done, date nav & bulk actions pending |
| Database | ✅ PostgreSQL via Docker — all users migrated from SQLite |
| AI Integration | ✅ Per-user keys, two independent toggles, import pipeline |
| Admin Panel | ✅ Single superadmin, password reset, user list with auth badges |
| Stable Branch | 📋 Planned — need `dev` branch workflow (see Phase 5.1) |
