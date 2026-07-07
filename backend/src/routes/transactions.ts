import { Router } from 'express';
import { z } from 'zod';
import { decrypt } from './aiSettings.js';

const router = Router();

// First day of the month after "YYYY-MM" (exclusive upper bound for month filters,
// correct for all month lengths unlike the old `lte: "YYYY-MM-31"`)
const nextMonthStart = (month: string): string => {
    const [y, m] = month.split('-').map(Number);
    const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
    return `${next}-01`;
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
const transactionSchema = z.object({
    accountId: z.string(),
    transferToAccountId: z.string().nullish(),
    categoryId: z.string().nullish(),
    amount: z.number().positive(),
    type: z.enum(['income', 'expense', 'transfer']),
    date: z.string(),
    note: z.string(),
});

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
        if (endDate) where.date = { ...where.date, lte: endDate };
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

        const aiConfig = await prisma.aiSettings.findUnique({ where: { userId } });

        if (!aiConfig?.enabled) {
            return res.status(400).json({ error: 'AI transaction parsing is disabled' });
        }
        
        const apiKey = decrypt(aiConfig.encryptedApiKey);
        if (!apiKey) {
            return res.status(400).json({ error: 'AI API key is missing' });
        }

        if (aiConfig.provider === 'custom' && !aiConfig.baseUrl) {
            return res.status(400).json({ error: 'Custom AI provider requires a base URL' });
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

        const response = await fetch(getAiEndpoint(aiConfig.provider, aiConfig.baseUrl), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                ...(aiConfig.provider === 'openrouter' ? { 'HTTP-Referer': 'http://localhost:3000', 'X-Title': 'ExpenseVision' } : {})
            },
            body: JSON.stringify({
                model: aiConfig.model,
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
            return res.status(502).json({ error: `AI provider request failed: ${errorBody.slice(0, 180)}` });
        }

        const data = await response.json() as any;
        const content = data.choices?.[0]?.message?.content;
        if (!content) {
            return res.status(502).json({ error: 'AI provider returned an empty response' });
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

// POST /api/transactions/bulk - Bulk create transactions
router.post('/bulk', async (req, res, next) => {
    try {
        const prisma = (req as any).prisma;
        const userId = (req as any).userId;
        const { transactions } = req.body;

        if (!Array.isArray(transactions) || transactions.length === 0) {
            return res.status(400).json({ error: 'Invalid transactions data' });
        }

        const result = await prisma.$transaction(async (tx: any) => {
            let createdCount = 0;

            for (const rawData of transactions) {
                const data = {
                    ...rawData,
                    date: normalizeTransactionDate(rawData.date)
                };
                // Create transaction
                await tx.transaction.create({
                    data: {
                        ...data,
                        userId
                    }
                });

                // Update source account balance
                const sourceAccount = await tx.account.findUnique({
                    where: { id: data.accountId }
                });

                if (sourceAccount) {
                    let newSourceBalance = sourceAccount.balance;
                    if (data.type === 'expense' || data.type === 'transfer') {
                        newSourceBalance -= data.amount;
                    } else if (data.type === 'income') {
                        newSourceBalance += data.amount;
                    }

                    await tx.account.update({
                        where: { id: data.accountId },
                        data: { balance: newSourceBalance }
                    });
                }

                // Update destination account for transfers
                if (data.type === 'transfer' && data.transferToAccountId) {
                    const destAccount = await tx.account.findUnique({
                        where: { id: data.transferToAccountId }
                    });

                    if (destAccount) {
                        await tx.account.update({
                            where: { id: data.transferToAccountId },
                            data: { balance: destAccount.balance + data.amount }
                        });
                    }
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

        // Start transaction
        const result = await prisma.$transaction(async (tx: any) => {
            // Create transaction
            const transaction = await tx.transaction.create({
                data: {
                    ...data,
                    userId
                }
            });

            // Update source account balance
            const sourceAccount = await tx.account.findUnique({
                where: { id: data.accountId }
            });

            if (!sourceAccount) {
                throw new Error('Source account not found');
            }

            let newSourceBalance = sourceAccount.balance;
            if (data.type === 'expense' || data.type === 'transfer') {
                newSourceBalance -= data.amount;
            } else if (data.type === 'income') {
                newSourceBalance += data.amount;
            }

            await tx.account.update({
                where: { id: data.accountId },
                data: { balance: newSourceBalance }
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
                    data: { balance: destAccount.balance + data.amount }
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

        // Validate request body
        const parsedData = transactionSchema.partial().parse(req.body);
        const data = {
            ...parsedData,
            ...(parsedData.date ? { date: normalizeTransactionDate(parsedData.date) as string } : {})
        };

        const result = await prisma.$transaction(async (tx: any) => {
            // Get old transaction
            const oldTransaction = await tx.transaction.findUnique({
                where: { id }
            });

            if (!oldTransaction || oldTransaction.userId !== userId) {
                throw new Error('Transaction not found');
            }

            // Reverse old transaction effects
            const oldSourceAccount = await tx.account.findUnique({
                where: { id: oldTransaction.accountId }
            });

            if (!oldSourceAccount) {
                throw new Error('Source account not found');
            }

            let reversedBalance = oldSourceAccount.balance;
            if (oldTransaction.type === 'expense' || oldTransaction.type === 'transfer') {
                reversedBalance += oldTransaction.amount;
            } else if (oldTransaction.type === 'income') {
                reversedBalance -= oldTransaction.amount;
            }

            await tx.account.update({
                where: { id: oldTransaction.accountId },
                data: { balance: reversedBalance }
            });

            if (oldTransaction.type === 'transfer' && oldTransaction.transferToAccountId) {
                const oldDestAccount = await tx.account.findUnique({
                    where: { id: oldTransaction.transferToAccountId }
                });
                if (oldDestAccount) {
                    await tx.account.update({
                        where: { id: oldTransaction.transferToAccountId },
                        data: { balance: oldDestAccount.balance - oldTransaction.amount }
                    });
                }
            }

            // Update transaction
            const newTransaction = await tx.transaction.update({
                where: { id },
                data
            });

            // Apply new transaction effects
            const newSourceAccount = await tx.account.findUnique({
                where: { id: newTransaction.accountId }
            });

            if (!newSourceAccount) {
                throw new Error('Source account not found');
            }

            let newBalance = newSourceAccount.balance;
            if (newTransaction.type === 'expense' || newTransaction.type === 'transfer') {
                newBalance -= newTransaction.amount;
            } else if (newTransaction.type === 'income') {
                newBalance += newTransaction.amount;
            }

            await tx.account.update({
                where: { id: newTransaction.accountId },
                data: { balance: newBalance }
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
                    data: { balance: newDestAccount.balance + newTransaction.amount }
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
        const headers = ['Date', 'Time', 'Note', 'Amount', 'Type', 'Category', 'Account', 'Transfer To'];
        const rows = transactions.map((t: any) => {
            const formatted = formatDateForCsv(t.date);
            return [
                formatted.date,
                formatted.time,
                `"${t.note.replace(/"/g, '""')}"`,
                t.amount,
                t.type,
                t.category?.name || '',
                t.account.name,
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

export default router;
