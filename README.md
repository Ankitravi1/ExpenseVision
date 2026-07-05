# ExpenseVision

A modern, full-stack personal finance application built with React, React Native, Node.js, and SQLite — zero external services needed to run it.

![ExpenseVision Dashboard](https://via.placeholder.com/800x400?text=ExpenseVision+Dashboard)

## 📂 Project Structure

This project is organized as a monorepo:

- **[web/](./web)**: The web frontend application (React, Vite).
- **[mobile/](./mobile)**: The mobile application (React Native, Expo).
- **[backend/](./backend)**: The backend API (Node.js, Express, Prisma, SQLite).
- **[docs/](./docs)**: Project documentation and guides.

## 🚀 Features

Web and mobile share the same backend, so **the same account logs into both and data syncs across them** (refresh / pull-to-refresh to see the latest).

- **Dashboard**: Net Worth, monthly income/expense, 6-month trend chart, recent transactions. Web dashboard has a month navigator.
- **Transactions**: Add/edit/delete income, expense and transfers; search, type + month filters, notes/tags, CSV import (web) and CSV export (web + mobile).
- **Recurring transactions**: Rules for rent, EMI, salary, subscriptions (daily/weekly/monthly/yearly). Due occurrences are auto-created when the app loads, with month-length-aware day anchoring (an EMI on the 31st lands on the 28th in February).
- **Accounts**: Track balances across multiple accounts (Checking, Savings, Credit Cards); balances update atomically on every transaction.
- **Categories**: Income/expense categories with lucide icons shared across web and mobile.
- **Budgets**: Monthly limits with **roll-over of unused budget** and a **per-budget alert threshold (%)**; progress bars use the effective (rolled-over) amount.
- **Reports & Insights**: Category breakdown by month plus insights — spend vs last month, biggest category change, and projected month-end pace vs total budget.
- **AI quick entry**: Optional natural-language → transaction parsing with a user-selected provider and user-provided API key (web + mobile).
- **Profile & Settings**: Dark Mode, Currency, Timezone; category manager, recurring manager, clear-all, export.
- **Interactive API docs**: Swagger UI at `/api/docs` — authorize with a token and try every endpoint.

## 📖 API Documentation

With the backend running, open **http://localhost:5000/api/docs** for interactive Swagger UI:
1. Call `POST /auth/signup` or `/auth/login` and copy the `token` from the response.
2. Click **Authorize** (top right) and paste the token.
3. Try any 🔒 endpoint — every route documents its description, required fields and examples.

The raw OpenAPI spec is served at `http://localhost:5000/api/docs.json`.

## 🗺️ Roadmap

### v0.1 — Web Foundation ✅
- [x] Core CRUD (accounts, categories, transactions, budgets)
- [x] Bulk CSV Import/Export
- [x] Timezone support
- [x] Web Push Notifications (budget alerts)

### v0.2 — Mobile & Transaction Entry ✅
- [x] Android mobile app (React Native + Expo) at full feature parity with web
- [x] Native date picker, bottom-sheet pickers, haptics, swipe-to-delete
- [x] Optional AI-assisted voice/text-to-transaction parsing (user-provided API key)

### v0.3 — Recurring, Budgets & Insights ✅ (Current)
- [x] Recurring transactions (rent, EMI, salary, subscriptions) with auto-materialization
- [x] Budget roll-over + per-budget alert thresholds
- [x] Reports insights (month-over-month change, spending pace vs budget)
- [x] Transaction notes/tags (foundation for future import reconciliation)
- [x] Swagger / OpenAPI documentation with bearer auth

### v0.4 — Intelligence (Premium)
- [ ] AI-based smart import (PDF / image statement parsing)
- [ ] Real-time sync (refresh on focus / websockets)
- [ ] Mobile push notifications (expo-notifications) for budget alerts

### v0.5 — Payments & Integrations
- [ ] UPI Payment Integration (Intent Flow)
- [ ] Bank Account Aggregator Integration

## 🛠 Tech Stack

- **Frontend**: React 19, TypeScript, Vite, TailwindCSS, React Router, Recharts, Lucide React.
- **Mobile**: React Native, Expo, TypeScript, React Navigation (bottom tabs), Secure Store.
- **Backend**: Node.js, Express, Prisma, SQLite.
- **Design**: Glassmorphism UI, Responsive Layout, Dark Mode support.

## 🏁 Getting Started

### Prerequisites
- Node.js (v18+)
- Android Studio + an emulator (only for the mobile app)

No database server is needed — the backend uses a local SQLite file (`backend/prisma/dev.db`).

### Installation & Running

**In VS Code (recommended)** — run everything as separate integrated terminal tabs:
`Ctrl+Shift+P` → **Tasks: Run Task** → **Start ExpenseVision (all)** (or *web + backend*). Each service gets its own dedicated terminal tab. See `.vscode/tasks.json`.

**Or via the script** — opens each service in its own separate terminal window (Windows Terminal tabs when available):

```powershell
.\start-expensevision.ps1            # backend + web
.\start-expensevision.ps1 -WithMobile   # also Expo Android (emulator required)
```

1.  **Backend** (http://localhost:5000 · API docs at http://localhost:5000/api/docs)
    ```bash
    cd backend
    npm install
    cp .env.example .env   # then set JWT_SECRET to any long random string
    npx prisma migrate dev
    npm run dev
    ```

2.  **Web** (http://localhost:3000)
    ```bash
    cd web
    npm install
    cp .env.example .env
    npm run dev
    ```

3.  **Mobile** (uses the same backend — data syncs with web)
    ```bash
    cd mobile
    npm install
    npx expo start --android
    ```
    The app auto-detects the backend: Android emulator via `10.0.2.2`, physical devices via your PC's LAN IP (phone and PC must be on the same Wi-Fi, backend running).

### Optional features (off by default, enable via `backend/.env`)
- **Google sign-in**: set `GOOGLE_CLIENT_ID` (backend) and `VITE_GOOGLE_CLIENT_ID` (web).
- **Email verification / password reset emails**: set the `SMTP_*` vars. Without SMTP, users are auto-verified.
- **Web push (budget alerts)**: set `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY` in `backend/.env` (generate with `node generate-keys.cjs`).

## 📝 Documentation
Please refer to the [docs/](./docs) directory for detailed documentation on deployment, roadmap, and features.

## 🤝 Contributing
Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License
This project is licensed under the MIT License.
