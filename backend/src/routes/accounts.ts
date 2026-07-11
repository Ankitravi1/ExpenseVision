import { Router } from 'express';
import { z } from 'zod';

const router = Router();

// Validation schema
const accountSchema = z.object({
    name: z.string().min(1),
    type: z.string(),
    initialBalance: z.number().default(0),
    color: z.string().optional(),
    icon: z.string().optional(),
    logo: z.string().optional(),
    frozen: z.boolean().optional()
});

export const syncAccountBalances = async (prisma: any, userId: string) => {
    const accounts = await prisma.account.findMany({ where: { userId } });
    for (const account of accounts) {
        const incomeSum = await prisma.transaction.aggregate({
            where: { accountId: account.id, type: 'income', userId },
            _sum: { amount: true }
        });
        const expenseSum = await prisma.transaction.aggregate({
            where: { accountId: account.id, type: 'expense', userId },
            _sum: { amount: true }
        });
        const transferOutSum = await prisma.transaction.aggregate({
            where: { accountId: account.id, type: 'transfer', userId },
            _sum: { amount: true }
        });
        const transferInSum = await prisma.transaction.aggregate({
            where: { transferToAccountId: account.id, type: 'transfer', userId },
            _sum: { amount: true }
        });

        const income = incomeSum._sum.amount || 0;
        const expense = expenseSum._sum.amount || 0;
        const transferOut = transferOutSum._sum.amount || 0;
        const transferIn = transferInSum._sum.amount || 0;

        const computedBalance = account.initialBalance + income - expense - transferOut + transferIn;

        if (account.balance !== computedBalance) {
            await prisma.account.update({
                where: { id: account.id },
                data: { balance: computedBalance }
            });
        }
    }
};

// GET /api/accounts - List all accounts
router.get('/', async (req, res, next) => {
    try {
        const prisma = (req as any).prisma;
        const userId = (req as any).userId;

        await syncAccountBalances(prisma, userId);

        const accounts = await prisma.account.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' }
        });

        res.json(accounts);
    } catch (error) {
        next(error);
    }
});

// POST /api/accounts - Create new account
router.post('/', async (req, res, next) => {
    try {
        const prisma = (req as any).prisma;
        const userId = (req as any).userId;

        const data = accountSchema.parse(req.body);

        const account = await prisma.account.create({
            data: {
                ...data,
                balance: data.initialBalance, // Current balance starts at initial balance
                userId
            }
        });

        res.status(201).json(account);
    } catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({ error: 'Validation error', details: error.errors });
        } else {
            next(error);
        }
    }
});

// PUT /api/accounts/:id - Update account
router.put('/:id', async (req, res, next) => {
    try {
        const prisma = (req as any).prisma;
        const userId = (req as any).userId;
        const { id } = req.params;

        const data = accountSchema.partial().parse(req.body);

        // Fetch old account (scoped to the caller) to calculate balance adjustment
        // if initialBalance changed, and to reject updates to accounts they don't own.
        const oldAccount = await prisma.account.findFirst({
            where: { id, userId }
        });

        if (!oldAccount) {
            return res.status(404).json({ error: 'Account not found' });
        }

        if (data.initialBalance !== undefined) {
            const diff = data.initialBalance - oldAccount.initialBalance;
            (data as any).balance = oldAccount.balance + diff;
        }

        const account = await prisma.account.updateMany({
            where: { id, userId },
            data
        });

        if (account.count === 0) {
            return res.status(404).json({ error: 'Account not found' });
        }

        const updated = await prisma.account.findUnique({ where: { id } });
        res.json(updated);
    } catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({ error: 'Validation error', details: error.errors });
        } else {
            next(error);
        }
    }
});

// DELETE /api/accounts/:id - Delete account
router.delete('/:id', async (req, res, next) => {
    try {
        const prisma = (req as any).prisma;
        const userId = (req as any).userId;
        const { id } = req.params;

        // Check if account has transactions
        const transactionCount = await prisma.transaction.count({
            where: {
                OR: [
                    { accountId: id },
                    { transferToAccountId: id }
                ]
            }
        });

        if (transactionCount > 0) {
            return res.status(400).json({
                error: 'Cannot delete account with existing transactions. Please delete or reassign transactions first.'
            });
        }

        const result = await prisma.account.deleteMany({
            where: { id, userId }
        });

        if (result.count === 0) {
            return res.status(404).json({ error: 'Account not found' });
        }

        res.status(204).send();
    } catch (error) {
        next(error);
    }
});

export default router;
