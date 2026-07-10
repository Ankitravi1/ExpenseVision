import React, { useState, useContext, useMemo, useRef } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Card } from '../components/Card';
import { Icon } from '../components/Icon';
import { AppContext } from '../App';
import { formatCurrency } from '../utils/currency';
import { ImportTransactionsModal } from '../components/ImportTransactionsModal';
import { formatTransactionDate, isoDateToDisplay } from '../utils/date';

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899', '#6b7280', '#14b8a6', '#d946ef'];

const CategoryDetailRow: React.FC<{ 
    name: string; 
    value: string; 
    percentage: number; 
    color: string; 
    icon: string 
}> = ({ name, value, percentage, color, icon }) => (
    <div className="flex items-center py-3">
        <div className="w-10 h-10 rounded-full bg-primary-light/50 dark:bg-primary/20 flex items-center justify-center mr-4 flex-shrink-0">
            <Icon name={icon || 'Tags'} className="text-primary dark:text-indigo-300" />
        </div>
        <div className="flex-1 min-w-0">
            <div className="flex justify-between items-center mb-1">
                <p className="font-bold text-sm text-gray-800 dark:text-gray-205 truncate">{name}</p>
                <p className="font-bold text-sm text-danger dark:text-rose-455">-{value}</p>
            </div>
            <div className="flex items-center gap-4">
                <div className="flex-1 bg-gray-200 rounded-full h-2 dark:bg-gray-700 overflow-hidden">
                    <div className="h-2 rounded-full transition-all" style={{ width: `${percentage}%`, backgroundColor: color }}></div>
                </div>
                <p className="text-xs font-bold text-gray-550 dark:text-gray-400 w-12 text-right">{percentage.toFixed(1)}%</p>
            </div>
        </div>
    </div>
);

