import crypto from 'crypto';
import { Router } from 'express';
import { z } from 'zod';

const router = Router();

const settingsSchema = z.object({
    enabled: z.boolean(),
    provider: z.string().min(1),
    model: z.string(), // Allow empty string for model initially
    baseUrl: z.string().nullish(),
    keys: z.record(z.array(z.string())).nullish(),
    customModels: z.record(z.array(z.string())).nullish()
});

const defaultSettings = {
    enabled: false,
    provider: 'deepseek',
    model: '',
    baseUrl: null,
    keys: {},
    customModels: {}
};

const getKey = (): Buffer | null => {
    const secret = process.env.AI_SETTINGS_SECRET;
    if (!secret) return null;
    return crypto.createHash('sha256').update(secret).digest();
};

const encrypt = (value: string): string => {
    const key = getKey();
    if (!key) throw new Error('AI_SETTINGS_SECRET is not configured');
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return [iv.toString('base64'), tag.toString('base64'), encrypted.toString('base64')].join('.');
};

export const decrypt = (value?: string | null): string => {
    if (!value) return '';
    const key = getKey();
    if (!key) throw new Error('AI_SETTINGS_SECRET is not configured');
    const [ivRaw, tagRaw, encryptedRaw] = value.split('.');
    if (!ivRaw || !tagRaw || !encryptedRaw) return '';
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivRaw, 'base64'));
    decipher.setAuthTag(Buffer.from(tagRaw, 'base64'));
    return Buffer.concat([
        decipher.update(Buffer.from(encryptedRaw, 'base64')),
        decipher.final()
    ]).toString('utf8');
};

router.get('/', async (req, res, next) => {
    try {
        const prisma = (req as any).prisma;
        const userId = (req as any).userId;
        const settings = await prisma.aiSettings.findUnique({ where: { userId } });

        if (!settings) return res.json(defaultSettings);

        let decryptedKeys: Record<string, string[]> = {};
        let parsedCustomModels: Record<string, string[]> = {};
        try {
            if (settings.keys) {
                const encryptedMap = JSON.parse(settings.keys);
                for (const [k, v] of Object.entries(encryptedMap)) {
                    if (Array.isArray(v)) {
                        decryptedKeys[k] = v.map((encryptedKey: string) => decrypt(encryptedKey));
                    }
                }
            }
            if (settings.customModels) {
                parsedCustomModels = JSON.parse(settings.customModels);
            }
        } catch (e) {
            console.error('Failed to parse keys or custom models', e);
        }

        res.json({
            enabled: settings.enabled,
            provider: settings.provider,
            model: settings.model,
            baseUrl: settings.baseUrl,
            keys: decryptedKeys,
            customModels: parsedCustomModels
        });
    } catch (error: any) {
        if (error.message?.includes('AI_SETTINGS_SECRET')) {
            return res.status(503).json({ error: 'AI settings encryption is not configured' });
        }
        next(error);
    }
});

router.put('/', async (req, res, next) => {
    try {
        const prisma = (req as any).prisma;
        const userId = (req as any).userId;
        const data = settingsSchema.parse(req.body);

        const encryptedKeys: Record<string, string[]> = {};
        if (data.keys) {
            for (const [k, v] of Object.entries(data.keys)) {
                if (Array.isArray(v) && v.length > 0) {
                    encryptedKeys[k] = v.map((key: string) => encrypt(key.trim()));
                }
            }
        }
        
        const keysJson = Object.keys(encryptedKeys).length ? JSON.stringify(encryptedKeys) : null;
        const customModelsJson = data.customModels && Object.keys(data.customModels).length ? JSON.stringify(data.customModels) : null;

        const saved = await prisma.aiSettings.upsert({
            where: { userId },
            create: {
                userId,
                enabled: data.enabled,
                provider: data.provider,
                model: data.model,
                baseUrl: data.baseUrl || null,
                keys: keysJson,
                customModels: customModelsJson
            },
            update: {
                enabled: data.enabled,
                provider: data.provider,
                model: data.model,
                baseUrl: data.baseUrl || null,
                keys: keysJson,
                customModels: customModelsJson
            }
        });

        res.json({
            enabled: saved.enabled,
            provider: saved.provider,
            model: saved.model,
            baseUrl: saved.baseUrl,
            keys: data.keys || {},
            customModels: data.customModels || {}
        });
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: 'Validation error', details: error.errors });
        }
        if (error.message?.includes('AI_SETTINGS_SECRET')) {
            return res.status(503).json({ error: 'AI settings encryption is not configured' });
        }
        next(error);
    }
});

router.delete('/', async (req, res, next) => {
    try {
        const prisma = (req as any).prisma;
        const userId = (req as any).userId;
        await prisma.aiSettings.deleteMany({ where: { userId } });
        res.status(204).send();
    } catch (error) {
        next(error);
    }
});

export default router;
