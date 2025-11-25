import { Router } from 'express';
import { z } from 'zod';

const router = Router();

// Validation schema
const budgetSchema = z.object({
    categoryId: z.string(),
    amount: z.number().positive(),
    month: z.string().optional()
});

// GET /api/budgets - List all budgets with calculated spent amounts
router.get('/', async (req, res, next) => {
    try {
        const prisma = (req as any).prisma;
        const userId = (req as any).userId;

        const budgets = await prisma.budget.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' }
        });

        // Calculate spent for each budget
        const budgetsWithSpent = await Promise.all(
            budgets.map(async (budget: any) => {
                const whereClause: any = {
                    userId,
                    categoryId: budget.categoryId,
                    type: 'expense'
                };

                // If budget has a specific month, filter transactions by that month
                if (budget.month) {
                    const [year, month] = budget.month.split('-');
                    const startDate = `${year}-${month}-01`;
                    const endDate = new Date(parseInt(year), parseInt(month), 0).toISOString().split('T')[0];

                    whereClause.date = {
                        gte: startDate,
                        lte: endDate
                    };
                }

                const spent = await prisma.transaction.aggregate({
                    where: whereClause,
                    _sum: { amount: true }
                });

                return {
                    ...budget,
                    spent: spent._sum.amount || 0
                };
            })
        );

        res.json(budgetsWithSpent);
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

        // Upsert budget
        const budget = await prisma.budget.upsert({
            where: {
                userId_categoryId_month: {
                    userId,
                    categoryId: data.categoryId,
                    month: data.month || null
                }
            },
            update: {
                amount: data.amount
            },
            create: {
                ...data,
                userId
            }
        });

        // Calculate spent
        const whereClause: any = {
            userId,
            categoryId: budget.categoryId,
            type: 'expense'
        };

        if (budget.month) {
            const [year, month] = budget.month.split('-');
            const startDate = `${year}-${month}-01`;
            const endDate = new Date(parseInt(year), parseInt(month), 0).toISOString().split('T')[0];

            whereClause.date = {
                gte: startDate,
                lte: endDate
            };
        }

        const spent = await prisma.transaction.aggregate({
            where: whereClause,
            _sum: { amount: true }
        });

        res.status(201).json({
            ...budget,
            spent: spent._sum.amount || 0
        });
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
