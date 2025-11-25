import { Router } from 'express';
import { z } from 'zod';

const router = Router();

// Validation schema
const accountSchema = z.object({
    name: z.string().min(1),
    type: z.string(),
    balance: z.number().default(0),
    icon: z.string().optional(),
    logo: z.string().optional()
});

// GET /api/accounts - List all accounts
router.get('/', async (req, res, next) => {
    try {
        const prisma = (req as any).prisma;
        const userId = (req as any).userId;

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
