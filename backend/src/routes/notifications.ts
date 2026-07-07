import { Router } from 'express';

const router = Router();

// GET /api/notifications - List all user notifications
router.get('/', async (req, res, next) => {
    try {
        const prisma = (req as any).prisma;
        const userId = (req as any).userId;

        const notifications = await prisma.notification.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' }
        });

        res.json(notifications);
    } catch (error) {
        next(error);
    }
});

// PUT /api/notifications/:id/read - Mark notification as read
router.put('/:id/read', async (req, res, next) => {
    try {
        const prisma = (req as any).prisma;
        const userId = (req as any).userId;
        const { id } = req.params;

        const notification = await prisma.notification.updateMany({
            where: { id, userId },
            data: { read: true }
        });

        if (notification.count === 0) {
            return res.status(404).json({ error: 'Notification not found' });
        }

        res.json({ success: true });
    } catch (error) {
        next(error);
    }
});

// DELETE /api/notifications - Clear all notifications
router.delete('/', async (req, res, next) => {
    try {
        const prisma = (req as any).prisma;
        const userId = (req as any).userId;

        await prisma.notification.deleteMany({
            where: { userId }
        });

        res.status(204).send();
    } catch (error) {
        next(error);
    }
});

export default router;
