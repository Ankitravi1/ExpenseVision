# ExpenseVision Backend

Backend API server for ExpenseVision personal finance application.

## Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: SQLite (via Prisma ORM)
- **Validation**: Zod

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

The `.env` file is already configured with default settings for local development:
- SQLite database at `./dev.db`
- Server running on port 5000
- Default user for single-user mode

### 3. Initialize Database

```bash
npm run db:push
```

This will create the SQLite database and apply the schema.

### 4. Start Development Server

```bash
npm run dev
```

The server will start at `http://localhost:5000`

## API Endpoints

### Health Check
- `GET /api/health` - Check if API is running

### Initial Data
- `GET /api/initial-data` - Get all accounts, categories, transactions, and budgets

### Transactions
- `GET /api/transactions` - List transactions (supports filters: startDate, endDate, type, categoryId, accountId)
- `POST /api/transactions` - Create transaction
- `PUT /api/transactions/:id` - Update transaction
- `DELETE /api/transactions/:id` - Delete transaction
- `GET /api/transactions/export` - Export transactions as CSV

### Accounts
- `GET /api/accounts` - List all accounts
- `POST /api/accounts` - Create account
- `PUT /api/accounts/:id` - Update account
- `DELETE /api/accounts/:id` - Delete account

### Categories
- `GET /api/categories` - List all categories
- `POST /api/categories` - Create category
- `PUT /api/categories/:id` - Update category
- `DELETE /api/categories/:id` - Delete category

### Budgets
- `GET /api/budgets` - List all budgets (with calculated spent amounts)
- `POST /api/budgets` - Create or update budget
- `DELETE /api/budgets/:id` - Delete budget

## Database Management

### View Database
```bash
npm run db:studio
```

This opens Prisma Studio in your browser to view and edit database records.

### Reset Database
If you need to reset the database, simply delete `dev.db` and run `npm run db:push` again.

## Development

The server uses `tsx watch` for hot-reloading during development. Any changes to TypeScript files will automatically restart the server.

## Production Build

```bash
npm run build
npm start
```

## Notes

- Currently configured for **single-user mode** - no authentication required
- All requests use the default user ID from environment variables
- Database transactions ensure data consistency for financial operations
- Account balances are automatically updated when transactions are created/updated/deleted
