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

See [plan.md](./plan.md) for the current roadmap and next work.

## 🛠 Tech Stack

- **Frontend**: React 19, TypeScript, Vite, TailwindCSS, React Router, Recharts, Lucide React.
- **Mobile**: React Native, Expo, TypeScript, React Navigation (bottom tabs), Secure Store.
- **Backend**: Node.js, Express, Prisma, SQLite.
- **Design**: Glassmorphism UI, Responsive Layout, Dark Mode support.

## 🏁 Getting Started

### Prerequisites
- Node.js (v18+)
- Expo Go on your phone for physical-device testing
- Android Studio + an emulator only if you want emulator testing

No database server is needed — the backend uses a local SQLite file (`backend/prisma/dev.db`).

### Installation & Running

**In VS Code (recommended)** — run services as separate integrated terminal tabs:
`Ctrl+Shift+P` → **Tasks: Run Task** → choose one:

- **Start ExpenseVision (phone LAN)**: backend + web + Expo for a physical phone on the same Wi-Fi (`--lan`)
- **Start ExpenseVision (emulator)**: backend + web + Expo Android emulator (`--android`)
- **Start ExpenseVision (web + backend)**: backend + web only

Each service gets its own dedicated terminal tab. To switch between them, use the terminal dropdown at the top-right of the VS Code terminal panel, or click the terminal tab names (`backend`, `web`, `mobile: phone Wi-Fi/LAN`, `mobile: emulator`). Stop a service with `Ctrl+C` inside that terminal.

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
    ```

    **Option A — Android emulator:**
    1. Open Android Studio → Device Manager → start your emulator and wait for the Android home screen.
    2. Start the backend: `cd backend && npm run dev`.
    3. Start Expo:
       ```bash
       cd mobile
       npx expo start --android
       ```
    4. If the app cannot reach the backend, run:
       ```bash
       adb reverse tcp:5000 tcp:5000
       adb reverse tcp:8081 tcp:8081
       ```
       Then press `r` in the Expo terminal to reload.

    **Option B — physical phone on same Wi-Fi / LAN (recommended):**
    `--lan` means "use my local network" — your phone and laptop must be on the same Wi-Fi/router. It does **not** mean USB cable.
    1. Connect phone to the **same Wi-Fi** as your PC.
    2. Install **Expo Go** from Play Store / App Store
    3. Start the backend: `cd backend && npm run dev`
    4. Run:
       ```bash
       cd mobile
       npx expo start --lan
       ```
       If Expo asks about port `8081` being busy, stop the old Expo terminal first or accept the new port.
    5. Scan the QR code in the terminal with Expo Go
    6. App loads on your phone, pointing at your PC's backend automatically

    **Option C — physical Android phone with USB cable:**
    Use this when Wi-Fi/LAN is blocked or unreliable.
    1. Enable **Developer options** and **USB debugging** on the phone.
    2. Connect the phone by USB and allow the debugging prompt on the phone.
    3. Check that ADB sees it:
       ```bash
       adb devices
       ```
       It should show your phone as `device`.
    4. Start the backend: `cd backend && npm run dev`
    5. Create USB port bridges:
       ```bash
       adb reverse tcp:5000 tcp:5000
       adb reverse tcp:8081 tcp:8081
       ```
    6. Start Expo and open Android:
       ```bash
       cd mobile
       npx expo start --localhost
       ```
       Then press `a` in the Expo terminal if the app does not open automatically.

    The app auto-detects the backend: Android emulator via `10.0.2.2`, physical devices on Wi-Fi/LAN via your PC's LAN IP, and USB devices via ADB reverse.

    **Expo SDK 54 version note:**
    This project targets Expo SDK 54 / Expo Go 54.x. Keep these native packages aligned with Expo's bundled versions:
    ```bash
    cd mobile
    npx expo install react-native-reanimated@~4.1.1 react-native-worklets@0.5.1
    ```
    If Expo shows a red screen mentioning `NativeWorklets` or `installTurboModule`, stop Metro and restart it with a clean cache:
    ```bash
    npx expo start --lan --clear
    ```

### Database commands

- `npx prisma migrate dev` applies pending Prisma schema migrations to SQLite and regenerates the Prisma client.
- `npx prisma studio` opens the visual database browser for the local SQLite data.
- If `migrate dev` fails with `EPERM ... query_engine-windows.dll.node`, stop the running backend/Node process and run the command again. On Windows that DLL can be locked while the server is running.

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