export const Reports: React.FC = () => {
    const context = useContext(AppContext)!;
    const { transactions, categories, budgets, currency, accounts, theme } = context;

    const startDateRef = useRef<HTMLInputElement>(null);
    const endDateRef = useRef<HTMLInputElement>(null);

    // Helper to get YYYY-MM-DD in local time
    const getLocalDateString = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    // Initial dates match transactions page
    const [startDate, setStartDate] = useState(getLocalDateString(firstDayOfMonth));
    const [endDate, setEndDate] = useState(getLocalDateString(lastDayOfMonth));
    const [viewMode, setViewMode] = useState<string>('Monthly');
    const [carryOver, setCarryOver] = useState<boolean>(true);
    const [showInsights, setShowInsights] = useState<boolean>(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);

    const updateDatesForViewMode = (mode: string) => {
        if (mode === 'Custom') return;

        const now = new Date();
        let start: Date;
        let end: Date;

        switch (mode) {
            case 'Daily':
                start = now;
                end = now;
                break;
            case 'Weekly': {
                const day = now.getDay();
                const diffToMonday = now.getDate() - day + (day === 0 ? -6 : 1);
                start = new Date(now.getFullYear(), now.getMonth(), diffToMonday);
                end = new Date(now.getFullYear(), now.getMonth(), diffToMonday + 6);
                break;
            }
            case 'Monthly':
                start = new Date(now.getFullYear(), now.getMonth(), 1);
                end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                break;
            case '3 Month':
                start = new Date(now.getFullYear(), now.getMonth() - 3, 1);
                end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                break;
            case 'Yearly':
                start = new Date(now.getFullYear(), 0, 1);
                end = new Date(now.getFullYear(), 11, 31);
                break;
            default:
                return;
        }

        setStartDate(getLocalDateString(start));
        setEndDate(getLocalDateString(end));
    };

    // Navigation arrow shift functionality
    const handleShiftPeriod = (direction: -1 | 1) => {
        if (viewMode === 'Custom') return;

        const currentStart = new Date(startDate);
        let newStart = new Date(startDate);
        let newEnd = new Date(endDate);

        switch (viewMode) {
            case 'Daily':
                newStart.setDate(newStart.getDate() + direction);
                newEnd.setDate(newEnd.getDate() + direction);
                break;
            case 'Weekly':
                newStart.setDate(newStart.getDate() + (direction * 7));
                newEnd.setDate(newEnd.getDate() + (direction * 7));
                break;
            case 'Monthly':
                newStart = new Date(currentStart.getFullYear(), currentStart.getMonth() + direction, 1);
                newEnd = new Date(currentStart.getFullYear(), currentStart.getMonth() + direction + 1, 0);
                break;
            case '3 Month':
                newStart = new Date(currentStart.getFullYear(), currentStart.getMonth() + (direction * 3), 1);
                newEnd = new Date(currentStart.getFullYear(), currentStart.getMonth() + (direction * 3) + 3, 0);
                break;
            case 'Yearly':
                newStart = new Date(currentStart.getFullYear() + direction, 0, 1);
                newEnd = new Date(currentStart.getFullYear() + direction, 11, 31);
                break;
            default:
                return;
        }

        setStartDate(getLocalDateString(newStart));
        setEndDate(getLocalDateString(newEnd));
    };

    // Filtered transaction list for calculations (date-sliced safely to 10 chars)
    const dateFilteredTransactions = useMemo(() => {
        return transactions.filter(t => {
            const datePart = t.date.split('T')[0];
            if (startDate && endDate) {
                return datePart >= startDate && datePart <= endDate;
            }
            return true;
        });
    }, [transactions, startDate, endDate]);

    const totalIncome = useMemo(() => {
        return dateFilteredTransactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0);
    }, [dateFilteredTransactions]);

    const totalExpenses = useMemo(() => {
        return dateFilteredTransactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);
    }, [dateFilteredTransactions]);

    // Carry Over Calculations
    const preRangeBalance = useMemo(() => {
        if (!startDate) return 0;
        let incomeAndTransferIn = 0;
        let expenseAndTransferOut = 0;

        transactions.forEach(t => {
            const datePart = t.date.split('T')[0];
            if (datePart < startDate) {
                if (t.type === 'income') {
                    incomeAndTransferIn += t.amount;
                } else if (t.type === 'expense') {
                    expenseAndTransferOut += t.amount;
                } else if (t.type === 'transfer') {
                    incomeAndTransferIn += t.amount;
                    expenseAndTransferOut += t.amount;
                }
            }
        });

        const sumInitialBalances = accounts.reduce((sum, acc) => sum + acc.initialBalance, 0);
        return incomeAndTransferIn - expenseAndTransferOut + sumInitialBalances;
    }, [transactions, startDate, accounts]);

    const displayBalance = carryOver
        ? preRangeBalance + totalIncome - totalExpenses
        : totalIncome - totalExpenses;

    // Category Breakdown calculations
    const expenseData = useMemo(() => {
        const expenseByCategory = dateFilteredTransactions
            .filter(t => t.type === 'expense')
            .reduce((acc, t) => {
                const category = categories.find(c => c.id === t.categoryId);
                const name = category?.name || 'Uncategorized';
                acc[name] = (acc[name] || 0) + t.amount;
                return acc;
            }, {} as Record<string, number>);

        return (Object.entries(expenseByCategory) as [string, number][])
            .map(([name, value]) => ({
                name,
                value,
                icon: categories.find(c => c.name === name)?.icon || 'Tags'
            }))
            .sort((a, b) => b.value - a.value);
    }, [dateFilteredTransactions, categories]);

    // Extra Reports Metrics
    const burnRateMetrics = useMemo(() => {
        const startMs = new Date(startDate).getTime();
        const endMs = new Date(endDate).getTime();
        const days = Math.max(1, Math.round((endMs - startMs) / (1000 * 60 * 60 * 24)) + 1);
        const dailyBurn = totalExpenses / days;
        const topCategoryName = expenseData[0]?.name || 'None';
        const savingsRate = totalIncome > 0 ? Math.max(0, ((totalIncome - totalExpenses) / totalIncome) * 100) : 0;

        // Unbudgeted spending
        const activeBudgetsCatIds = budgets
            .filter(b => !b.month || b.month === startDate.substring(0, 7))
            .map(b => b.categoryId);
        const unbudgetedSpent = dateFilteredTransactions
            .filter(t => t.type === 'expense' && !activeBudgetsCatIds.includes(t.categoryId || ''))
            .reduce((sum, t) => sum + t.amount, 0);

        return { dailyBurn, topCategoryName, savingsRate, unbudgetedSpent };
    }, [totalExpenses, totalIncome, expenseData, budgets, startDate, endDate, dateFilteredTransactions]);

    // AI & Insights logic
    const insights = useMemo(() => {
        const prevDate = new Date(new Date(startDate).getFullYear(), new Date(startDate).getMonth() - 1, 1);
        const prevMonthStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
        const prevMonthLabel = prevDate.toLocaleString('default', { month: 'long' });
        const prevTransactions = transactions.filter(t => t.date.startsWith(prevMonthStr) && t.type === 'expense');
        const prevTotal = prevTransactions.reduce((sum, t) => sum + t.amount, 0);

        const totalDeltaPct = prevTotal > 0 ? ((totalExpenses - prevTotal) / prevTotal) * 100 : null;

        const spentByCat = (list: typeof transactions) =>
            list.reduce((acc: { [key: string]: number }, t) => {
                const key = t.categoryId || 'uncategorized';
                acc[key] = (acc[key] || 0) + t.amount;
                return acc;
            }, {} as { [key: string]: number });
        const curByCat = spentByCat(dateFilteredTransactions.filter(t => t.type === 'expense'));
        const prevByCat = spentByCat(prevTransactions);

        let biggestChange: { name: string; delta: number } | null = null;
        for (const id of new Set([...Object.keys(curByCat), ...Object.keys(prevByCat)])) {
            const delta = (curByCat[id] || 0) - (prevByCat[id] || 0);
            if (!biggestChange || Math.abs(delta) > Math.abs(biggestChange.delta)) {
                biggestChange = { name: categories.find(c => c.id === id)?.name || 'Uncategorized', delta };
            }
        }

        const isCurrentMonth = new Date(startDate).getMonth() === new Date().getMonth();
        let pace: { projected: number; totalBudget: number } | null = null;
        if (isCurrentMonth) {
            const totalBudget = budgets
                .filter(b => !b.month || b.month === startDate.substring(0, 7))
                .reduce((sum, b) => sum + (b.effectiveAmount ?? b.amount), 0);
            if (totalBudget > 0 && new Date().getDate() > 0) {
                const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
                pace = { projected: (totalExpenses / new Date().getDate()) * daysInMonth, totalBudget };
            }
        }

        return { totalDeltaPct, prevTotal, prevMonthLabel, biggestChange, pace };
    }, [startDate, totalExpenses, transactions, dateFilteredTransactions, categories, budgets]);

    const hasInsights = insights.totalDeltaPct !== null || (insights.biggestChange && insights.biggestChange.delta !== 0) || insights.pace;

    // Export CSV (matched order: Date, Time, Note, Category, Amount, Account, Type, Transfer To)
    const exportToCSV = () => {
        const headers = ['Date', 'Time', 'Note', 'Amount', 'Account', 'Type', 'Category', 'Transfer To'];
        const rows = dateFilteredTransactions.map(transaction => {
            const category = categories.find(c => c.id === transaction.categoryId);
            const account = accounts.find(a => a.id === transaction.accountId);
            const transferAccount = transaction.transferToAccountId
                ? accounts.find(a => a.id === transaction.transferToAccountId)
                : null;
            const localTime = new Date(transaction.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

            return [
                formatTransactionDate(transaction.date),
                localTime,
                `"${transaction.note.replace(/"/g, '""')}"`,
                transaction.amount.toFixed(2),
                account?.name || '',
                transaction.type,
                category?.name || (transaction.type === 'transfer' ? 'Transfer' : ''),
                transferAccount?.name || ''
            ];
        });

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `expensevision_reports_${startDate}_to_${endDate}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-6">
            {/* Header controls matching Transactions page exactly */}
            <div className="flex flex-wrap justify-between items-center gap-4 border-b border-gray-100 dark:border-gray-800 pb-4">
                <div className="flex items-center gap-3 flex-wrap">
                    {/* View Filter with period shift buttons */}
                    <div className="flex items-center bg-gray-100 dark:bg-gray-800 p-1 rounded-xl border border-gray-200 dark:border-gray-700">
                        {viewMode !== 'Custom' && (
                            <button
                                onClick={() => handleShiftPeriod(-1)}
                                className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
                                title="Go back period"
                            >
                                <Icon name="ChevronLeft" size={14} />
                            </button>
                        )}

                        <label htmlFor="view-mode" className="text-[10px] font-bold text-gray-500 dark:text-gray-405 px-2 uppercase">View</label>
                        <select
                            id="view-mode"
                            value={viewMode}
                            onChange={(e) => {
                                const mode = e.target.value;
                                setViewMode(mode);
                                updateDatesForViewMode(mode);
                            }}
                            className="input text-xs py-1 px-2.5 bg-white dark:bg-gray-700 border border-gray-250 dark:border-gray-600 rounded-lg text-gray-800 dark:text-gray-205 cursor-pointer outline-none font-bold"
                        >
                            <option value="Daily">Daily</option>
                            <option value="Weekly">Weekly</option>
                            <option value="Monthly">Monthly</option>
                            <option value="3 Month">3 Month</option>
                            <option value="Yearly">Yearly</option>
                            <option value="Custom">Custom</option>
                        </select>

                        {viewMode !== 'Custom' && (
                            <button
                                onClick={() => handleShiftPeriod(1)}
                                className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
                                title="Go forward period"
                            >
                                <Icon name="ChevronRight" size={14} />
                            </button>
                        )}
                    </div>

                    {/* Dates with Manual Typing + Calendar Ref openers */}
                    <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 p-1.5 rounded-xl border border-gray-200 dark:border-gray-700">
                        <label htmlFor="start-date" className="text-[10px] font-bold text-gray-550 dark:text-gray-400 px-1 uppercase">From</label>
                        <div className="flex items-center bg-white dark:bg-gray-700 px-2 py-0.5 rounded-lg border border-gray-200/60 dark:border-gray-600">
                            <input
                                type="date"
                                id="start-date"
                                ref={startDateRef}
                                value={startDate}
                                onChange={e => {
                                    setStartDate(e.target.value);
                                    setViewMode('Custom');
                                }}
                                className="bg-transparent border-none text-xs text-gray-900 dark:text-white outline-none w-28 py-0.5 font-semibold dark:[color-scheme:dark]"
                                style={{ colorScheme: theme }}
                            />
                            <button
                                type="button"
                                onClick={() => startDateRef.current?.showPicker?.()}
                                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-650 rounded text-gray-450 hover:text-gray-300 flex items-center justify-center"
                            >
                                <Icon name="Calendar" size={13} />
                            </button>
                        </div>

                        <label htmlFor="end-date" className="text-[10px] font-bold text-gray-555 dark:text-gray-400 px-1 uppercase">To</label>
                        <div className="flex items-center bg-white dark:bg-gray-700 px-2 py-0.5 rounded-lg border border-gray-200/60 dark:border-gray-600">
                            <input
                                type="date"
                                id="end-date"
                                ref={endDateRef}
                                value={endDate}
                                onChange={e => {
                                    setEndDate(e.target.value);
                                    setViewMode('Custom');
                                }}
                                className="bg-transparent border-none text-xs text-gray-900 dark:text-white outline-none w-28 py-0.5 font-semibold dark:[color-scheme:dark]"
                                style={{ colorScheme: theme }}
                            />
                            <button
                                type="button"
                                onClick={() => endDateRef.current?.showPicker?.()}
                                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-650 rounded text-gray-455 hover:text-gray-300 flex items-center justify-center"
                            >
                                <Icon name="Calendar" size={13} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right side: Carry Over & Buttons (Import/Export styled similarly with diff colors) */}
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-1.5 rounded-xl text-gray-700 dark:text-gray-200">
                        <input
                            type="checkbox"
                            id="carryover-balance-chk"
                            checked={carryOver}
                            onChange={e => setCarryOver(e.target.checked)}
                            className="w-3.5 h-3.5 text-primary rounded cursor-pointer border-gray-300 dark:border-gray-600 dark:bg-gray-700 focus:ring-primary"
                        />
                        <label htmlFor="carryover-balance-chk" className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer select-none">
                            Carry Over
                        </label>
                        <div className="relative group/tooltip">
                            <Icon name="Info" size={12} className="text-gray-450 dark:text-gray-500 hover:text-primary dark:hover:text-indigo-400 cursor-pointer" />
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 p-2 bg-gray-900 text-white text-[10px] rounded-lg shadow-xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-205 z-50 leading-normal">
                                Includes your savings/expenses from previous months in the starting balance.
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={exportToCSV}
                        className="btn flex items-center gap-1.5 py-2 px-3.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-600 rounded-lg transition-colors shadow-sm"
                    >
                        <Icon name="Download" size={14} />
                        Export CSV
                    </button>
                    <button
                        onClick={() => setIsImportModalOpen(true)}
                        className="btn flex items-center gap-1.5 py-2 px-3.5 text-xs font-bold bg-primary hover:bg-primary-hover text-white border border-primary rounded-lg transition-colors shadow-sm"
                    >
                        <Icon name="Upload" size={14} />
                        Import Data
                    </button>
                </div>
            </div>

            {/* Stats row with Expense card first */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Total Expense - Rose Gradient styled matching dashboard */}
                <Card className="flex items-center p-6 bg-gradient-to-br from-rose-50 to-rose-100/50 dark:from-rose-950/20 dark:to-gray-800/40 border border-rose-150 dark:border-rose-900/30 shadow-sm rounded-xl">
                    <div className="w-12 h-12 rounded-xl bg-red-100/80 dark:bg-rose-955/40 flex items-center justify-center mr-4">
                        <Icon name="TrendingDown" className="text-danger dark:text-rose-400" size={24} />
                    </div>
                    <div>
                        <h4 className="text-sm font-medium text-rose-700 dark:text-gray-300">Total Expense</h4>
                        <p className="text-2xl font-bold mt-1 text-danger dark:text-rose-455">
                            -{formatCurrency(totalExpenses, currency)}
                        </p>
                    </div>
                </Card>

                {/* Total Income - Emerald Gradient styled matching dashboard */}
                <Card className="flex items-center p-6 bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/20 dark:to-gray-800/40 border border-emerald-150 dark:border-emerald-900/30 shadow-sm rounded-xl">
                    <div className="w-12 h-12 rounded-xl bg-green-100/80 dark:bg-emerald-955/40 flex items-center justify-center mr-4">
                        <Icon name="TrendingUp" className="text-success dark:text-emerald-400" size={24} />
                    </div>
                    <div>
                        <h4 className="text-sm font-medium text-emerald-700 dark:text-gray-300">Total Income</h4>
                        <p className="text-2xl font-bold mt-1 text-success dark:text-emerald-405">
                            +{formatCurrency(totalIncome, currency)}
                        </p>
                    </div>
                </Card>

                {/* Balance Card - Blue/Indigo Gradient matching dashboard */}
                <Card className="flex items-center p-6 bg-gradient-to-br from-blue-50 to-indigo-50/50 dark:from-indigo-950/20 dark:to-gray-800/40 border border-blue-150 dark:border-indigo-900/30 shadow-sm rounded-xl">
                    <div className="w-12 h-12 rounded-xl bg-primary-light dark:bg-primary/20 text-primary dark:text-indigo-300 flex items-center justify-center mr-4">
                        <Icon name="CircleDollarSign" size={24} />
                    </div>
                    <div>
                        <h4 className="text-sm font-medium text-blue-700 dark:text-gray-300">
                            {carryOver ? 'Balance (with Carry Over)' : 'Net Balance'}
                        </h4>
                        <p className={`text-2xl font-bold mt-1 ${
                            carryOver
                                ? 'text-gray-900 dark:text-gray-100'
                                : 'text-primary dark:text-indigo-400'
                        }`}>
                            {formatCurrency(displayBalance, currency)}
                        </p>
                    </div>
                </Card>
            </div>

            {/* Extra metrics grid with custom color tints */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Daily Burn Rate - Amber/yellow tint */}
                <Card className="p-4 bg-amber-50/50 dark:bg-amber-950/10 border border-amber-250 dark:border-amber-900/30 shadow-sm flex flex-col justify-between">
                    <h5 className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">Daily Burn Rate</h5>
                    <p className="text-base font-extrabold text-amber-900 dark:text-amber-200 mt-2 tabular-nums">
                        {formatCurrency(burnRateMetrics.dailyBurn, currency)}<span className="text-xs font-semibold text-amber-600/80">/day</span>
                    </p>
                </Card>
                {/* Top Category - Indigo/purple tint */}
                <Card className="p-4 bg-indigo-50/50 dark:bg-indigo-955/10 border border-indigo-250 dark:border-indigo-900/30 shadow-sm flex flex-col justify-between">
                    <h5 className="text-[10px] font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">Top Category</h5>
                    <p className="text-base font-extrabold text-indigo-900 dark:text-indigo-200 mt-2 truncate" title={burnRateMetrics.topCategoryName}>
                        {burnRateMetrics.topCategoryName}
                    </p>
                </Card>
                {/* Savings Rate - Green/emerald tint */}
                <Card className="p-4 bg-emerald-50/50 dark:bg-emerald-955/10 border border-emerald-250 dark:border-emerald-900/30 shadow-sm flex flex-col justify-between">
                    <h5 className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Savings Rate</h5>
                    <p className="text-base font-extrabold text-emerald-900 dark:text-emerald-200 mt-2">
                        {burnRateMetrics.savingsRate.toFixed(1)}%
                    </p>
                </Card>
                {/* Unbudgeted Spent - Rose/red tint */}
                <Card className="p-4 bg-rose-50/50 dark:bg-rose-955/10 border border-rose-250 dark:border-rose-900/30 shadow-sm flex flex-col justify-between">
                    <h5 className="text-[10px] font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider">Unbudgeted Spent</h5>
                    <p className="text-base font-extrabold text-rose-900 dark:text-rose-200 mt-2">
                        {formatCurrency(burnRateMetrics.unbudgetedSpent, currency)}
                    </p>
                </Card>
            </div>

            {/* AI Insights - Collapsible by default */}
            {hasInsights && (
                <Card className="transition-all duration-300 border border-gray-200 dark:border-gray-700">
                    <div 
                        className="flex items-center justify-between cursor-pointer select-none"
                        onClick={() => setShowInsights(!showInsights)}
                    >
                        <h3 className="text-xs font-black text-gray-500 dark:text-gray-405 uppercase tracking-wider flex items-center gap-2">
                            <Icon name="Sparkles" size={16} className="text-amber-500" />
                            <span>AI & Budget Insights</span>
                        </h3>
                        <div className="flex items-center gap-1.5 text-xs text-primary dark:text-indigo-400 font-bold">
                            <span>{showInsights ? 'Hide Details' : 'Show Details'}</span>
                            <Icon name={showInsights ? 'ChevronUp' : 'ChevronDown'} size={14} />
                        </div>
                    </div>

                    {showInsights && (
                        <div className="mt-4 pt-3 border-t border-gray-150 dark:border-gray-700/60 space-y-3 text-sm text-gray-650 dark:text-gray-300 animate-fadeIn">
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
                                    <Icon name="ArrowLeftRight" size={18} className="text-primary mt-0.5 animate-pulse" />
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
                    )}
                </Card>
            )}
            {/* Merged Expense Distribution Layout copied from Dashboard */}
            <Card>
                <div className="flex justify-between items-center gap-4 mb-6">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-baseline flex-wrap">
                        <span>Expense Distribution</span>
                        <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 ml-1.5">(Monthly Category Breakdown)</span>
                    </h3>
                </div>

                {expenseData.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center text-gray-450">
                        <div className="w-12 h-12 rounded-full bg-gray-105 dark:bg-gray-800 flex items-center justify-center text-gray-400 dark:text-gray-500 mb-3">
                            <Icon name="Tags" size={24} />
                        </div>
                        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">No expenses recorded for this period.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                        {/* Enlarged Pie Chart Column */}
                        <div className="lg:col-span-5 h-[400px] relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={expenseData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={90}
                                        outerRadius={140}
                                        paddingAngle={3}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        {expenseData.map((entry, index) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={COLORS[index % COLORS.length]}
                                            />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        formatter={(value: number) => {
                                            const percentage = totalExpenses > 0 ? ((value / totalExpenses) * 100).toFixed(1) : '0';
                                            return [`${formatCurrency(value, currency)} (${percentage}%)`, 'Spent'];
                                        }}
                                        contentStyle={{
                                            backgroundColor: 'rgba(31, 41, 55, 0.95)',
                                            border: 'none',
                                            borderRadius: '12px',
                                            color: '#fff',
                                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                        }}
                                        itemStyle={{ color: '#fff' }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className="text-3xl font-black text-gray-900 dark:text-white leading-none">
                                    {formatCurrency(totalExpenses, currency)}
                                </span>
                                <span className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mt-2">Total Spent</span>
                            </div>
                        </div>

                        {/* Detailed Category List Column */}
                        <div className="lg:col-span-7 space-y-3 max-h-[400px] overflow-y-auto pr-1 w-full max-w-xl mx-auto lg:ml-auto lg:mr-0 scrollbar-thin">
                            {expenseData.map((cat, index) => {
                                const color = COLORS[index % COLORS.length];
                                const percentage = totalExpenses > 0 ? ((cat.value / totalExpenses) * 100).toFixed(1) : '0';

                                return (
                                    <div key={cat.name} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold" style={{ color: color, backgroundColor: `${color}15` }}>
                                                <Icon name={cat.icon} size={18} />
                                            </div>
                                            <span className="font-semibold text-sm text-gray-800 dark:text-gray-200">{cat.name}</span>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="text-xs font-semibold text-gray-550 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-md">
                                                {percentage}%
                                            </span>
                                            <span className="font-bold text-sm text-gray-900 dark:text-white">
                                                {formatCurrency(cat.value, currency)}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </Card>

            <ImportTransactionsModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
            />
        </div>
    );
};
