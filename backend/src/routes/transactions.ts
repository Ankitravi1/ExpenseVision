import { Router } from 'express';
import { z } from 'zod';
import { resolveAiForUser, GENERIC_AI_UNAVAILABLE, checkAndCountPlatformUsage } from './aiSettings.js';
import { syncAccountBalances } from './accounts.js';

const router = Router();

// First day of the month after "YYYY-MM" (exclusive upper bound for month filters,
// correct for all month lengths unlike the old `lte: "YYYY-MM-31"`)
const nextMonthStart = (month: string): string => {
    const [y, m] = month.split('-').map(Number);
    const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
    return `${next}-01`;
};

// Exclusive upper bound: midnight starting the day AFTER `endDate`. Dates can be
// stored as 'YYYY-MM-DDThh:mm', which sort after the plain 'YYYY-MM-DD', so a
// `lte: endDate` filter would drop same-day timestamped rows. `lt: nextDayStart`
// includes them regardless of the time component.
const nextDayStart = (value: string): string => {
    const datePart = String(value).split('T')[0];
    const [y, m, d] = datePart.split('-').map(Number);
    const next = new Date(y, m - 1, d + 1);
    return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`;
};

// Fires a push notification when an expense pushes a category over budget.
// Called after the DB transaction commits.
const checkBudgetAlert = async (prisma: any, userId: string, categoryId: string, dateStr: string) => {
    const budget = await prisma.budget.findFirst({
        where: { userId, categoryId },
        include: { category: true }
    });
    if (!budget) return;

    const date = new Date(dateStr);
    const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    const spent = await prisma.transaction.aggregate({
        where: {
            userId,
            categoryId,
            type: 'expense',
            date: {
                gte: `${monthStr}-01`,
                lt: nextMonthStart(monthStr)
            }
        },
        _sum: { amount: true }
    });

    const totalSpent = spent._sum.amount || 0;
    const threshold = (budget.alertThreshold ?? 100) / 100;
    if (totalSpent >= budget.amount * threshold) {
        const over = totalSpent > budget.amount;
        const title = over ? 'Budget Alert 🚨' : 'Budget Warning ⚠️';
        const message = over
            ? `You've exceeded your budget for ${budget.category.name}! Spent: ${totalSpent}, Limit: ${budget.amount}`
            : `You've reached ${Math.round((totalSpent / budget.amount) * 100)}% of your ${budget.category.name} budget (${totalSpent} of ${budget.amount})`;
        
        // Save persistent notification
        await prisma.notification.create({
            data: {
                userId,
                title,
                message
            }
        });

        const { sendNotification } = await import('./push.js');
        await sendNotification(userId, {
            title,
            body: message,
            icon: '/pwa-192x192.png'
        });
    }
};

// Validation schema (nullish: both clients send explicit null for unused fields)
const transactionBaseSchema = z.object({
    accountId: z.string(),
    transferToAccountId: z.string().nullish(),
    categoryId: z.string().nullish(),
    amount: z.number().positive(),
    type: z.enum(['income', 'expense', 'transfer']),
    date: z.string(),
    note: z.string(),
});

// A transfer moves money to another account, so it must name a destination —
// otherwise the source is debited and nothing is credited (money vanishes).
const transactionSchema = transactionBaseSchema.refine(
    (d) => d.type !== 'transfer' || !!d.transferToAccountId,
    { message: 'Transfer transactions require a destination account', path: ['transferToAccountId'] }
);

const parseTextSchema = z.object({
    text: z.string().min(3),
    preferredType: z.enum(['income', 'expense', 'transfer']).optional(),
});

const getAiEndpoint = (provider: string, baseUrl?: string) => {
    if (provider === 'deepseek') return 'https://api.deepseek.com/chat/completions';
    if (provider === 'openai') return 'https://api.openai.com/v1/chat/completions';
    if (provider === 'openrouter') return 'https://openrouter.ai/api/v1/chat/completions';
    if (provider === 'gemini') return 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
    return `${baseUrl?.replace(/\/$/, '')}/chat/completions`;
};

const extractJsonObject = (value: string) => {
    const start = value.indexOf('{');
    const end = value.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) {
        throw new Error('AI response did not include JSON');
    }
    return JSON.parse(value.slice(start, end + 1));
};

const normalize = (value?: string | null) => value?.trim().toLowerCase() || '';
const tokenize = (value?: string | null) => normalize(value).replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);

const findByIdOrName = <T extends { id: string; name: string }>(items: T[], value?: string | null) => {
    const needle = normalize(value);
    if (!needle) return undefined;
    return items.find(item => item.id === value) || items.find(item => normalize(item.name) === needle) || items.find(item => normalize(item.name).includes(needle));
};

