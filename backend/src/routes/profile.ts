import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticateToken } from '../middleware/auth.js';
import { syncAccountBalances } from './accounts.js';

const router = Router();

// POST /api/profile/expo-token
router.post('/expo-token', authenticateToken, async (req, res, next) => {
    try {
        const userId = (req as any).userId;
        const { expoPushToken } = req.body;

        if (typeof expoPushToken !== 'string') {
            return res.status(400).json({ error: 'expoPushToken is required and must be a string' });
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: { expoPushToken }
        });

        res.json({ message: 'Expo push token updated successfully', user: { expoPushToken: updatedUser.expoPushToken } });
    } catch (error) {
        next(error);
    }
});

// POST /api/profile/clear-data
router.post('/clear-data', authenticateToken, async (req, res, next) => {
    try {
        const userId = (req as any).userId;
        const { transactions, budgets, accounts } = req.body;

        await prisma.$transaction(async (tx) => {
            if (accounts) {
                await tx.recurringRule.deleteMany({ where: { userId } });
                await tx.transaction.deleteMany({ where: { userId } });
                await tx.account.deleteMany({ where: { userId } });
            } else if (transactions) {
                await tx.recurringRule.deleteMany({ where: { userId } });
                await tx.transaction.deleteMany({ where: { userId } });
            }

            if (budgets) {
                await tx.budget.deleteMany({ where: { userId } });
            }
        });

        if (transactions && !accounts) {
            await syncAccountBalances(prisma, userId);
        }

        res.json({ message: 'Data cleared successfully' });
    } catch (error) {
        next(error);
    }
});

export default router;
