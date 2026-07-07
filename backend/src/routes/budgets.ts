import { Router } from 'express';
import { z } from 'zod';
import { budgetsWithSpent } from '../services/budgets.js';

const router = Router();

// Validation schema
const budgetSchema = z.object({
    categoryId: z.string(),
    amount: z.number().positive(),
    month: z.string().nullish(),
    rollover: z.boolean().optional(),
    alertThreshold: z.number().min(1).max(500).optional()
});

// GET /api/budgets - List all budgets with calculated spent amounts
router.get('/', async (req, res, next) => {
    try {
        const prisma = (req as any).prisma;
        const userId = (req as any).userId;
        res.json(await budgetsWithSpent(prisma, userId));
    } catch (error) {
        next(error);
    }
});

// POST /api/budgets - Create or update budget (upsert)
router.post('/', async (req, res, next) => {
    try {
        const prisma = (req as any).prisma;
        const userId = (req as any).userId;

        const data = budgetSchema.parse(req.body);

        const month = data.month || "";

        const fields = {
            amount: data.amount,
            ...(data.rollover !== undefined ? { rollover: data.rollover } : {}),
            ...(data.alertThreshold !== undefined ? { alertThreshold: data.alertThreshold } : {})
        };

        const budget = await prisma.budget.upsert({
            where: {
                userId_categoryId_month: {
                    userId,
                    categoryId: data.categoryId,
                    month
                }
            },
            create: {
                categoryId: data.categoryId,
                month,
                userId,
                ...fields
            },
            update: fields
        });

        const [view] = await budgetsWithSpent(prisma, userId, [budget]);
        res.status(201).json(view);
    } catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({ error: 'Validation error', details: error.errors });
        } else {
            next(error);
        }
    }
});

// DELETE /api/budgets/:id - Delete budget
router.delete('/:id', async (req, res, next) => {
    try {
        const prisma = (req as any).prisma;
        const userId = (req as any).userId;
        const { id } = req.params;

        const result = await prisma.budget.deleteMany({
            where: { id, userId }
        });

        if (result.count === 0) {
            return res.status(404).json({ error: 'Budget not found' });
        }

        res.status(204).send();
    } catch (error) {
        next(error);
    }
});

export default router;
