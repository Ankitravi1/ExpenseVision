
import React, { useState, useContext, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Card } from '../components/Card';
import { Icon } from '../components/Icon';
import { AppContext } from '../App';
import { formatCurrency } from '../utils/currency';

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899', '#6b7280', '#14b8a6', '#d946ef'];

const PeriodNavigator: React.FC<{ date: Date; setDate: (date: Date) => void }> = ({ date, setDate }) => {
    const changeMonth = (offset: number) => {
        const newDate = new Date(date);
        newDate.setMonth(newDate.getMonth() + offset);
        setDate(newDate);
    };

    return (
        <div className="flex items-center justify-center space-x-4 mb-6">
            <button onClick={() => changeMonth(-1)} className="p-2 rounded-full hover:bg-gray-200">
                <Icon name="ChevronLeft" />
            </button>
            <h3 className="text-2xl font-bold text-gray-darkest w-48 text-center">
                {date.toLocaleString('default', { month: 'long', year: 'numeric' })}
            </h3>
            <button onClick={() => changeMonth(1)} className="p-2 rounded-full hover:bg-gray-200">
                <Icon name="ChevronRight" />
            </button>
        </div>
    );
};

const CategoryDetailRow: React.FC<{ name: string; value: string; percentage: number; color: string; icon: string }> = ({ name, value, percentage, color, icon }) => (
    <div className="flex items-center py-3">
        <div className="w-10 h-10 rounded-full bg-primary-light flex items-center justify-center mr-4">
            <Icon name={icon} className="text-primary" />
        </div>
        <div className="flex-1">
            <div className="flex justify-between items-center">
                <p className="font-semibold text-gray-darkest">{name}</p>
                <p className="font-bold text-danger">-{value}</p>
            </div>
            <div className="flex justify-between items-center mt-1">
                <div className="w-full bg-gray-200 rounded-full h-1.5 mr-4">
                    <div className="h-1.5 rounded-full" style={{ width: `${percentage}%`, backgroundColor: color }}></div>
                </div>
                <p className="text-sm text-gray-medium">{percentage.toFixed(2)}%</p>
            </div>
        </div>
    </div>
);

