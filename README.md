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

- **Dashboard**: Real-time financial overview with charts, Net Worth tracking, and timezone-aware insights.
- **Transactions**: Advanced filtering, search, Bulk CSV Import, and Export.
- **Accounts**: Track balances across multiple accounts (Checking, Savings, Credit Cards).
- **Categories**: Manage income and expense categories with custom icons.
- **Budgets**: Set monthly budgets and track progress.
- **Profile & Settings**: Customization options including Dark Mode, Currency, and Timezone preferences.
- **Data Management**: "Clear All" functionality to reset data and robust CSV import handling.

## 🗺️ Roadmap

### v0.1: Web Foundation (Current)
- [x] Core CRUD Features
- [x] Bulk Import/Export
- [x] Timezone Support
- [ ] Web Push Notifications (Budget Alerts)

### v0.2: Mobile & Payments
- [ ] Android Mobile App (React Native)
- [ ] UPI Payment Integration (Intent Flow)
- [ ] Auto-tracking via SMS Parsing

### v0.3: Intelligence (Premium)
- [ ] AI-Based Smart Import (PDF/Image parsing)
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

1.  **Backend** (http://localhost:5000)
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
- **Web push (budget alerts)**: set `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY` (generate with `node generate-keys.cjs`) and `VITE_VAPID_PUBLIC_KEY` in web.

## 📝 Documentation
Please refer to the [docs/](./docs) directory for detailed documentation on deployment, roadmap, and features.

## 🤝 Contributing
Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License
This project is licensed under the MIT License.
