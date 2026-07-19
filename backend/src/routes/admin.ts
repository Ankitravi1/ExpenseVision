import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { hashPassword } from '../utils/auth.js';
import { z } from 'zod';
import { encrypt, decrypt } from './aiSettings.js';

const router = Router();

// The one designated superadmin email — cannot be deleted or demoted.
// Overridable via env so it can change without a code edit; the current value
// remains the default.
const SUPERADMIN_EMAIL = process.env.SUPERADMIN_EMAIL || 'ankitravione@gmail.com';

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
                plan: true,
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

// PUT /api/admin/users/:id/plan - Set a user's billing plan (free | pro)
router.put('/users/:id/plan', requireSuperAdmin, async (req: any, res, next) => {
    try {
        const { id } = req.params;
        const { plan } = z.object({ plan: z.enum(['free', 'pro']) }).parse(req.body);
        const target = await prisma.user.findUnique({ where: { id } });
        if (!target) return res.status(404).json({ error: 'User not found' });
        const updated = await prisma.user.update({
            where: { id },
            data: { plan },
            select: { id: true, email: true, name: true, role: true, plan: true, googleId: true, createdAt: true },
        });
        res.json(updated);
    } catch (error: any) {
        if (error instanceof z.ZodError) return res.status(400).json({ error: 'Invalid plan value' });
        next(error);
    }
});

// ---- Platform AI config (host-provided key that users rely on by default) ----
// Mirrors the per-user AiSettings shape so the admin UI can reuse the same
// multi-provider component. Keys are stored encrypted; the superadmin (who set
// them) may read them back, exactly as a user reads back their own keys.

router.get('/platform-ai', requireSuperAdmin, async (_req, res, next) => {
    try {
        const p = await prisma.platformSettings.findUnique({ where: { id: 'platform' } });
        if (!p) {
            return res.json({ aiEnabled: false, provider: 'deepseek', model: '', baseUrl: {}, keys: {}, customModels: {} });
        }
        const keys: Record<string, string[]> = {};
        try {
            if (p.aiKeys) {
                for (const [prov, arr] of Object.entries(JSON.parse(p.aiKeys))) {
                    if (Array.isArray(arr)) keys[prov] = arr.map((k: any) => decrypt(k));
                }
            }
        } catch (e) { /* ignore parse/decrypt errors -> empty */ }
        res.json({
            aiEnabled: p.aiEnabled,
            provider: p.aiProvider,
            model: p.aiModel,
            baseUrl: p.aiBaseUrl ? safeJson(p.aiBaseUrl, {}) : {},
            keys,
            customModels: p.aiCustomModels ? safeJson(p.aiCustomModels, {}) : {},
        });
    } catch (error: any) {
        if (error.message?.includes('AI_SETTINGS_SECRET')) return res.status(503).json({ error: 'AI settings encryption is not configured' });
        next(error);
    }
});

const platformAiSchema = z.object({
    aiEnabled: z.boolean(),
    provider: z.string().min(1),
    model: z.string(),
    baseUrl: z.record(z.string()).nullish(),
    keys: z.record(z.array(z.string())).nullish(),
    customModels: z.record(z.array(z.string())).nullish(),
});

router.put('/platform-ai', requireSuperAdmin, async (req, res, next) => {
    try {
        const data = platformAiSchema.parse(req.body);

        const encryptedKeys: Record<string, string[]> = {};
        if (data.keys) {
            for (const [prov, arr] of Object.entries(data.keys)) {
                if (Array.isArray(arr) && arr.length > 0) encryptedKeys[prov] = arr.map(k => encrypt(k.trim()));
            }
        }

        const saved = await prisma.platformSettings.upsert({
            where: { id: 'platform' },
            create: {
                id: 'platform',
                aiEnabled: data.aiEnabled,
                aiProvider: data.provider,
                aiModel: data.model,
                aiBaseUrl: data.baseUrl && Object.keys(data.baseUrl).length ? JSON.stringify(data.baseUrl) : null,
                aiKeys: Object.keys(encryptedKeys).length ? JSON.stringify(encryptedKeys) : null,
                aiCustomModels: data.customModels && Object.keys(data.customModels).length ? JSON.stringify(data.customModels) : null,
            },
            update: {
                aiEnabled: data.aiEnabled,
                aiProvider: data.provider,
                aiModel: data.model,
                aiBaseUrl: data.baseUrl && Object.keys(data.baseUrl).length ? JSON.stringify(data.baseUrl) : null,
                aiKeys: Object.keys(encryptedKeys).length ? JSON.stringify(encryptedKeys) : null,
                aiCustomModels: data.customModels && Object.keys(data.customModels).length ? JSON.stringify(data.customModels) : null,
            },
        });

        res.json({
            aiEnabled: saved.aiEnabled,
            provider: saved.aiProvider,
            model: saved.aiModel,
            baseUrl: data.baseUrl || {},
            keys: data.keys || {},
            customModels: data.customModels || {},
        });
    } catch (error: any) {
        if (error instanceof z.ZodError) return res.status(400).json({ error: 'Validation error', details: error.errors });
        if (error.message?.includes('AI_SETTINGS_SECRET')) return res.status(503).json({ error: 'AI settings encryption is not configured' });
        next(error);
    }
});

const safeJson = (val: string, fallback: any) => {
    try { const p = JSON.parse(val); return (p && typeof p === 'object') ? p : fallback; } catch { return fallback; }
};

export default router;
