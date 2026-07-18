import crypto from 'crypto';
import { Router } from 'express';
import { z } from 'zod';

const router = Router();

const settingsSchema = z.object({
    enabled: z.boolean(),
    importEnabled: z.boolean().optional(),
    autoParseEnabled: z.boolean().optional(),
    useOwnKey: z.boolean().optional(),
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
    useOwnKey: false,
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

export const encrypt = (value: string): string => {
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

// ---------------------------------------------------------------------------
// Shared AI resolution used by the transaction parsing routes.
//
// A user relies on the host/platform AI key by default (`useOwnKey = false`)
// and can switch to their own key. Whichever source is preferred, we fall back
// to the other if the preferred one isn't usable — so a brand-new user with no
// key gets platform AI, and existing users with their own key keep working even
// if the platform key isn't set.
// ---------------------------------------------------------------------------

const DEFAULT_PROVIDERS = ['deepseek', 'openai', 'openrouter', 'gemini'];

// Shown to users who rely on the platform key — they must never see internal
// details (missing key, provider errors, etc.). Advanced users who brought
// their own key still get the real error so they can fix their config.
export const GENERIC_AI_UNAVAILABLE = 'AI features are temporarily unavailable. Please try again later.';

export interface ResolvedAi {
    provider: string;
    model: string;
    apiKey: string;
    baseUrl: string;
    source: 'own' | 'platform';
    /** True when the caller should hide internal errors behind a generic message. */
    maskErrors: boolean;
}

const parseUserKey = (aiConfig: any): string => {
    if (!aiConfig?.keys) return '';
    try {
        const keysMap = JSON.parse(aiConfig.keys);
        const providerKeys = keysMap[aiConfig.provider] || [];
        if (Array.isArray(providerKeys) && providerKeys.length > 0) return decrypt(providerKeys[0]);
    } catch (e) {
        console.error('Failed to parse user AI keys:', e);
    }
    return '';
};

const parseUserBaseUrl = (aiConfig: any): string => {
    if (!aiConfig?.baseUrl) return '';
    try {
        const parsed = JSON.parse(aiConfig.baseUrl);
        if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
            return parsed[aiConfig.provider] || '';
        }
        return aiConfig.baseUrl;
    } catch (e) {
        return aiConfig.baseUrl;
    }
};

const EMPTY_PLATFORM = { enabled: false, provider: '', model: '', baseUrl: '', apiKey: '' };

export const getPlatformAiConfig = async (prisma: any): Promise<{ enabled: boolean; provider: string; model: string; baseUrl: string; apiKey: string }> => {
    let p;
    try {
        p = await prisma.platformSettings.findUnique({ where: { id: 'platform' } });
    } catch (e) {
        // Table may not exist yet (before `prisma db push`) — degrade to "no
        // platform config" so users relying on their own key keep working.
        return EMPTY_PLATFORM;
    }
    if (!p) return EMPTY_PLATFORM;
    let apiKey = '';
    try { apiKey = decrypt(p.aiKey); } catch (e) { /* misconfigured/rotated secret -> treat as no key */ }
    return { enabled: p.aiEnabled, provider: p.aiProvider, model: p.aiModel, baseUrl: p.aiBaseUrl || '', apiKey };
};

export const resolveAiForUser = async (
    prisma: any,
    userId: string,
    feature: 'import' | 'autoparse'
): Promise<{ ok: true; config: ResolvedAi } | { ok: false; status: number; error: string }> => {
    const aiConfig = await prisma.aiSettings.findUnique({ where: { userId } });
    const platform = await getPlatformAiConfig(prisma);

    // Advanced users (they chose to bring their own key) see real errors; anyone
    // relying on the platform key sees only a generic "unavailable" message.
    const maskErrors = aiConfig?.useOwnKey !== true;
    const detail = (real: string) => (maskErrors ? GENERIC_AI_UNAVAILABLE : real);

    // Respect the user's per-feature toggle when they have settings; brand-new
    // users (no row) default to on so platform AI works with zero setup.
    const featureOn = aiConfig
        ? (feature === 'import' ? aiConfig.importEnabled !== false : aiConfig.autoParseEnabled !== false)
        : true;
    if (!featureOn) {
        // A disabled toggle is the user's own choice, not an internal fault.
        return {
            ok: false,
            status: 400,
            error: feature === 'import' ? 'AI statement import is disabled' : 'AI quick entry transaction parsing is disabled',
        };
    }

    const ownKey = parseUserKey(aiConfig);
    const ownConfig: ResolvedAi | null = ownKey
        ? { provider: aiConfig.provider, model: aiConfig.model, apiKey: ownKey, baseUrl: parseUserBaseUrl(aiConfig), source: 'own', maskErrors }
        : null;
    const platformConfig: ResolvedAi | null = (platform.enabled && platform.apiKey)
        ? { provider: platform.provider, model: platform.model, apiKey: platform.apiKey, baseUrl: platform.baseUrl, source: 'platform', maskErrors }
        : null;

    const preferOwn = aiConfig?.useOwnKey === true;
    const chosen = preferOwn ? (ownConfig || platformConfig) : (platformConfig || ownConfig);

    if (!chosen) {
        return {
            ok: false,
            status: maskErrors ? 503 : 400,
            error: detail('No AI key available. Add your own key in Settings, or ask the admin to enable the platform AI key.'),
        };
    }
    if (!DEFAULT_PROVIDERS.includes(chosen.provider) && !chosen.baseUrl) {
        return { ok: false, status: maskErrors ? 503 : 400, error: detail(`AI provider ${chosen.provider} requires a base URL`) };
    }
    if (!chosen.model) {
        return { ok: false, status: maskErrors ? 503 : 400, error: detail('No AI model configured for the selected provider.') };
    }
    return { ok: true, config: chosen };
};

router.get('/', async (req, res, next) => {
    try {
        const prisma = (req as any).prisma;
        const userId = (req as any).userId;
        const settings = await prisma.aiSettings.findUnique({ where: { userId } });

        // Surface whether the host has a usable platform AI key so the UI can
        // tell the user they can rely on it without adding their own.
        const platform = await getPlatformAiConfig(prisma);
        const platformAvailable = platform.enabled && !!platform.apiKey;

        if (!settings) return res.json({ ...defaultSettings, platformAvailable });

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
            useOwnKey: settings.useOwnKey ?? false,
            provider: settings.provider,
            model: settings.model,
            baseUrl: cleanBaseUrl,
            keys: decryptedKeys,
            customModels: parsedCustomModels,
            platformAvailable
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
                useOwnKey: data.useOwnKey ?? false,
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
                useOwnKey: data.useOwnKey ?? false,
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
            useOwnKey: saved.useOwnKey,
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
        // Provider feedback (bad model, invalid key) is already surfaced above via the
        // 502 branch. Anything reaching here is an internal/network fault — return a
        // generic message so we don't leak stack traces or connection details.
        if (error && typeof error.status === 'number') {
            return res.status(error.status).json({ error: error.message || 'Connection test failed' });
        }
        return res.status(500).json({ error: 'Connection test failed' });
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
