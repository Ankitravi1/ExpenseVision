# 🎉 ExpenseVision - Setup Complete!

## ✅ What's Been Done
- Migrated from SQLite to **PostgreSQL** (Docker)
- Implemented full monorepo architecture (Backend API, React Web, Expo Mobile)
- Full Authentication (JWT, Refresh tokens, Google OAuth, 2FA, Email Verification)
- AI Statement Parsing and Auto-Categorization (Bring your own API key)
- Push Notifications (Web & Mobile)
- Advanced Analytics (Reports, Flow Graphs, Heatmaps)

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js (v20+)
- Docker (for PostgreSQL database)
- Android Emulator / Expo Go (for Mobile)

### Step 1: Start PostgreSQL Database
`ash
docker-compose up -d
`
*This starts a PostgreSQL instance on port 5433 with database \expensevision\.*

### Step 2: Start Backend API
`ash
cd backend
npm run dev
`
*Runs on http://localhost:5000. Contains Prisma ORM and Express.*
*If you changed the schema, run \
px prisma db push\ first.*

### Step 3: Start Web App
`ash
cd web
npm run dev
`
*Runs on http://localhost:3000. React 19 + Vite + Tailwind CSS.*

### Step 4: Start Mobile App (Optional)
`ash
cd mobile
npx expo start --android
`
*Requires Android emulator running, or physical device connected on same LAN.*

---

## 🔍 Database Inspection (GUI)
You can visually inspect the database tables and data using these tools:

**Option 1: Prisma Studio (Built-in, Easiest)**
`ash
cd backend
npx prisma studio
`
*Opens at http://localhost:5555*

**Option 2: DBeaver or pgAdmin**
- Host: \localhost\
- Port: \5433\
- Database: \expensevision\
- Username: \postgres\
- Password: \postgres\

---

## 🔑 Environment Variables & Security
- \JWT_SECRET\ is **required** in \ackend/.env\ for the server to boot.
- Optional integrations degrade gracefully if missing:
  - No \SMTP_HOST\? Users are auto-verified on signup.
  - No \GOOGLE_CLIENT_ID\? Google login button hides.
  - No VAPID keys? Web push is disabled.
- **Superadmin:** The email \nkitravione@gmail.com\ is hardcoded as the sole superadmin for the Admin Dashboard.
