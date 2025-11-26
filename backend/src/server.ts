import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import transactionsRouter from './routes/transactions.js';
import accountsRouter from './routes/accounts.js';
import categoriesRouter from './routes/categories.js';
import budgetsRouter from './routes/budgets.js';
import authRouter from './routes/auth.js';
import { errorHandler } from './middleware/errorHandler.js';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Make prisma available to routes
app.use((req, res, next) => {
    (req as any).prisma = prisma;
    (req as any).userId = process.env.DEFAULT_USER_ID || 'default-user-123';
    next();
});

// Routes
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'ExpenseVision API is running' });
});

app.use('/api/auth', authRouter);
app.use('/api/transactions', transactionsRouter);
app.use('/api/accounts', accountsRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/budgets', budgetsRouter);

// Initial data endpoint
app.get('/api/initial-data', async (req, res, next) => {
    try {
        const userId = (req as any).userId;
        const prisma = (req as any).prisma;

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
                        date: {
                            gte: budget.month ? `${budget.month}-01` : undefined
                        }
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

// Error handling
app.use(errorHandler);

// Initialize default user and start server
async function startServer() {
    try {
        // Ensure default user exists
        const userId = process.env.DEFAULT_USER_ID || 'default-user-123';
        const userEmail = process.env.DEFAULT_USER_EMAIL || 'user@expensevision.local';
        const userName = process.env.DEFAULT_USER_NAME || 'Personal User';

        await prisma.user.upsert({
            where: { id: userId },
            update: {},
            create: {
                id: userId,
                email: userEmail,
                name: userName
            }
        });

        app.listen(PORT, () => {
            console.log(`✅ ExpenseVision API server running on http://localhost:${PORT}`);
            console.log(`📊 Database: SQLite (${process.env.DATABASE_URL})`);
            console.log(`👤 User: ${userName} (${userEmail})`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Graceful shutdown
process.on('SIGINT', async () => {
    await prisma.$disconnect();
    process.exit(0);
});

startServer();
