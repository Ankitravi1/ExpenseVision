// Shared budget view computation used by /api/budgets and /api/initial-data.
//
// A budget with `month` set applies to that month only. A budget with no month
// repeats every month: `spent` is the CURRENT month's spend, and when `rollover`
// is on, last month's leftover (or overspend) is carried into `effectiveAmount`.

const monthStr = (offset = 0): string => {
    const now = new Date();
    const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const nextMonthStart = (month: string): string => {
    const [y, m] = month.split('-').map(Number);
    const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
    return `${next}-01`;
};

const spentInMonth = async (prisma: any, userId: string, categoryId: string, month: string): Promise<number> => {
    const result = await prisma.transaction.aggregate({
        where: {
            userId,
            categoryId,
            type: 'expense',
            date: { gte: `${month}-01`, lt: nextMonthStart(month) }
        },
        _sum: { amount: true }
    });
    return result._sum.amount || 0;
};

export interface BudgetView {
    [key: string]: any;
    spent: number;
    carryover: number;
    effectiveAmount: number;
}

export const budgetsWithSpent = async (prisma: any, userId: string, budgets?: any[]): Promise<BudgetView[]> => {
    const list = budgets ?? await prisma.budget.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' }
    });

    return Promise.all(
        list.map(async (budget: any) => {
            const month = budget.month || monthStr();
            const spent = await spentInMonth(prisma, userId, budget.categoryId, month);

            let carryover = 0;
            if (!budget.month && budget.rollover) {
                const prevSpent = await spentInMonth(prisma, userId, budget.categoryId, monthStr(-1));
                carryover = budget.amount - prevSpent;
            }

            return {
                ...budget,
                spent,
                carryover,
                effectiveAmount: Math.max(0, budget.amount + carryover)
            };
        })
    );
};