const scoreItemByText = <T extends { name: string }>(item: T, text: string, aliases: Record<string, string[]> = {}) => {
    const textNorm = normalize(text);
    const textTokens = new Set(tokenize(text));
    const nameNorm = normalize(item.name);
    const nameTokens = tokenize(item.name);
    let score = 0;

    if (textNorm.includes(nameNorm)) score += 20;
    for (const token of nameTokens) {
        if (textTokens.has(token)) score += 4;
        if (textNorm.includes(token) && token.length >= 3) score += 2;
    }

    for (const alias of aliases[nameNorm] || []) {
        if (textTokens.has(alias) || textNorm.includes(alias)) score += 5;
    }

    return score;
};

const categoryAliases: Record<string, string[]> = {
    transportation: ['petrol', 'patrol', 'fuel', 'gas', 'cab', 'taxi', 'uber', 'ola', 'bus', 'train', 'metro'],
    groceries: ['food', 'grocery', 'groceries', 'vegetable', 'milk', 'bread'],
    shopping: ['shopping', 'clothes', 'amazon', 'flipkart'],
    dining: ['food', 'restaurant', 'pizza', 'burger', 'coffee', 'lunch', 'dinner'],
    'dining out': ['food', 'restaurant', 'pizza', 'burger', 'coffee', 'lunch', 'dinner'],
    salary: ['salary', 'payroll', 'wage'],
    cashback: ['cashback', 'refund', 'reward'],
};

const findBestByText = <T extends { id: string; name: string }>(items: T[], text: string, aliases: Record<string, string[]> = {}) => {
    const scored = items
        .map(item => ({ item, score: scoreItemByText(item, text, aliases) }))
        .sort((a, b) => b.score - a.score);

    if (scored.length === 1 && scored[0].score > 0) return scored[0].item;
    if (!scored.length || scored[0].score <= 0) return undefined;
    if (scored[1] && scored[0].score === scored[1].score) return undefined;
    return scored[0].item;
};

const formatDateForCsv = (value: string) => {
    const [datePart, timePart] = value.split('T');
    const normalized = normalizeTransactionDate(datePart) || datePart;
    const [year, month, day] = normalized.split('-');
    return {
        date: year && month && day ? `${day}-${month}-${year}` : datePart,
        time: timePart?.slice(0, 5) || ''
    };
};

const normalizeDatePart = (datePart: string) => {
    const trimmed = datePart.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
    const match = trimmed.match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (!match) return null;

    const [, day, month, year] = match;
    const parsed = new Date(Number(year), Number(month) - 1, Number(day));
    if (
        parsed.getFullYear() !== Number(year) ||
        parsed.getMonth() !== Number(month) - 1 ||
        parsed.getDate() !== Number(day)
    ) {
        return null;
    }

    return `${year}-${month}-${day}`;
};

const normalizeTransactionDate = (value?: string | null) => {
    if (!value) return value;
    const [datePart, timePart] = value.split('T');
    const normalized = normalizeDatePart(datePart);
    if (!normalized) return value;
    return timePart ? `${normalized}T${timePart}` : normalized;
};

