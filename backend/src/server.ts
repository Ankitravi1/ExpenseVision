import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { prisma } from './lib/prisma.js';
import transactionsRouter from './routes/transactions.js';
import accountsRouter from './routes/accounts.js';
import categoriesRouter from './routes/categories.js';
import budgetsRouter from './routes/budgets.js';
import authRouter from './routes/auth.js';
import pushRouter from './routes/push.js';
import { errorHandler } from './middleware/errorHandler.js';
import { authenticateToken } from './middleware/auth.js';
import { apiLimiter } from './middleware/rateLimit.js';

const app = express();
const PORT = process.env.PORT || 5000;

// CORS: allow local dev origins + any extras from env (e.g. LAN IP for mobile dev)
const extraOrigins = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map(o => o.trim())
    .filter(Boolean);

const allowedOrigin = (origin: string | undefined): boolean => {
    if (!origin) return true; // same-origin, curl, native mobile apps
    if (extraOrigins.includes(origin)) return true;
    try {
        const { hostname } = new URL(origin);
        return (
            hostname === 'localhost' ||
            hostname === '127.0.0.1' ||
            /^10\.\d+\.\d+\.\d+$/.test(hostname) ||
            /^192\.168\.\d+\.\d+$/.test(hostname) ||
            /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/.test(hostname)
        );
    } catch {
        return false;
    }
};

app.use(cors({
    origin: (origin, callback) => {
        callback(null, allowedOrigin(origin));
    }
}));
app.use(express.json());

// Make prisma available to routes
app.use((req, res, next) => {
    (req as any).prisma = prisma;
    next();
});

// Routes
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'ExpenseVision API is running' });
});

app.use('/api/auth', authRouter);

// Protected Routes
app.use('/api/transactions', apiLimiter, authenticateToken, transactionsRouter);
app.use('/api/accounts', apiLimiter, authenticateToken, accountsRouter);
app.use('/api/categories', apiLimiter, authenticateToken, categoriesRouter);
app.use('/api/budgets', apiLimiter, authenticateToken, budgetsRouter);
app.use('/api/push', apiLimiter, authenticateToken, pushRouter);

// Initial data endpoint
app.get('/api/initial-data', apiLimiter, authenticateToken, async (req, res, next) => {
    try {
        const userId = (req as any).userId;

        const [accounts, categories, transactions, budgets] = await Promise.all([
            prisma.account.findMany({ where: { userId } }),
            prisma.category.findMany({ where: { userId } }),
            prisma.transaction.findMany({
                where: { userId },
                orderBy: { date: 'desc' }
            }),
            prisma.budget.findMany({ where: { userId } })
        ]);

        // Calculate spent for each budget
        const budgetsWithSpent = await Promise.all(
            budgets.map(async (budget) => {
                const spent = await prisma.transaction.aggregate({
                    where: {
                        userId,
                        categoryId: budget.categoryId,
                        type: 'expense',
                        ...(budget.month ? { date: { gte: `${budget.month}-01`, lt: nextMonthStart(budget.month) } } : {})
                    },
                    _sum: { amount: true }
                });

                return {
                    ...budget,
                    spent: spent._sum.amount || 0
                };
            })
        );

        res.json({
            accounts,
            categories,
            transactions,
            budgets: budgetsWithSpent
        });
    } catch (error) {
        next(error);
    }
});

// First day of the month after "YYYY-MM" (for exclusive date range filters)
function nextMonthStart(month: string): string {
    const [y, m] = month.split('-').map(Number);
    const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
    return `${next}-01`;
}

// Error handling
app.use(errorHandler);

app.listen(PORT, () => {
    console.log(`✅ ExpenseVision API server running on http://localhost:${PORT}`);
    console.log(`📊 Database: SQLite (${process.env.DATABASE_URL})`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
    await prisma.$disconnect();
    process.exit(0);
});
