import express from 'express';
import webpush from 'web-push';
import { authenticateToken } from '../middleware/auth';
import { prisma } from '../lib/prisma';

const router = express.Router();

// Configure web-push (optional feature — disabled when keys are missing)
export const isPushEnabled = Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
if (!isPushEnabled) {
    console.log('[push] VAPID keys not set — web push notifications disabled');
} else {
    webpush.setVapidDetails(
        'mailto:support@expensevision.local',
        process.env.VAPID_PUBLIC_KEY!,
        process.env.VAPID_PRIVATE_KEY!
    );
}

// GET /api/push/vapid-key
router.get('/vapid-key', authenticateToken, (req, res) => {
    if (!isPushEnabled) {
        return res.status(503).json({ error: 'Push notifications are not configured on this server' });
    }
    res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
});

// POST /api/push/subscribe
router.post('/subscribe', authenticateToken, async (req, res) => {
    try {
        const { subscription } = req.body;
        const userId = (req as any).userId;

        if (!subscription || !subscription.endpoint) {
            return res.status(400).json({ error: 'Invalid subscription object' });
        }

        // Save subscription to DB
        await prisma.pushSubscription.upsert({
            where: { endpoint: subscription.endpoint },
            update: {
                userId,
                keys: JSON.stringify(subscription.keys)
            },
            create: {
                userId,
                endpoint: subscription.endpoint,
                keys: JSON.stringify(subscription.keys)
            }
        });

        res.status(201).json({ message: 'Subscribed successfully' });
    } catch (error) {
        console.error('Subscription error:', error);
        res.status(500).json({ error: 'Failed to subscribe' });
    }
});

// Helper to send notification (can be imported elsewhere)
export const sendNotification = async (userId: string, payload: any) => {
    if (!isPushEnabled) return;
    try {
        const subscriptions = await prisma.pushSubscription.findMany({
            where: { userId }
        });

        const notifications = subscriptions.map(sub => {
            const pushSubscription = {
                endpoint: sub.endpoint,
                keys: JSON.parse(sub.keys)
            };
            return webpush.sendNotification(pushSubscription, JSON.stringify(payload))
                .catch(async err => {
                    if (err.statusCode === 410 || err.statusCode === 404) {
                        // Subscription expired or invalid, delete it
                        await prisma.pushSubscription.delete({ where: { id: sub.id } });
                    }
                    console.error('Push error:', err);
                });
        });

        await Promise.all(notifications);
    } catch (error) {
        console.error('Failed to send notifications:', error);
    }
};

export default router;