export const Reports: React.FC = () => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const { transactions, categories, budgets, currency } = useContext(AppContext)!;

    const { totalIncome, totalExpenses, netFlow, expenseData, insights } = useMemo(() => {
        // Filter transactions for the selected month
        const monthStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
        const monthlyTransactions = transactions.filter(t => t.date.startsWith(monthStr));

        // Fix: Explicitly type the accumulator 'sum' as a number to prevent type inference issues.
        const totalIncome = monthlyTransactions.filter(t => t.type === 'income').reduce((sum: number, t) => sum + t.amount, 0);
        // Fix: Explicitly type the accumulator 'sum' as a number to prevent type inference issues.
        const totalExpenses = monthlyTransactions.filter(t => t.type === 'expense').reduce((sum: number, t) => sum + t.amount, 0);

        // Fix: Explicitly type the accumulator `acc` to prevent type inference issues.
        const expenseByCategory = monthlyTransactions
            .filter(t => t.type === 'expense')
            .reduce((acc: { [key: string]: number }, t) => {
                const category = categories.find(c => c.id === t.categoryId);
                if (category) {
                    acc[category.name] = (acc[category.name] || 0) + t.amount;
                }
                return acc;
            }, {} as { [key: string]: number });
        
        const expenseData = (Object.entries(expenseByCategory) as [string, number][])
            .map(([name, value]) => ({ name, value, icon: categories.find(c=>c.name===name)?.icon || 'Tags' }))
            .sort((a, b) => b.value - a.value);

        // ---- Insights ----
        const prevDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
        const prevMonthStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
        const prevMonthLabel = prevDate.toLocaleString('default', { month: 'long' });
        const prevTransactions = transactions.filter(t => t.date.startsWith(prevMonthStr) && t.type === 'expense');
        const prevTotal = prevTransactions.reduce((sum: number, t) => sum + t.amount, 0);

        // 1. Total spend vs previous month
        const totalDeltaPct = prevTotal > 0 ? ((totalExpenses - prevTotal) / prevTotal) * 100 : null;

        // 2. Biggest category change vs previous month
        const spentByCat = (list: typeof transactions) =>
            list.reduce((acc: { [key: string]: number }, t) => {
                const key = t.categoryId || 'uncategorized';
                acc[key] = (acc[key] || 0) + t.amount;
                return acc;
            }, {} as { [key: string]: number });
        const curByCat = spentByCat(monthlyTransactions.filter(t => t.type === 'expense'));
        const prevByCat = spentByCat(prevTransactions);
        let biggestChange: { name: string; delta: number } | null = null;
        for (const id of new Set([...Object.keys(curByCat), ...Object.keys(prevByCat)])) {
            const delta = (curByCat[id] || 0) - (prevByCat[id] || 0);
            if (!biggestChange || Math.abs(delta) > Math.abs(biggestChange.delta)) {
                biggestChange = { name: categories.find(c => c.id === id)?.name || 'Uncategorized', delta };
            }
        }

        // 3. Spending pace vs total budget (current month only)
        const now = new Date();
        const isCurrentMonth = currentDate.getFullYear() === now.getFullYear() && currentDate.getMonth() === now.getMonth();
        let pace: { projected: number; totalBudget: number } | null = null;
        if (isCurrentMonth) {
            const totalBudget = budgets
                .filter(b => !b.month || b.month === monthStr)
                .reduce((sum: number, b) => sum + (b.effectiveAmount ?? b.amount), 0);
            if (totalBudget > 0 && now.getDate() > 0) {
                const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
                pace = { projected: (totalExpenses / now.getDate()) * daysInMonth, totalBudget };
            }
        }

        const insights = { totalDeltaPct, prevTotal, prevMonthLabel, biggestChange, pace };
        return { totalIncome, totalExpenses, netFlow: totalIncome - totalExpenses, expenseData, insights };
    }, [currentDate, transactions, categories, budgets]);

    const hasInsights = insights.totalDeltaPct !== null || (insights.biggestChange && insights.biggestChange.delta !== 0) || insights.pace;

    return (
        <div className="space-y-6">
            <PeriodNavigator date={currentDate} setDate={setCurrentDate} />

            {hasInsights && (
                <Card>
                    <h3 className="text-lg font-semibold mb-3 dark:text-gray-50">Insights</h3>
                    <div className="space-y-2.5 text-sm text-gray-600 dark:text-gray-300">
                        {insights.totalDeltaPct !== null && (
                            <div className="flex items-start gap-2.5">
                                <Icon
                                    name={insights.totalDeltaPct >= 0 ? 'TrendingUp' : 'TrendingDown'}
                                    size={18}
                                    className={insights.totalDeltaPct >= 0 ? 'text-danger mt-0.5' : 'text-success mt-0.5'}
                                />
                                <span>
                                    Spending is <strong>{Math.abs(insights.totalDeltaPct).toFixed(0)}% {insights.totalDeltaPct >= 0 ? 'higher' : 'lower'}</strong> than {insights.prevMonthLabel} ({formatCurrency(insights.prevTotal, currency)})
                                </span>
                            </div>
                        )}
                        {insights.biggestChange && insights.biggestChange.delta !== 0 && (
                            <div className="flex items-start gap-2.5">
                                <Icon name="ArrowLeftRight" size={18} className="text-primary mt-0.5" />
                                <span>
                                    Biggest change: <strong>{insights.biggestChange.name}</strong> ({insights.biggestChange.delta > 0 ? '+' : '−'}{formatCurrency(Math.abs(insights.biggestChange.delta), currency)} vs last month)
                                </span>
                            </div>
                        )}
                        {insights.pace && (
                            <div className="flex items-start gap-2.5">
                                <Icon
                                    name="Gauge"
                                    size={18}
                                    className={insights.pace.projected > insights.pace.totalBudget ? 'text-danger mt-0.5' : 'text-success mt-0.5'}
                                />
                                <span>
                                    At this pace you'll spend <strong>~{formatCurrency(insights.pace.projected, currency)}</strong> this month — {insights.pace.projected > insights.pace.totalBudget ? 'over' : 'within'} your {formatCurrency(insights.pace.totalBudget, currency)} total budget
                                </span>
                            </div>
                        )}
                    </div>
                </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 <Card>
                    <h4 className="text-gray-medium">Total Income</h4>
                    <p className="text-2xl font-bold text-success mt-1">+{formatCurrency(totalIncome, currency)}</p>
                </Card>
                <Card>
                    <h4 className="text-gray-medium">Total Expense</h4>
                    <p className="text-2xl font-bold text-danger mt-1">-{formatCurrency(totalExpenses, currency)}</p>
                </Card>
                <Card>
                    <h4 className="text-gray-medium">Balance</h4>
                    <p className={`text-2xl font-bold mt-1 ${netFlow >= 0 ? 'text-gray-darkest dark:text-gray-100' : 'text-danger'}`}>{formatCurrency(netFlow, currency)}</p>
                </Card>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <h3 className="text-lg font-semibold mb-4">Expense Distribution</h3>
                    <div style={{ width: '100%', height: 350 }}>
                        <ResponsiveContainer>
                            <PieChart>
                                <Pie data={expenseData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={70} outerRadius={120} fill="#8884d8" paddingAngle={2} labelLine={false}>
                                    {expenseData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                </Pie>
                                <Tooltip formatter={(value: number) => formatCurrency(value, currency)} />
                                <Legend iconType="circle"/>
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
                <Card>
                     <h3 className="text-lg font-semibold mb-2">Detailed Breakdown</h3>
                     <div className="divide-y divide-gray-200">
                        {expenseData.map((item, index) => (
                            <CategoryDetailRow
                                key={item.name}
                                name={item.name}
                                value={formatCurrency(item.value, currency)}
                                // Fix: Prevent division by zero if there are no expenses.
                                percentage={totalExpenses > 0 ? (item.value / totalExpenses) * 100 : 0}
                                color={COLORS[index % COLORS.length]}
                                icon={item.icon}
                            />
                        ))}
                     </div>
                </Card>
            </div>
        </div>
    );
};
