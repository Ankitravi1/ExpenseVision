import { Router } from 'express';
import { prisma } from '../lib/prisma.js';

const router = Router();

// Middleware to verify the user is a superadmin
const requireSuperAdmin = async (req: any, res: any, next: any) => {
    try {
        const userId = req.userId;
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user || user.role !== 'superadmin') {
            return res.status(403).json({ error: 'Access forbidden: Super Admin role required' });
        }
        next();
    } catch (e) {
        next(e);
    }
};

// GET /api/admin/users - List all users
router.get('/users', requireSuperAdmin, async (req, res, next) => {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                createdAt: true
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(users);
    } catch (error) {
        next(error);
    }
});

// DELETE /api/admin/users/:id - Delete a user and all their data
router.delete('/users/:id', requireSuperAdmin, async (req: any, res, next) => {
    try {
        const { id } = req.params;

        if (id === req.userId) {
            return res.status(400).json({ error: 'You cannot delete your own superadmin account' });
        }

        await prisma.user.delete({
            where: { id }
        });

        res.status(204).send();
    } catch (error) {
        next(error);
    }
});

export default router;