const getCurrentDateTimeParts = () => {
    const now = new Date();
    return {
        date: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`,
        time: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    };
};

const normalizeTime = (value?: string | null) => {
    if (!value) return null;
    const trimmed = String(value).trim().toLowerCase();
    const hhmm = trimmed.match(/^(\d{1,2}):(\d{2})$/);
    if (hhmm) {
        const hour = Number(hhmm[1]);
        const minute = Number(hhmm[2]);
        if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
            return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
        }
    }

    const ampm = trimmed.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/);
    if (ampm) {
        let hour = Number(ampm[1]);
        const minute = Number(ampm[2] || '0');
        if (hour >= 1 && hour <= 12 && minute >= 0 && minute <= 59) {
            if (ampm[3] === 'pm' && hour !== 12) hour += 12;
            if (ampm[3] === 'am' && hour === 12) hour = 0;
            return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
        }
    }

    return null;
};

// GET /api/transactions - List all transactions with optional filters
router.get('/', async (req, res, next) => {
    try {
        const prisma = (req as any).prisma;
        const userId = (req as any).userId;
        const { startDate, endDate, type, categoryId, accountId } = req.query;

        const where: any = { userId };

        if (startDate) where.date = { ...where.date, gte: startDate };
        if (endDate) where.date = { ...where.date, lt: nextDayStart(endDate as string) };
        if (type) where.type = type;
        if (categoryId) where.categoryId = categoryId;
        if (accountId) where.accountId = accountId;

        const transactions = await prisma.transaction.findMany({
            where,
            orderBy: { date: 'desc' }
        });

        res.json(transactions);
    } catch (error) {
        next(error);
    }
});

// POST /api/transactions/parse-text - Parse natural language into a draft transaction
router.post('/parse-text', async (req, res, next) => {
    try {
        const prisma = (req as any).prisma;
        const userId = (req as any).userId;
        const { text, preferredType } = parseTextSchema.parse(req.body);

        // Resolve which AI key to use (the user's own, or the host/platform key
        // they rely on by default) — see resolveAiForUser in aiSettings.
        const resolution = await resolveAiForUser(prisma, userId, 'autoparse');
        if (!resolution.ok) {
            return res.status(resolution.status).json({ error: resolution.error });
        }
        const ai = resolution.config;

        // Only host-funded (platform-key) usage is capped; own-key users are unlimited.
        if (ai.source === 'platform') {
            const usage = await checkAndCountPlatformUsage(prisma, userId, 'autoparse');
            if (!usage.ok) return res.status(usage.status).json({ error: usage.error });
        }

        const [accounts, categories] = await Promise.all([
            prisma.account.findMany({ where: { userId }, select: { id: true, name: true, type: true } }),
            prisma.category.findMany({ where: { userId }, select: { id: true, name: true, type: true } })
        ]);

        const now = getCurrentDateTimeParts();
        const expenseCategories = categories.filter((category: any) => category.type === 'expense');
        const incomeCategories = categories.filter((category: any) => category.type === 'income');
        const scopedCategories = preferredType === 'income' ? incomeCategories : preferredType === 'expense' ? expenseCategories : [];
        const prompt = [
            'Parse the user text into one ExpenseVision transaction draft.',
            'Return only JSON with: type, amount, note, date, time, accountId, categoryId, transferToAccountId, confidence, missingFields.',
            'type must be income, expense, or transfer. date must be YYYY-MM-DD. time must be HH:MM in 24-hour format. amount must be a number.',
            ...(preferredType ? [`The user selected the ${preferredType} tab. Output type must be exactly ${preferredType}.`] : []),
            'Use only ids from the provided accounts and categories. Never invent or create a new account or category.',
            'Prefer exact ids. If unsure, return the closest existing accountName/categoryName from the provided lists; do not create a new name.',
            'Expense schema: type expense, amount, note, date, time, accountId, categoryId from expense categories, transferToAccountId null.',
            'Income schema: type income, amount, note, date, time, accountId, categoryId from income categories, transferToAccountId null.',
            'Transfer schema: type transfer, amount, note, date, time, accountId source account, transferToAccountId destination account, categoryId null.',
            'If the user does not mention a date, use the current date. If the user does not mention a time, use the current time.',
            `Current date is ${now.date}. Current time is ${now.time}.`,
            `Accounts: ${JSON.stringify(accounts)}`,
            `Expense categories: ${JSON.stringify(expenseCategories)}`,
            `Income categories: ${JSON.stringify(incomeCategories)}`,
            ...(preferredType === 'transfer' ? ['Transfer has no category.'] : [`Allowed categories for selected tab: ${JSON.stringify(scopedCategories)}`]),
            `User text: ${text}`
        ].join('\n');

        const response = await fetch(getAiEndpoint(ai.provider, ai.baseUrl), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${ai.apiKey}`,
                ...(ai.provider === 'openrouter' ? { 'HTTP-Referer': 'http://localhost:3000', 'X-Title': 'ExpenseVision' } : {})
            },
            body: JSON.stringify({
                model: ai.model,
                messages: [
                    { role: 'system', content: 'You convert short personal finance notes into strict JSON transaction drafts.' },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.1,
                response_format: { type: 'json_object' }
            })
        });

        if (!response.ok) {
            const errorBody = await response.text();
            return res.status(ai.maskErrors ? 503 : 502).json({ error: ai.maskErrors ? GENERIC_AI_UNAVAILABLE : `AI provider request failed: ${errorBody.slice(0, 180)}` });
        }

        const data = await response.json() as any;
        const content = data.choices?.[0]?.message?.content;
        if (!content) {
            return res.status(ai.maskErrors ? 503 : 502).json({ error: ai.maskErrors ? GENERIC_AI_UNAVAILABLE : 'AI provider returned an empty response' });
        }

        const parsed = extractJsonObject(content);
        const type = preferredType || (['income', 'expense', 'transfer'].includes(parsed.type) ? parsed.type : 'expense');
        const typeCategories = categories.filter((category: any) => category.type === type);
        const account = findByIdOrName(accounts, parsed.accountId || parsed.accountName) || findBestByText(accounts, `${parsed.accountName || ''} ${text}`);
        const category = type === 'transfer'
            ? undefined
            : findByIdOrName(typeCategories, parsed.categoryId || parsed.categoryName) ||
                findBestByText(typeCategories, `${parsed.categoryName || ''} ${parsed.note || ''} ${text}`, categoryAliases) ||
                (typeCategories.length === 1 ? typeCategories[0] : undefined);
        const transferToAccount = type === 'transfer'
            ? findByIdOrName(accounts, parsed.transferToAccountId || parsed.transferToAccountName) || findBestByText(accounts, `${parsed.transferToAccountName || ''} ${text}`)
            : undefined;
        const rawDateTime = String(parsed.dateTime || parsed.datetime || parsed.date || '');
        const [rawDatePart, rawTimePart] = rawDateTime.split('T');
        const parsedDate = normalizeDatePart(rawDatePart) || now.date;
        const parsedTime = normalizeTime(parsed.time || rawTimePart) || now.time;

        const missingFields = new Set<string>();
        if (!Number(parsed.amount) || Number(parsed.amount) <= 0) missingFields.add('amount');
        if (!account) missingFields.add('account');
        if (type !== 'transfer' && !category) missingFields.add('category');
        if (type === 'transfer' && !transferToAccount) missingFields.add('transferToAccount');

        res.json({
            type,
            amount: Number(parsed.amount) || 0,
            note: parsed.note || text,
            date: parsedDate,
            time: parsedTime,
            accountId: account?.id || '',
            categoryId: category?.id || '',
            transferToAccountId: transferToAccount?.id || '',
            accountName: account?.name || null,
            categoryName: category?.name || null,
            transferToAccountName: transferToAccount?.name || null,
            confidence: typeof parsed.confidence === 'number' ? parsed.confidence : null,
            missingFields: Array.from(missingFields),
            sourceText: text
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({ error: 'Validation error', details: error.errors });
        } else {
            next(error);
        }
    }
});

