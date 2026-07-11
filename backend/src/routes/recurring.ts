import { Router } from 'express';
import { z } from 'zod';

const router = Router();

const ruleSchema = z.object({
    note: z.string().min(1),
    amount: z.number().positive(),
    type: z.enum(['income', 'expense', 'transfer']),
    accountId: z.string(),
    transferToAccountId: z.string().nullish(),
    categoryId: z.string().nullish(),
    frequency: z.enum(['daily', 'weekly', 'monthly', 'yearly']),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullish(),
    active: z.boolean().optional()
});

const todayStr = (): string => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

const daysInMonth = (year: number, month: number): number => new Date(year, month, 0).getDate();

const fmt = (y: number, m: number, d: number): string =>
    `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

// Next occurrence after `dateStr`. dayAnchor keeps monthly/yearly rules on their
// original day (e.g. an EMI on the 31st falls on the 28th/30th in shorter months).
export const advanceDate = (dateStr: string, frequency: string, dayAnchor: number): string => {
    const [y, m, d] = dateStr.split('-').map(Number);
    if (frequency === 'daily') {
        const next = new Date(y, m - 1, d + 1);
        return fmt(next.getFullYear(), next.getMonth() + 1, next.getDate());
    }
    if (frequency === 'weekly') {
        const next = new Date(y, m - 1, d + 7);
        return fmt(next.getFullYear(), next.getMonth() + 1, next.getDate());
    }
    if (frequency === 'yearly') {
        return fmt(y + 1, m, Math.min(dayAnchor, daysInMonth(y + 1, m)));
    }
    // monthly
    const nextY = m === 12 ? y + 1 : y;
    const nextM = m === 12 ? 1 : m + 1;
    return fmt(nextY, nextM, Math.min(dayAnchor, daysInMonth(nextY, nextM)));
};

// Creates due transactions for all active rules of a user and advances nextRun.
// Called whenever a client loads initial data, so due items appear on next app open.
export const materializeRecurringRules = async (prisma: any, userId: string): Promise<number> => {
    const today = todayStr();
    const rules = await prisma.recurringRule.findMany({
        where: { userId, active: true, nextRun: { lte: today } }
    });

    const frozenAccountIds = new Set<string>(
        (await prisma.account.findMany({ where: { userId, frozen: true }, select: { id: true } }))
            .map((a: any) => a.id)
    );

    let created = 0;
    for (const rule of rules) {
        // A frozen account is paused entirely — skip materialization without
        // advancing nextRun, so occurrences resume from where they left off once unfrozen.
        if (frozenAccountIds.has(rule.accountId) || (rule.type === 'transfer' && rule.transferToAccountId && frozenAccountIds.has(rule.transferToAccountId))) {
            continue;
        }

        // Compute the due occurrence dates and the resulting nextRun BEFORE claiming
        // the rule, so the claim can advance nextRun in a single atomic write.
        const occurrences: string[] = [];
        let nextRun: string = rule.nextRun;
        while (nextRun <= today && occurrences.length < 100) {
            if (rule.endDate && nextRun > rule.endDate) break;
            occurrences.push(nextRun);
            nextRun = advanceDate(nextRun, rule.frequency, rule.dayAnchor);
        }

        const expired = Boolean(rule.endDate && nextRun > rule.endDate);

        const ruleCreated: number = await prisma.$transaction(async (tx: any) => {
            // Optimistic lock: only the caller that flips nextRun off its current
            // value wins. A concurrent request (e.g. a second device hitting
            // /initial-data) sees count 0 and skips, so occurrences never double-fire.
            const claim = await tx.recurringRule.updateMany({
                where: { id: rule.id, nextRun: rule.nextRun, active: true },
                data: { nextRun, ...(expired ? { active: false } : {}) }
            });
            if (claim.count === 0) {
                return 0;
            }

            // The account is fixed per rule, so check it once.
            const account = await tx.account.findUnique({ where: { id: rule.accountId } });
            if (!account) return 0; // account gone — nextRun already advanced past these

            let localCreated = 0;
            for (const occurrence of occurrences) {
                await tx.transaction.create({
                    data: {
                        userId,
                        accountId: rule.accountId,
                        transferToAccountId: rule.type === 'transfer' ? rule.transferToAccountId : null,
                        categoryId: rule.type === 'transfer' ? null : rule.categoryId,
                        amount: rule.amount,
                        type: rule.type,
                        date: occurrence,
                        note: rule.note ? `${rule.note}, recurring` : 'recurring'
                    }
                });

                const delta = rule.type === 'income' ? rule.amount : -rule.amount;
                await tx.account.update({
                    where: { id: rule.accountId },
                    data: { balance: { increment: delta } }
                });

                if (rule.type === 'transfer' && rule.transferToAccountId) {
                    await tx.account.update({
                        where: { id: rule.transferToAccountId },
                        data: { balance: { increment: rule.amount } }
                    });
                }

                localCreated++;
            }
            return localCreated;
        });

        created += ruleCreated;
    }
    return created;
};

// GET /api/recurring - list rules
router.get('/', async (req, res, next) => {
    try {
        const prisma = (req as any).prisma;
        const userId = (req as any).userId;
        const rules = await prisma.recurringRule.findMany({
            where: { userId },
            orderBy: { nextRun: 'asc' }
        });
        res.json(rules);
    } catch (error) {
        next(error);
    }
});

// POST /api/recurring - create rule
router.post('/', async (req, res, next) => {
    try {
        const prisma = (req as any).prisma;
        const userId = (req as any).userId;
        const data = ruleSchema.parse(req.body);

        if (data.type === 'transfer' && !data.transferToAccountId) {
            return res.status(400).json({ error: 'Transfer rules need a destination account' });
        }
        if (data.endDate && data.endDate < data.startDate) {
            return res.status(400).json({ error: 'End date must be after start date' });
        }

        // Ownership checks: a rule must only reference the caller's own resources
        const ownedAccount = await prisma.account.findFirst({ where: { id: data.accountId, userId } });
        if (!ownedAccount) {
            return res.status(403).json({ error: 'Account does not belong to you' });
        }
        if (ownedAccount.frozen) {
            return res.status(400).json({ error: 'This account is frozen. Unfreeze it before creating a recurring rule against it.' });
        }
        if (data.type === 'transfer' && data.transferToAccountId) {
            const ownedTransferTo = await prisma.account.findFirst({ where: { id: data.transferToAccountId, userId } });
            if (!ownedTransferTo) {
                return res.status(403).json({ error: 'Transfer destination account does not belong to you' });
            }
            if (ownedTransferTo.frozen) {
                return res.status(400).json({ error: 'The destination account is frozen. Unfreeze it before creating a recurring rule against it.' });
            }
        }
        if (data.type !== 'transfer' && data.categoryId) {
            const ownedCategory = await prisma.category.findFirst({ where: { id: data.categoryId, userId } });
            if (!ownedCategory) {
                return res.status(403).json({ error: 'Category does not belong to you' });
            }
        }

        const dayAnchor = Number(data.startDate.split('-')[2]);
        const rule = await prisma.recurringRule.create({
            data: {
                userId,
                note: data.note,
                amount: data.amount,
                type: data.type,
                accountId: data.accountId,
                transferToAccountId: data.type === 'transfer' ? data.transferToAccountId : null,
                categoryId: data.type === 'transfer' ? null : (data.categoryId ?? null),
                frequency: data.frequency,
                dayAnchor,
                nextRun: data.startDate,
                endDate: data.endDate ?? null,
                active: data.active ?? true
            }
        });
        res.status(201).json(rule);
    } catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({ error: 'Validation error', details: error.errors });
        } else {
            next(error);
        }
    }
});

// PUT /api/recurring/:id - update rule
router.put('/:id', async (req, res, next) => {
    try {
        const prisma = (req as any).prisma;
        const userId = (req as any).userId;
        const { id } = req.params;

        const existing = await prisma.recurringRule.findFirst({ where: { id, userId } });
        if (!existing) {
            return res.status(404).json({ error: 'Recurring rule not found' });
        }

        const data = ruleSchema.partial().parse(req.body);

        // Ownership checks — only for the fields actually being changed
        if (data.accountId !== undefined) {
            const ownedAccount = await prisma.account.findFirst({ where: { id: data.accountId, userId } });
            if (!ownedAccount) {
                return res.status(403).json({ error: 'Account does not belong to you' });
            }
            if (ownedAccount.frozen && data.accountId !== existing.accountId) {
                return res.status(400).json({ error: 'This account is frozen. Unfreeze it before assigning a recurring rule to it.' });
            }
        }
        if (data.transferToAccountId) {
            const ownedTransferTo = await prisma.account.findFirst({ where: { id: data.transferToAccountId, userId } });
            if (!ownedTransferTo) {
                return res.status(403).json({ error: 'Transfer destination account does not belong to you' });
            }
            if (ownedTransferTo.frozen && data.transferToAccountId !== existing.transferToAccountId) {
                return res.status(400).json({ error: 'The destination account is frozen. Unfreeze it before assigning a recurring rule to it.' });
            }
        }
        if (data.categoryId) {
            const ownedCategory = await prisma.category.findFirst({ where: { id: data.categoryId, userId } });
            if (!ownedCategory) {
                return res.status(403).json({ error: 'Category does not belong to you' });
            }
        }

        // When startDate changes, advance nextRun forward to today so past
        // occurrences are never re-materialized (a past startDate must not re-fire).
        let scheduleUpdate: any = {};
        if (data.startDate !== undefined) {
            const dayAnchor = Number(data.startDate.split('-')[2]);
            const frequency = data.frequency ?? existing.frequency;
            const today = todayStr();
            let nextRun = data.startDate;
            let iterations = 0;
            while (nextRun < today && iterations < 1000) {
                nextRun = advanceDate(nextRun, frequency, dayAnchor);
                iterations++;
            }
            scheduleUpdate = { nextRun, dayAnchor };
        }

        const updated = await prisma.recurringRule.update({
            where: { id },
            data: {
                ...(data.note !== undefined ? { note: data.note } : {}),
                ...(data.amount !== undefined ? { amount: data.amount } : {}),
                ...(data.type !== undefined ? { type: data.type } : {}),
                ...(data.accountId !== undefined ? { accountId: data.accountId } : {}),
                ...(data.transferToAccountId !== undefined ? { transferToAccountId: data.transferToAccountId ?? null } : {}),
                ...(data.categoryId !== undefined ? { categoryId: data.categoryId ?? null } : {}),
                ...(data.frequency !== undefined ? { frequency: data.frequency } : {}),
                ...scheduleUpdate,
                ...(data.endDate !== undefined ? { endDate: data.endDate ?? null } : {}),
                ...(data.active !== undefined ? { active: data.active } : {})
            }
        });
        res.json(updated);
    } catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({ error: 'Validation error', details: error.errors });
        } else {
            next(error);
        }
    }
});

// DELETE /api/recurring/:id - delete rule (already-created transactions stay)
router.delete('/:id', async (req, res, next) => {
    try {
        const prisma = (req as any).prisma;
        const userId = (req as any).userId;
        const { id } = req.params;

        const result = await prisma.recurringRule.deleteMany({ where: { id, userId } });
        if (result.count === 0) {
            return res.status(404).json({ error: 'Recurring rule not found' });
        }
        res.status(204).send();
    } catch (error) {
        next(error);
    }
});

// POST /api/recurring/:id/run - manually run rule once immediately
router.post('/:id/run', async (req, res, next) => {
    try {
        const prisma = (req as any).prisma;
        const userId = (req as any).userId;
        const { id } = req.params;

        const rule = await prisma.recurringRule.findFirst({ where: { id, userId } });
        if (!rule) {
            return res.status(404).json({ error: 'Recurring rule not found' });
        }

        const accountIdsToCheck = [rule.accountId, ...(rule.type === 'transfer' && rule.transferToAccountId ? [rule.transferToAccountId] : [])];
        const frozenAccount = await prisma.account.findFirst({ where: { id: { in: accountIdsToCheck }, frozen: true } });
        if (frozenAccount) {
            return res.status(400).json({ error: 'This rule references a frozen account. Unfreeze it before running the rule.' });
        }

        await prisma.$transaction(async (tx: any) => {
            // Create transaction
            await tx.transaction.create({
                data: {
                    userId,
                    accountId: rule.accountId,
                    transferToAccountId: rule.type === 'transfer' ? rule.transferToAccountId : null,
                    categoryId: rule.type === 'transfer' ? null : rule.categoryId,
                    amount: rule.amount,
                    type: rule.type,
                    date: rule.nextRun,
                    note: rule.note ? `${rule.note}, recurring` : 'recurring'
                }
            });

            // Update source account balance
            const delta = rule.type === 'income' ? rule.amount : -rule.amount;
            await tx.account.update({
                where: { id: rule.accountId },
                data: { balance: { increment: delta } }
            });

            // Update transfer destination account balance
            if (rule.type === 'transfer' && rule.transferToAccountId) {
                await tx.account.update({
                    where: { id: rule.transferToAccountId },
                    data: { balance: { increment: rule.amount } }
                });
            }

            // Advance scheduling
            const nextRun = advanceDate(rule.nextRun, rule.frequency, rule.dayAnchor);
            const expired = Boolean(rule.endDate && nextRun > rule.endDate);
            await tx.recurringRule.update({
                where: { id: rule.id },
                data: { nextRun, ...(expired ? { active: false } : {}) }
            });
        });

        res.json({ message: 'Rule executed manually successfully' });
    } catch (error) {
        next(error);
    }
});

export default router;
