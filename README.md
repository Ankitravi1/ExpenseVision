# ExpenseVision

> A full-stack personal finance monorepo — track expenses, income, and budgets across web and mobile with AI-powered imports.

**Tech Stack:** Express + Prisma + PostgreSQL · React 19 + Vite + Tailwind · Expo (React Native)

---

## 📦 Repository Structure

```
ExpenseVision/
├── backend/          Express API (TypeScript ESM, tsx dev)
├── web/              React 19 + Vite web app
├── mobile/           Expo React Native app
├── docs/             Setup guides and architecture notes
├── docker-compose.yml  PostgreSQL via Docker
├── AGENTS.md         AI agent instructions (Antigravity)
└── plan.md           Project roadmap
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Docker Desktop (for PostgreSQL)
- Expo CLI (for mobile)

### 1. Start the Database

```bash
docker-compose up -d
```

This starts PostgreSQL at `localhost:5433` (database: `expensevision`).

### 2. Backend

```bash
cd backend
cp .env.example .env       # Fill in JWT_SECRET (required) and optional fields
npm install
npx prisma db push         # Sync schema to PostgreSQL
npm run dev                # http://localhost:5000
```

The backend auto-creates tables on first `db push`. No manual SQL needed.

### 3. Web App

```bash
cd web
cp .env.example .env       # Set VITE_API_URL=http://localhost:5000/api
npm install
npm run dev                # http://localhost:3000
```

### 4. Mobile App

```bash
cd mobile
npm install
npx expo start --android   # Requires Android emulator or physical device
```

The mobile app auto-resolves the backend URL:
- Android emulator → `10.0.2.2:5000`
- Physical device → Metro bundler's LAN IP

---

## ⚙️ Environment Variables

### `backend/.env`

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `JWT_SECRET` | ✅ | Min 32-char secret for JWT signing |
| `PORT` | Optional | Default `5000` |
| `APP_URL` | Optional | Frontend URL for CORS/emails |
| `GOOGLE_CLIENT_ID` | Optional | Enables Google Sign-In button |
| `SMTP_HOST/PORT/USER/PASS` | Optional | Email verification/reset (users auto-verified without SMTP) |
| `VAPID_PUBLIC_KEY` | Optional | Web push notifications |
| `VAPID_PRIVATE_KEY` | Optional | Web push notifications |
| `AI_SETTINGS_SECRET` | Optional | Encrypts user AI API keys at rest |

Generate VAPID keys: `node generate-keys.cjs`

### `web/.env`

| Variable | Required | Description |
|---|---|---|
| `VITE_API_URL` | ✅ | Backend API base URL |
| `VITE_GOOGLE_CLIENT_ID` | Optional | Google Sign-In (must match backend) |

---

## 🔑 Admin Access

The superadmin account is **`ankitravione@gmail.com`**. This account:
- Cannot be deleted or demoted
- Can reset any user's password via the **Super Admin Panel** in Settings
- Can delete non-superadmin users and all their data

To reset the superadmin's own password, run:
```bash
cd backend
# One-off — create a temporary reset script or use prisma studio
npx prisma studio
```

---

## 🛠️ Development Commands

```bash
# Backend (port 5000)
cd backend && npm run dev

# Web (port 3000)
cd web && npm run dev

# Mobile (Android)
cd mobile && npx expo start --android

# Type-check without building
cd backend && npx tsc --noEmit
cd web && npx tsc --noEmit
cd mobile && npx tsc --noEmit

# Prisma
npx prisma db push         # Sync schema (dev)
npx prisma studio          # GUI database browser
npx prisma generate        # Regenerate Prisma Client after schema changes
```

---

## 🗂️ Key Architecture Notes

### `Transaction.date`
Stored as a **string** in `YYYY-MM-DD` format (not a DateTime). Month filters must use:
```
gte: 'YYYY-MM-01'
lt:  'YYYY-<next-month>-01'   // never lte: ...-31
```

### Account Balances
Mutated atomically inside `prisma.$transaction` on every create/update/delete. Push notifications (side effects) are sent **outside** the DB transaction.

### Auth Tokens
- Web: stored in `localStorage` via `web/services/auth.ts`
- Mobile: stored in `expo-secure-store` via `mobile/src/services/storage.ts`

### AI Features
AI (statement imports and quick-entry parsing) are per-user — each user configures their own provider/API key in Settings. No shared platform key. Two granular toggles:
- **AI Statement Imports** — PDF, CSV, Excel, OCR image parsing
- **AI Transaction Auto-Parsing** — Natural language quick entry

### API Error Format
All errors: `{ error: string }`

---

## ✨ Feature Highlights

### Web App
- 📊 **Dashboard** — Monthly summary with income/expense/balance cards, expense distribution pie chart, category breakdown
- 💳 **All Transactions** — Full-featured table with date range filters (daily/weekly/monthly/custom), bulk delete, carry-over balance, amount range popover
- 📁 **Import Transactions** — Unified uploader supporting CSV, Excel (auto-parse), PDF (text extract), receipt images (OCR), and pasted text — all with AI column remapping
- 📈 **Reports** — Mirrored date controls, category pie chart, burn rate/savings rate insights, export CSV
- 💰 **Accounts** — Balance tracking, transaction history modal with click-to-edit
- 📋 **Budgets** — Monthly budget tracking with over/near/on-track status tabs
- 🔄 **Recurring Transactions** — Rule-based auto-generation of transactions
- 🔔 **Notifications** — Web push notification center with mark-read/clear
- 🛡️ **Super Admin Panel** — User management with password reset, delete, Google/Manual sign-up badges
- 🌙 **Dark Mode** — Full dark/light theme with high-contrast native date pickers

### Mobile App (Expo)
- Full transaction management (add/edit/delete)
- Reports with pie chart (react-native-chart-kit)
- Push notifications via Expo Push
- AI Settings — per-provider API keys, custom models
- Account management and budget tracking

---

## 🐳 Docker

```bash
# Start PostgreSQL
docker-compose up -d

# Stop
docker-compose down

# Reset database (⚠️ destructive)
docker-compose down -v && docker-compose up -d
npx prisma db push
```

---

## 📄 License

Private project — all rights reserved.