// POST /api/transactions/parse-statement - Use AI to parse multiple transactions from statement text
router.post('/parse-statement', async (req, res, next) => {
    try {
        const prisma = (req as any).prisma;
        const userId = (req as any).userId;
        const { text } = req.body;

        if (!text || text.trim().length < 10) {
            return res.status(400).json({ error: 'Please enter statement text to parse' });
        }

        // Resolve which AI key to use (the user's own, or the host/platform key
        // they rely on by default) — see resolveAiForUser in aiSettings.
        const resolution = await resolveAiForUser(prisma, userId, 'import');
        if (!resolution.ok) {
            return res.status(resolution.status).json({ error: resolution.error });
        }
        const ai = resolution.config;

        const [accounts, categories] = await Promise.all([
            prisma.account.findMany({ where: { userId }, select: { id: true, name: true, type: true } }),
            prisma.category.findMany({ where: { userId }, select: { id: true, name: true, type: true } })
        ]);

        const now = getCurrentDateTimeParts();
        const prompt = [
            'Parse the following bank statement text and extract all transactions as a strict JSON array.',
            'Return ONLY a JSON array, where each element is an object with EXACTLY the following fields:',
            '  - date: YYYY-MM-DD string',
            '  - note: transaction description',
            '  - amount: positive number',
            '  - type: "expense", "income", or "transfer"',
            '  - categoryName: suggested category name from the provided list, or null',
            '  - accountName: suggested account name from the provided list, or null',
            '  - transferToAccountName: destination account name if it is a transfer, or null',
            `Current year is ${now.date.split('-')[0]}.`,
            `Allowed categories: ${JSON.stringify(categories.map((c: any) => c.name))}`,
            `Allowed accounts: ${JSON.stringify(accounts.map((a: any) => a.name))}`,
            `Statement text:`,
            text
        ].join('\n');

        const response = await fetch(getAiEndpoint(ai.provider, ai.baseUrl), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${ai.apiKey}`,
                ...(ai.provider === 'openrouter' ? { 'HTTP-Referer': 'http://localhost:3000', 'X-Title': 'ExpenseVision' } : {})
            },
            body: JSON.stringify({
                model: ai.model,
                messages: [
                    { role: 'system', content: 'You extract lists of financial transactions from raw text into JSON arrays.' },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.1
            })
        });

        if (!response.ok) {
            const errorBody = await response.text();
            return res.status(ai.maskErrors ? 503 : 502).json({ error: ai.maskErrors ? GENERIC_AI_UNAVAILABLE : `AI provider request failed: ${errorBody.slice(0, 180)}` });
        }

        const resData = await response.json() as any;
        const content = resData.choices?.[0]?.message?.content;
        if (!content) {
            return res.status(ai.maskErrors ? 503 : 502).json({ error: ai.maskErrors ? GENERIC_AI_UNAVAILABLE : 'AI provider returned an empty response' });
        }

        const extractJsonArray = (val: string) => {
            const start = val.indexOf('[');
            const end = val.lastIndexOf(']');
            if (start === -1 || end === -1 || end <= start) {
                throw new Error('AI response did not include JSON array');
            }
            return JSON.parse(val.slice(start, end + 1));
        };

        const parsedArray = extractJsonArray(content);
        if (!Array.isArray(parsedArray)) {
            return res.status(502).json({ error: 'AI response did not return a list/array of transactions' });
        }

        const drafts = parsedArray.map((item: any) => {
            const type = ['expense', 'income', 'transfer'].includes(item.type) ? item.type : 'expense';
            const typeCategories = categories.filter((c: any) => c.type === type);
            
            const account = findByIdOrName(accounts, item.accountName);
            const category = type === 'transfer'
                ? undefined
                : findByIdOrName(typeCategories, item.categoryName);
            const transferToAccount = type === 'transfer'
                ? findByIdOrName(accounts, item.transferToAccountName)
                : undefined;

            const cleanDate = normalizeDatePart(item.date) || now.date;

            return {
                date: cleanDate,
                note: item.note || 'Unspecified transaction',
                amount: Number(item.amount) || 0,
                type,
                accountId: account?.id || '',
                accountName: account?.name || null,
                categoryId: category?.id || '',
                categoryName: category?.name || null,
                transferToAccountId: transferToAccount?.id || '',
                transferToAccountName: transferToAccount?.name || null,
            };
        });

        res.json({ drafts });
    } catch (error: any) {
        // Only surface a status/message when the error deliberately carries one;
        // never leak raw internal error text (stack, driver details) to the client.
        if (error && typeof error.status === 'number') {
            return res.status(error.status).json({ error: error.message || 'Failed to parse statement text' });
        }
        return res.status(500).json({ error: 'Failed to parse statement text' });
    }
});

// POST /api/transactions/bulk - Bulk create transactions
router.post('/bulk', async (req, res, next) => {
    try {
        const prisma = (req as any).prisma;
        const userId = (req as any).userId;
        const { transactions } = req.body;

        if (!Array.isArray(transactions) || transactions.length === 0) {
            return res.status(400).json({ error: 'Invalid transactions data' });
        }

        if (transactions.length > 500) {
            return res.status(400).json({ error: 'Bulk import limited to 500 transactions per batch.' });
        }

        // Validate every item up front; reject the whole batch on the first bad row
        // (prevents mass-assignment: only schema-known fields survive parsing).
        const validated: any[] = [];
        for (let i = 0; i < transactions.length; i++) {
            const parsed = transactionSchema.safeParse(transactions[i]);
            if (!parsed.success) {
                return res.status(400).json({
                    error: `Invalid transaction at row ${i}`,
                    details: parsed.error.errors
                });
            }
            validated.push({
                ...parsed.data,
                date: normalizeTransactionDate(parsed.data.date) as string
            });
        }

        // Verify every referenced account/category belongs to the caller (prevents
        // mutating other users' balances via forged ids).
        const accountIds = new Set<string>();
        const categoryIds = new Set<string>();
        for (const item of validated) {
            accountIds.add(item.accountId);
            if (item.transferToAccountId) accountIds.add(item.transferToAccountId);
            if (item.categoryId) categoryIds.add(item.categoryId);
        }

        const ownedAccounts = await prisma.account.findMany({
            where: { id: { in: [...accountIds] }, userId },
            select: { id: true, frozen: true }
        });
        if (ownedAccounts.length !== accountIds.size) {
            return res.status(403).json({ error: 'One or more accounts do not belong to you' });
        }
        if (ownedAccounts.some((a: any) => a.frozen)) {
            return res.status(400).json({ error: 'One or more accounts are frozen. Unfreeze them before adding transactions.' });
        }

        if (categoryIds.size > 0) {
            const ownedCategories = await prisma.category.findMany({
                where: { id: { in: [...categoryIds] }, userId },
                select: { id: true }
            });
            if (ownedCategories.length !== categoryIds.size) {
                return res.status(403).json({ error: 'One or more categories do not belong to you' });
            }
        }

        const result = await prisma.$transaction(async (tx: any) => {
            let createdCount = 0;

            for (const item of validated) {
                const isTransfer = item.type === 'transfer';

                // Whitelisted fields only — never spread the raw request object
                await tx.transaction.create({
                    data: {
                        userId,
                        accountId: item.accountId,
                        transferToAccountId: isTransfer ? (item.transferToAccountId ?? null) : null,
                        categoryId: isTransfer ? null : (item.categoryId ?? null),
                        amount: item.amount,
                        type: item.type,
                        date: item.date,
                        note: item.note
                    }
                });

                // Update source account balance atomically
                const delta = item.type === 'income' ? item.amount : -item.amount;
                await tx.account.update({
                    where: { id: item.accountId },
                    data: { balance: { increment: delta } }
                });

                // Update destination account for transfers
                if (isTransfer && item.transferToAccountId) {
                    await tx.account.update({
                        where: { id: item.transferToAccountId },
                        data: { balance: { increment: item.amount } }
                    });
                }
                createdCount++;
            }
            return createdCount;
        });

        res.status(201).json({ count: result });
    } catch (error) {
        next(error);
    }
});

// POST /api/transactions - Create new transaction
router.post('/', async (req, res, next) => {
    try {
        const prisma = (req as any).prisma;
        const userId = (req as any).userId;

        // Validate request body
        const data = {
            ...transactionSchema.parse(req.body),
            date: normalizeTransactionDate(req.body.date) as string
        };

        // Ownership checks before entering the DB transaction
        const ownedAccount = await prisma.account.findFirst({ where: { id: data.accountId, userId } });
        if (!ownedAccount) {
            return res.status(403).json({ error: 'Account does not belong to you' });
        }
        if (ownedAccount.frozen) {
            return res.status(400).json({ error: 'This account is frozen. Unfreeze it before adding transactions.' });
        }

        if (data.transferToAccountId) {
            const ownedTransferTo = await prisma.account.findFirst({ where: { id: data.transferToAccountId, userId } });
            if (!ownedTransferTo) {
                return res.status(403).json({ error: 'Transfer destination account does not belong to you' });
            }
            if (ownedTransferTo.frozen) {
                return res.status(400).json({ error: 'The destination account is frozen. Unfreeze it before adding transactions.' });
            }
        }

        if (data.categoryId) {
            const ownedCategory = await prisma.category.findFirst({ where: { id: data.categoryId, userId } });
            if (!ownedCategory) {
                return res.status(403).json({ error: 'Category does not belong to you' });
            }
        }

        // Start transaction
        const result = await prisma.$transaction(async (tx: any) => {
            // Create transaction
            const transaction = await tx.transaction.create({
                data: {
                    ...data,
                    userId
                }
            });

            // Update source account balance atomically
            const sourceAccount = await tx.account.findUnique({
                where: { id: data.accountId }
            });

            if (!sourceAccount) {
                throw new Error('Source account not found');
            }

            const delta = data.type === 'income' ? data.amount : -data.amount;
            await tx.account.update({
                where: { id: data.accountId },
                data: { balance: { increment: delta } }
            });

            // Update destination account for transfers
            if (data.type === 'transfer' && data.transferToAccountId) {
                const destAccount = await tx.account.findUnique({
                    where: { id: data.transferToAccountId }
                });

                if (!destAccount) {
                    throw new Error('Destination account not found');
                }

                await tx.account.update({
                    where: { id: data.transferToAccountId },
                    data: { balance: { increment: data.amount } }
                });
            }

            return transaction;
        });

        res.status(201).json(result);

        // Budget alert check runs AFTER the transaction has committed so the
        // notification can never fire for a rolled-back transaction
        if (data.type === 'expense' && data.categoryId) {
            checkBudgetAlert(prisma, userId, data.categoryId, data.date).catch(console.error);
        }
    } catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({ error: 'Validation error', details: error.errors });
        } else {
            next(error);
        }
    }
});

// PUT /api/transactions/:id - Update transaction
router.put('/:id', async (req, res, next) => {
    try {
        const prisma = (req as any).prisma;
        const userId = (req as any).userId;
        const { id } = req.params;

        // Validate request body (partial: only the fields being changed)
        const parsedData = transactionBaseSchema.partial().parse(req.body);

        // Load the existing row up front so we can validate the MERGED result and
        // enforce field conventions before touching balances.
        const existing = await prisma.transaction.findFirst({ where: { id, userId } });
        if (!existing) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        const mergedType = parsedData.type ?? existing.type;
        const mergedTransferTo = parsedData.transferToAccountId !== undefined
            ? parsedData.transferToAccountId
            : existing.transferToAccountId;

        // A transfer must always have a destination (money would otherwise vanish)
        if (mergedType === 'transfer' && !mergedTransferTo) {
            return res.status(400).json({ error: 'Transfer transactions require a destination account' });
        }

        // Ownership checks before entering the DB transaction
        if (parsedData.accountId) {
            const ownedAccount = await prisma.account.findFirst({ where: { id: parsedData.accountId, userId } });
            if (!ownedAccount) {
                return res.status(403).json({ error: 'Account does not belong to you' });
            }
            if (ownedAccount.frozen && parsedData.accountId !== existing.accountId) {
                return res.status(400).json({ error: 'This account is frozen. Unfreeze it before moving transactions into it.' });
            }
        }

        if (parsedData.transferToAccountId) {
            const ownedTransferTo = await prisma.account.findFirst({ where: { id: parsedData.transferToAccountId, userId } });
            if (!ownedTransferTo) {
                return res.status(403).json({ error: 'Transfer destination account does not belong to you' });
            }
            if (ownedTransferTo.frozen && parsedData.transferToAccountId !== existing.transferToAccountId) {
                return res.status(400).json({ error: 'The destination account is frozen. Unfreeze it before moving transactions into it.' });
            }
        }

        if (parsedData.categoryId) {
            const ownedCategory = await prisma.category.findFirst({ where: { id: parsedData.categoryId, userId } });
            if (!ownedCategory) {
                return res.status(403).json({ error: 'Category does not belong to you' });
            }
        }

        // Build the persisted patch, clearing fields that no longer apply to the
        // resulting type (stale transferToAccountId / categoryId otherwise linger).
        const data: any = {
            ...parsedData,
            ...(parsedData.date ? { date: normalizeTransactionDate(parsedData.date) as string } : {})
        };
        if (mergedType === 'transfer') {
            data.categoryId = null;
        } else {
            data.transferToAccountId = null;
        }

        const result = await prisma.$transaction(async (tx: any) => {
            // Get old transaction
            const oldTransaction = await tx.transaction.findUnique({
                where: { id }
            });

            if (!oldTransaction || oldTransaction.userId !== userId) {
                throw new Error('Transaction not found');
            }

            // Reverse old transaction effects atomically
            const oldSourceAccount = await tx.account.findUnique({
                where: { id: oldTransaction.accountId }
            });

            if (!oldSourceAccount) {
                throw new Error('Source account not found');
            }

            const oldDelta = oldTransaction.type === 'income' ? -oldTransaction.amount : oldTransaction.amount;
            await tx.account.update({
                where: { id: oldTransaction.accountId },
                data: { balance: { increment: oldDelta } }
            });

            if (oldTransaction.type === 'transfer' && oldTransaction.transferToAccountId) {
                const oldDestAccount = await tx.account.findUnique({
                    where: { id: oldTransaction.transferToAccountId }
                });
                if (oldDestAccount) {
                    await tx.account.update({
                        where: { id: oldTransaction.transferToAccountId },
                        data: { balance: { increment: -oldTransaction.amount } }
                    });
                }
            }

            // Update transaction
            const newTransaction = await tx.transaction.update({
                where: { id },
                data
            });

            // Apply new transaction effects atomically
            const newSourceAccount = await tx.account.findUnique({
                where: { id: newTransaction.accountId }
            });

            if (!newSourceAccount) {
                throw new Error('Source account not found');
            }

            const newDelta = newTransaction.type === 'income' ? newTransaction.amount : -newTransaction.amount;
            await tx.account.update({
                where: { id: newTransaction.accountId },
                data: { balance: { increment: newDelta } }
            });

            if (newTransaction.type === 'transfer' && newTransaction.transferToAccountId) {
                const newDestAccount = await tx.account.findUnique({
                    where: { id: newTransaction.transferToAccountId }
                });
                if (!newDestAccount) {
                    throw new Error('Destination account not found');
                }
                await tx.account.update({
                    where: { id: newTransaction.transferToAccountId },
                    data: { balance: { increment: newTransaction.amount } }
                });
            }

            return newTransaction;
        });

        res.json(result);
    } catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({ error: 'Validation error', details: error.errors });
        } else {
            next(error);
        }
    }
});

// DELETE /api/transactions/all - Delete all transactions for user
router.delete('/all', async (req, res, next) => {
    try {
        const prisma = (req as any).prisma;
        const userId = (req as any).userId;
        const { confirmationPhrase } = req.body || {};

        if (confirmationPhrase !== 'DELETE') {
            return res.status(400).json({ error: 'Type DELETE to confirm clearing all transactions' });
        }

        await prisma.$transaction(async (tx: any) => {
            // Get all transactions
            const transactions = await tx.transaction.findMany({
                where: { userId }
            });

            // Calculate balance adjustments per account
            const accountAdjustments = new Map<string, number>();

            for (const t of transactions) {
                // Reverse source account
                const currentSourceAdj = accountAdjustments.get(t.accountId) || 0;
                let sourceChange = 0;

                if (t.type === 'expense' || t.type === 'transfer') {
                    sourceChange = t.amount; // Add back
                } else if (t.type === 'income') {
                    sourceChange = -t.amount; // Remove
                }
                accountAdjustments.set(t.accountId, currentSourceAdj + sourceChange);

                // Reverse destination account (for transfers)
                if (t.type === 'transfer' && t.transferToAccountId) {
                    const currentDestAdj = accountAdjustments.get(t.transferToAccountId) || 0;
                    accountAdjustments.set(t.transferToAccountId, currentDestAdj - t.amount);
                }
            }

            // Apply adjustments
            for (const [accountId, adjustment] of accountAdjustments.entries()) {
                if (adjustment !== 0) {
                    await tx.account.update({
                        where: { id: accountId },
                        data: { balance: { increment: adjustment } }
                    });
                }
            }

            // Delete all transactions
            await tx.transaction.deleteMany({
                where: { userId }
            });
        });

        await syncAccountBalances(prisma, userId);

        res.status(204).send();
    } catch (error) {
        next(error);
    }
});

// DELETE /api/transactions/:id - Delete transaction
router.delete('/:id', async (req, res, next) => {
    try {
        const prisma = (req as any).prisma;
        const userId = (req as any).userId;
        const { id } = req.params;

        await prisma.$transaction(async (tx: any) => {
            // Get transaction
            const transaction = await tx.transaction.findUnique({
                where: { id }
            });

            if (!transaction || transaction.userId !== userId) {
                throw new Error('Transaction not found');
            }

            // Reverse transaction effects
            const sourceAccount = await tx.account.findUnique({
                where: { id: transaction.accountId }
            });

            if (!sourceAccount) {
                throw new Error('Source account not found');
            }

            let reversedBalance = sourceAccount.balance;
            if (transaction.type === 'expense' || transaction.type === 'transfer') {
                reversedBalance += transaction.amount;
            } else if (transaction.type === 'income') {
                reversedBalance -= transaction.amount;
            }

            await tx.account.update({
                where: { id: transaction.accountId },
                data: { balance: reversedBalance }
            });

            if (transaction.type === 'transfer' && transaction.transferToAccountId) {
                const destAccount = await tx.account.findUnique({
                    where: { id: transaction.transferToAccountId }
                });
                if (destAccount) {
                    await tx.account.update({
                        where: { id: transaction.transferToAccountId },
                        data: { balance: destAccount.balance - transaction.amount }
                    });
                }
            }

            // Delete transaction
            await tx.transaction.delete({
                where: { id }
            });
        });

        await syncAccountBalances(prisma, userId);

        res.status(204).send();
    } catch (error) {
        next(error);
    }
});

// GET /api/transactions/export - Export transactions as CSV
router.get('/export', async (req, res, next) => {
    try {
        const prisma = (req as any).prisma;
        const userId = (req as any).userId;

        const transactions = await prisma.transaction.findMany({
            where: { userId },
            include: {
                account: true,
                category: true,
                transferToAccount: true
            },
            orderBy: { date: 'desc' }
        });

        // Generate CSV
        const headers = ['Date', 'Time', 'Note', 'Amount', 'Account', 'Type', 'Category', 'Transfer To'];
        const rows = transactions.map((t: any) => {
            const formatted = formatDateForCsv(t.date);
            return [
                formatted.date,
                formatted.time,
                `"${t.note.replace(/"/g, '""')}"`,
                t.amount,
                t.account.name,
                t.type,
                t.category?.name || (t.type === 'transfer' ? 'Transfer' : ''),
                t.transferToAccount?.name || ''
            ];
        });

        const csv = [
            headers.join(','),
            ...rows.map((r: string[]) => r.join(','))
        ].join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=transactions_${new Date().toISOString().split('T')[0]}.csv`);
        res.send(csv);
    } catch (error) {
        next(error);
    }
});

// POST /api/transactions/bulk-delete - delete multiple transactions at once
router.post('/bulk-delete', async (req, res, next) => {
    try {
        const prisma = (req as any).prisma;
        const userId = (req as any).userId;
        const { ids } = req.body;

        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ error: 'Invalid transaction IDs' });
        }

        await prisma.$transaction(async (tx: any) => {
            for (const id of ids) {
                const transaction = await tx.transaction.findUnique({
                    where: { id }
                });

                if (!transaction || transaction.userId !== userId) {
                    continue;
                }

                // Reverse account balance effects
                const sourceAccount = await tx.account.findUnique({
                    where: { id: transaction.accountId }
                });

                if (sourceAccount) {
                    const delta = transaction.type === 'expense' || transaction.type === 'transfer'
                        ? transaction.amount
                        : -transaction.amount;
                    await tx.account.update({
                        where: { id: transaction.accountId },
                        data: { balance: { increment: delta } }
                    });
                }

                if (transaction.type === 'transfer' && transaction.transferToAccountId) {
                    const destAccount = await tx.account.findUnique({
                        where: { id: transaction.transferToAccountId }
                    });
                    if (destAccount) {
                        await tx.account.update({
                            where: { id: transaction.transferToAccountId },
                            data: { balance: { increment: -transaction.amount } }
                        });
                    }
                }

                // Delete transaction
                await tx.transaction.delete({
                    where: { id }
                });
            }
        });

        res.json({ message: `${ids.length} transactions deleted successfully` });
    } catch (error) {
        next(error);
    }
});

export default router;
