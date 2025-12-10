# ExpenseVision

A modern, full-stack personal finance application built with React, React Native, Node.js, and MongoDB.

![ExpenseVision Dashboard](https://via.placeholder.com/800x400?text=ExpenseVision+Dashboard)

## 📂 Project Structure

This project is organized as a monorepo:

- **[web/](./web)**: The web frontend application (React, Vite).
- **[mobile/](./mobile)**: The mobile application (React Native, Expo).
- **[backend/](./backend)**: The backend API (Node.js, Express, Prisma, MongoDB).
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

- **Frontend**: React 19, TypeScript, Vite, TailwindCSS, Recharts, Lucide React.
- **Mobile**: React Native, Expo, TypeScript.
- **Backend**: Node.js, Express, Prisma, MongoDB.
- **Design**: Glassmorphism UI, Responsive Layout, Dark Mode support.

## 🏁 Getting Started

### Prerequisites
- Node.js (v18+)
- MongoDB (Connection string required in `backend/.env`)

### Installation & Running

1.  **Backend**
    ```bash
    cd backend
    npm install
    npm run db:generate
    npm run dev
    ```

2.  **Web**
    ```bash
    cd web
    npm install
    npm run dev
    ```

3.  **Mobile**
    ```bash
    cd mobile
    npm install
    npx expo start
    ```

## 📝 Documentation
Please refer to the [docs/](./docs) directory for detailed documentation on deployment, roadmap, and features.

## 🤝 Contributing
Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License
This project is licensed under the MIT License.
