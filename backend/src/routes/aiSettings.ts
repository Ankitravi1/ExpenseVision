import crypto from 'crypto';
import { Router } from 'express';
import { z } from 'zod';

const router = Router();

const settingsSchema = z.object({
    enabled: z.boolean(),
    importEnabled: z.boolean().optional(),
    autoParseEnabled: z.boolean().optional(),
    provider: z.string().min(1),
    model: z.string(), // Allow empty string for model initially
    baseUrl: z.union([z.string(), z.record(z.string())]).nullish(),
    keys: z.record(z.array(z.string())).nullish(),
    customModels: z.record(z.array(z.string())).nullish()
});

const defaultSettings = {
    enabled: false,
    importEnabled: true,
    autoParseEnabled: true,
    provider: 'deepseek',
    model: '',
    baseUrl: {},
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
        let parsedBaseUrl: Record<string, string> = {};
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
            if (settings.baseUrl) {
                try {
                    const parsed = JSON.parse(settings.baseUrl);
                    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
                        parsedBaseUrl = parsed;
                    } else {
                        parsedBaseUrl = { custom: settings.baseUrl };
                    }
                } catch (e) {
                    parsedBaseUrl = { custom: settings.baseUrl };
                }
            }
        } catch (e) {
            console.error('Failed to parse keys, custom models or baseUrl', e);
        }

        // Strip any legacy importEnabled/autoParseEnabled keys from baseUrl if stored there
        const { importEnabled: _ie, autoParseEnabled: _ape, ...cleanBaseUrl } = parsedBaseUrl as any;

        res.json({
            enabled: settings.enabled,
            importEnabled: settings.importEnabled ?? true,
            autoParseEnabled: settings.autoParseEnabled ?? true,
            provider: settings.provider,
            model: settings.model,
            baseUrl: cleanBaseUrl,
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

        let baseUrlJson: string | null = null;
        if (data.baseUrl) {
            // Strip any legacy boolean flags that might have been saved inside baseUrl
            const { importEnabled: _ie, autoParseEnabled: _ape, ...cleanBaseUrl } = (typeof data.baseUrl === 'object' && !Array.isArray(data.baseUrl) ? data.baseUrl : {}) as any;
            if (typeof data.baseUrl === 'object' && !Array.isArray(data.baseUrl)) {
                baseUrlJson = Object.keys(cleanBaseUrl).length ? JSON.stringify(cleanBaseUrl) : null;
            } else if (typeof data.baseUrl === 'string') {
                baseUrlJson = JSON.stringify({ custom: data.baseUrl });
            }
        }

        const saved = await prisma.aiSettings.upsert({
            where: { userId },
            create: {
                userId,
                enabled: data.enabled,
                importEnabled: data.importEnabled ?? true,
                autoParseEnabled: data.autoParseEnabled ?? true,
                provider: data.provider,
                model: data.model,
                baseUrl: baseUrlJson,
                keys: keysJson,
                customModels: customModelsJson
            },
            update: {
                enabled: data.enabled,
                importEnabled: data.importEnabled ?? true,
                autoParseEnabled: data.autoParseEnabled ?? true,
                provider: data.provider,
                model: data.model,
                baseUrl: baseUrlJson,
                keys: keysJson,
                customModels: customModelsJson
            }
        });

        let returnedBaseUrl: Record<string, string> = {};
        if (saved.baseUrl) {
            try {
                returnedBaseUrl = JSON.parse(saved.baseUrl);
            } catch (e) {
                returnedBaseUrl = { custom: saved.baseUrl };
            }
        }

        const { importEnabled: _ie2, autoParseEnabled: _ape2, ...cleanReturnedBaseUrl } = returnedBaseUrl as any;
        res.json({
            enabled: saved.enabled,
            importEnabled: saved.importEnabled,
            autoParseEnabled: saved.autoParseEnabled,
            provider: saved.provider,
            model: saved.model,
            baseUrl: cleanReturnedBaseUrl,
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

router.post('/test', async (req, res, next) => {
    try {
        const { provider, model, apiKey, baseUrl } = req.body;

        if (!provider) return res.status(400).json({ error: 'Provider is required' });
        if (!model) return res.status(400).json({ error: 'Model is required' });
        if (!apiKey) return res.status(400).json({ error: 'API key is required' });

        // Decrypt key if it's already encrypted
        let resolvedKey = apiKey;
        if (apiKey.includes('.') && apiKey.split('.').length === 3) {
            try {
                resolvedKey = decrypt(apiKey);
            } catch (e) {
                // Ignore and use as-is
            }
        }

        const getAiEndpoint = (prov: string, base?: string) => {
            if (prov === 'deepseek') return 'https://api.deepseek.com/chat/completions';
            if (prov === 'openai') return 'https://api.openai.com/v1/chat/completions';
            if (prov === 'openrouter') return 'https://openrouter.ai/api/v1/chat/completions';
            if (prov === 'gemini') return 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
            return `${base?.replace(/\/$/, '')}/chat/completions`;
        };

        const endpoint = getAiEndpoint(provider, baseUrl);
        if (!['deepseek', 'openai', 'openrouter', 'gemini'].includes(provider) && !baseUrl) {
            return res.status(400).json({ error: 'Custom providers require a base URL' });
        }

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${resolvedKey}`,
                ...(provider === 'openrouter' ? { 'HTTP-Referer': 'http://localhost:3000', 'X-Title': 'ExpenseVision' } : {})
            },
            body: JSON.stringify({
                model,
                messages: [
                    { role: 'user', content: 'Say "Connection successful!" and nothing else.' }
                ],
                temperature: 0.1,
                max_tokens: 20
            })
        });

        if (!response.ok) {
            const errorBody = await response.text();
            return res.status(502).json({ error: `Connection failed: ${errorBody.slice(0, 180)}` });
        }

        const responseData = await response.json() as any;
        const reply = responseData.choices?.[0]?.message?.content || 'Connection successful!';
        res.json({ success: true, message: reply });
    } catch (error: any) {
        res.status(500).json({ error: error.message || 'Internal test error' });
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
