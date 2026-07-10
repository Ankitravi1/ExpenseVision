# ExpenseVision Roadmap

## ✅ Completed Features
- **Authentication:** Email/Password, Google OAuth, 2FA, Email Verification, Session Revocation.
- **Core Engine:** Transactions CRUD, Transfers, Accounts auto-balance mutation, Categories (lucide-react icons), Budgets with rollover alerts.
- **Recurring Engine:** Daily, Weekly, Monthly, Yearly rule execution.
- **Analytics:** Reports page, Income/Expense Overview, Cash Flow Graphs, Activity Calendar Heatmap, Account Insights.
- **AI Integration:** Multi-provider support (OpenAI, Anthropic, DeepSeek, Gemini, Custom Models). AI Bank Statement PDF/CSV import and Transaction Auto-Parsing.
- **Admin Panel:** Superadmin controls, user management, and metrics.
- **Notifications:** Web Push + Expo Push notifications, Notification Center with read/unread tracking.
- **Infrastructure:** Monorepo, PostgreSQL (Docker), Prisma ORM.

## 🚧 Current Phase: Stabilization (Sprints A & B)
- **Security Hardening:** Zod bulk validation, strict Ownership isolation on all endpoints, password strength enforcement, logout refresh token revocation.
- **UI Hygiene:** Replacing raw browser \lert()\ calls with native Toast notifications, sweeping invalid Tailwind classes, and refining spacing.
- **Bug Fixes:** 2FA state persistence leak, mobile push configuration.

## 🔜 Next Steps (Sprint C)
- **Financial Precision:** Migrate Prisma schema from \Float\ to \Decimal(@db.Decimal(18,2))\ to prevent floating-point arithmetic drift in Postgres SUM queries over time.
- **Mobile Parity:** Complete AI Settings revamp and Notification Center UI on the Expo mobile app.

## 🔮 Future Vision
- **Bank Sync:** Direct Plaid / Teller integration for automatic bank imports.
- **Investment Tracking:** Basic tracking of stock and crypto portfolios to calculate true Net Worth.
- **Shared Finances:** Family mode and couple budget sharing.
