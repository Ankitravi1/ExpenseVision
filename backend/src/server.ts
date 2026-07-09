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
import recurringRouter, { materializeRecurringRules } from './routes/recurring.js';
import aiSettingsRouter from './routes/aiSettings.js';
import notificationsRouter from './routes/notifications.js';
import adminRouter from './routes/admin.js';
import { budgetsWithSpent } from './services/budgets.js';
import { errorHandler } from './middleware/errorHandler.js';
import { authenticateToken } from './middleware/auth.js';
import { apiLimiter } from './middleware/rateLimit.js';
import swaggerUi from 'swagger-ui-express';
import { openApiSpec } from './docs/openapi.js';

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

// Interactive API docs (public) — try every endpoint with bearer auth
app.get('/api/docs.json', (req, res) => res.json(openApiSpec));
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec as any, {
    customSiteTitle: 'ExpenseVision API Docs',
    swaggerOptions: { persistAuthorization: true },
}));

app.use('/api/auth', authRouter);

// Protected Routes
app.use('/api/transactions', apiLimiter, authenticateToken, transactionsRouter);
app.use('/api/accounts', apiLimiter, authenticateToken, accountsRouter);
app.use('/api/categories', apiLimiter, authenticateToken, categoriesRouter);
app.use('/api/budgets', apiLimiter, authenticateToken, budgetsRouter);
app.use('/api/push', apiLimiter, authenticateToken, pushRouter);
app.use('/api/recurring', apiLimiter, authenticateToken, recurringRouter);
app.use('/api/ai-settings', apiLimiter, authenticateToken, aiSettingsRouter);
app.use('/api/notifications', apiLimiter, authenticateToken, notificationsRouter);
import profileRouter from './routes/profile.js';
app.use('/api/profile', apiLimiter, authenticateToken, profileRouter);
app.use('/api/admin', apiLimiter, authenticateToken, adminRouter);

// Initial data endpoint
app.get('/api/initial-data', apiLimiter, authenticateToken, async (req, res, next) => {
    try {
        const userId = (req as any).userId;

        // Create any due recurring transactions (rent, EMI, salary, ...) before
        // reading, so they show up the moment a client opens the app
        await materializeRecurringRules(prisma, userId).catch(err =>
            console.error('Recurring materialization failed:', err)
        );

        const [accounts, categories, transactions, budgets, recurring] = await Promise.all([
            prisma.account.findMany({ where: { userId } }),
            prisma.category.findMany({ where: { userId } }),
            prisma.transaction.findMany({
                where: { userId },
                orderBy: { date: 'desc' }
            }),
            budgetsWithSpent(prisma, userId),
            prisma.recurringRule.findMany({ where: { userId }, orderBy: { nextRun: 'asc' } })
        ]);

        res.json({
            accounts,
            categories,
            transactions,
            budgets,
            recurring
        });
    } catch (error) {
        next(error);
    }
});

// Error handling
app.use(errorHandler);

app.listen(PORT, () => {
    console.log(`✅ ExpenseVision API server running on http://localhost:${PORT}`);
    console.log(`📊 Database: PostgreSQL (${process.env.DATABASE_URL})`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
    await prisma.$disconnect();
    process.exit(0);
});
