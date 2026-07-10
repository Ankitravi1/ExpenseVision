# ExpenseVision

Personal finance monorepo: Express + Prisma + PostgreSQL backend, React 19 + Vite web app, Expo (React Native) mobile app. Web and mobile share the same backend API, so data syncs across both.

## Structure

- `backend/` — Express API (TypeScript ESM, `tsx` for dev). Prisma with **PostgreSQL** (Docker on `localhost:5433`, database `expensevision`). All routes in `src/routes/`, one shared Prisma client in `src/lib/prisma.ts` (do not `new PrismaClient()` elsewhere).
- `web/` — React 19 + Vite + Tailwind (built via PostCSS, config in `tailwind.config.js` — never the CDN). Source files live at the package root (`App.tsx`, `pages/`, `components/`), not in `src/`. Routing via react-router-dom; global state in `context/AppContext.tsx` provided by `App.tsx`.
- `mobile/` — Expo app. Screens in `src/screens/`, contexts in `src/context/`, API client in `src/services/api.ts`. Backend URL auto-resolves via `src/config.ts` (Android emulator → `10.0.2.2:5000`, physical device → Metro host LAN IP).
- `docs/` — guides.

## Commands

```bash
# Start PostgreSQL (Docker required)
docker-compose up -d

# Backend (http://localhost:5000)
cd backend && npm run dev
npx prisma db push            # after schema changes (dev)
npx prisma studio             # inspect the database

# Web (http://localhost:3000)
cd web && npm run dev

# Mobile (Android emulator must be running, backend too)
cd mobile && npx expo start --android
```

Typecheck any package with `npx tsc --noEmit`. There are no automated tests.

## Conventions & gotchas

- `Transaction.date` is a **string** (`YYYY-MM-DD`), not DateTime. Month filters must use `gte: 'YYYY-MM-01'` + `lt: <next month>-01` (never `lte: ...-31`).
- Account balances are mutated inside `prisma.$transaction` on every transaction create/update/delete — keep side effects (push notifications) outside the DB transaction.
- API errors are always `{ error: string }`.
- Optional features degrade gracefully when env vars are missing: no SMTP → users auto-verified, no `GOOGLE_CLIENT_ID` → Google button hidden/503, no VAPID keys → push disabled. Don't make these required.
- `JWT_SECRET` is required; the backend fails fast without it. Secrets live in `backend/.env` / `web/.env` (both git-ignored; `.env.example` files are the templates).
- Web auth tokens are in localStorage (`services/auth.ts`); mobile tokens in expo-secure-store (`src/services/storage.ts`).
- Category `icon` values are lucide-react icon names shared across web and mobile; mobile maps them in `src/components/CategoryIcon.tsx`.
- AI features are per-user only — users configure their own provider/API key in Settings. No shared platform key. Two independent DB boolean toggles: `importEnabled` (AI Statement Imports) and `autoParseEnabled` (AI Transaction Auto-Parsing) stored on the `AiSettings` model.
- Superadmin: Only `ankitravione@gmail.com` is the designated superadmin. The email is hardcoded in `backend/src/routes/admin.ts`. Do not change this without user confirmation.


## Database & Math
- Money fields in Prisma use Float today. A migration to Decimal is planned in Sprint C. Until then, always use Math.round(x * 100) / 100 for display and avoid accumulating floating-point arithmetic across many values.
- DB inspection: run cd backend && npx prisma studio for the GUI. DBeaver: host=localhost, port=5433, db=expensevision, user=postgres, pass=postgres.
