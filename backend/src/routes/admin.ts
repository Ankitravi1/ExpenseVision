import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { hashPassword } from '../utils/auth.js';
import { z } from 'zod';

const router = Router();

// The one designated superadmin email — cannot be deleted or demoted
const SUPERADMIN_EMAIL = 'ankitravione@gmail.com';

// Middleware to verify the user is THE superadmin
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
                googleId: true,
                createdAt: true
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(users);
    } catch (error) {
        next(error);
    }
});

// PUT /api/admin/users/:id/role - Change a user's role (cannot promote to superadmin, cannot touch the designated superadmin)
router.put('/users/:id/role', requireSuperAdmin, async (req: any, res, next) => {
    try {
        const { id } = req.params;
        const { role } = z.object({ role: z.enum(['user', 'admin']) }).parse(req.body);

        const target = await prisma.user.findUnique({ where: { id } });
        if (!target) return res.status(404).json({ error: 'User not found' });
        if (target.email === SUPERADMIN_EMAIL) {
            return res.status(400).json({ error: 'Cannot change the role of the designated superadmin' });
        }
        if (target.role === 'superadmin') {
            return res.status(400).json({ error: 'Cannot modify another superadmin account' });
        }

        const updated = await prisma.user.update({
            where: { id },
            data: { role },
            select: { id: true, email: true, name: true, role: true, googleId: true, createdAt: true }
        });
        res.json(updated);
    } catch (error: any) {
        if (error instanceof z.ZodError) return res.status(400).json({ error: 'Invalid role value' });
        next(error);
    }
});

// PUT /api/admin/users/:id/password - Reset a user's password
router.put('/users/:id/password', requireSuperAdmin, async (req: any, res, next) => {
    try {
        const { id } = req.params;
        const { password } = z.object({ password: z.string().min(8, 'Password must be at least 8 characters') }).parse(req.body);

        const target = await prisma.user.findUnique({ where: { id } });
        if (!target) return res.status(404).json({ error: 'User not found' });
        if (target.googleId && !target.password) {
            // Google-only user — allow setting a password for them
        }

        const hashed = await hashPassword(password);
        await prisma.user.update({
            where: { id },
            data: { password: hashed, emailVerified: true }
        });

        res.json({ message: 'Password updated successfully' });
    } catch (error: any) {
        if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors[0]?.message || 'Invalid input' });
        next(error);
    }
});

// DELETE /api/admin/users/:id - Delete a user and all their data
router.delete('/users/:id', requireSuperAdmin, async (req: any, res, next) => {
    try {
        const { id } = req.params;

        const target = await prisma.user.findUnique({ where: { id } });
        if (!target) return res.status(404).json({ error: 'User not found' });

        if (target.role === 'superadmin' || target.email === SUPERADMIN_EMAIL) {
            return res.status(400).json({ error: 'Cannot delete a superadmin account' });
        }
        if (id === req.userId) {
            return res.status(400).json({ error: 'You cannot delete your own account' });
        }

        await prisma.user.delete({ where: { id } });
        res.status(204).send();
    } catch (error) {
        next(error);
    }
});

export default router;
