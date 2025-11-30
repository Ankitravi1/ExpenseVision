import { Router } from 'express';
import { z } from 'zod';

const router = Router();

// Validation schema
const transactionSchema = z.object({
    accountId: z.string(),
    transferToAccountId: z.string().optional(),
    categoryId: z.string().optional(),
    amount: z.number().positive(),
    type: z.enum(['income', 'expense', 'transfer']),
    date: z.string(),
    description: z.string()
});

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

            for (const data of transactions) {
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
        const data = transactionSchema.parse(req.body);

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

            // Update budget spent for expenses
            if (data.type === 'expense' && data.categoryId) {
                const budget = await tx.budget.findFirst({
                    where: {
                        userId,
                        categoryId: data.categoryId
                    }
                });

                // Note: Budget spent is calculated dynamically, not stored
            }

            return transaction;
        });

        res.status(201).json(result);
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
        const data = transactionSchema.partial().parse(req.body);

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
                await tx.account.update({
                    where: { id: oldTransaction.transferToAccountId },
                    data: { balance: oldDestAccount.balance - oldTransaction.amount }
                });
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
                await tx.account.update({
                    where: { id: transaction.transferToAccountId },
                    data: { balance: destAccount.balance - transaction.amount }
                });
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
        const headers = ['Date', 'Description', 'Amount', 'Type', 'Category', 'Account', 'Transfer To'];
        const rows = transactions.map((t: any) => [
            t.date,
            `"${t.description.replace(/"/g, '""')}"`,
            t.amount.toFixed(2),
            t.type,
            t.category?.name || '',
            t.account?.name || '',
            t.transferToAccount?.name || ''
        ]);

        // Calculate summary
        let totalIncome = 0;
        let totalExpense = 0;
        transactions.forEach((t: any) => {
            if (t.type === 'income') totalIncome += t.amount;
            if (t.type === 'expense') totalExpense += t.amount;
        });
        const netBalance = totalIncome - totalExpense;

        const csv = [
            headers.join(','),
            ...rows.map(r => r.join(',')),
            '',
            'Summary',
            `Total Income,${totalIncome.toFixed(2)}`,
            `Total Expenses,${totalExpense.toFixed(2)}`,
            `Net Balance,${netBalance.toFixed(2)}`
        ].join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=transactions_${new Date().toISOString().split('T')[0]}.csv`);
        res.send(csv);
    } catch (error) {
        next(error);
    }
});

export default router;
