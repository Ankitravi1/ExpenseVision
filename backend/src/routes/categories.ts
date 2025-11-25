import { Router } from 'express';
import { z } from 'zod';

const router = Router();

// Validation schema
const categorySchema = z.object({
    name: z.string().min(1),
    type: z.enum(['income', 'expense', 'transfer']),
    icon: z.string().optional()
});

// GET /api/categories - List all categories
router.get('/', async (req, res, next) => {
    try {
        const prisma = (req as any).prisma;
        const userId = (req as any).userId;

        const categories = await prisma.category.findMany({
            where: { userId },
            orderBy: { name: 'asc' }
        });

        res.json(categories);
    } catch (error) {
        next(error);
    }
});

// POST /api/categories - Create new category
router.post('/', async (req, res, next) => {
    try {
        const prisma = (req as any).prisma;
        const userId = (req as any).userId;

        const data = categorySchema.parse(req.body);

        const category = await prisma.category.create({
            data: {
                ...data,
                userId
            }
        });

        res.status(201).json(category);
    } catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({ error: 'Validation error', details: error.errors });
        } else {
            next(error);
        }
    }
});

// PUT /api/categories/:id - Update category
router.put('/:id', async (req, res, next) => {
    try {
        const prisma = (req as any).prisma;
        const userId = (req as any).userId;
        const { id } = req.params;

        const data = categorySchema.partial().parse(req.body);

        const category = await prisma.category.updateMany({
            where: { id, userId },
            data
        });

        if (category.count === 0) {
            return res.status(404).json({ error: 'Category not found' });
        }

        const updated = await prisma.category.findUnique({ where: { id } });
        res.json(updated);
    } catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({ error: 'Validation error', details: error.errors });
        } else {
            next(error);
        }
    }
});

// DELETE /api/categories/:id - Delete category
router.delete('/:id', async (req, res, next) => {
    try {
        const prisma = (req as any).prisma;
        const userId = (req as any).userId;
        const { id } = req.params;

        // Check if category has transactions or budgets
        const [transactionCount, budgetCount] = await Promise.all([
            prisma.transaction.count({ where: { categoryId: id } }),
            prisma.budget.count({ where: { categoryId: id } })
        ]);

        if (transactionCount > 0 || budgetCount > 0) {
            return res.status(400).json({
                error: 'Cannot delete category with existing transactions or budgets. Please delete or reassign them first.'
            });
        }

        const result = await prisma.category.deleteMany({
            where: { id, userId }
        });

        if (result.count === 0) {
            return res.status(404).json({ error: 'Category not found' });
        }

        res.status(204).send();
    } catch (error) {
        next(error);
    }
});

export default router;
