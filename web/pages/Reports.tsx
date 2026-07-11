import React, { useState, useContext, useMemo, useRef, useEffect } from 'react';
import {
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
    AreaChart, Area, XAxis, YAxis, CartesianGrid, BarChart, Bar, Legend,
} from 'recharts';
import { Card } from '../components/Card';
import { Icon } from '../components/Icon';
import { AppContext } from '../App';
import { formatCurrency, getCurrencySymbol } from '../utils/currency';
import { useToast } from '../context/ToastContext';
import { ImportTransactionsModal } from '../components/ImportTransactionsModal';
import { formatTransactionDate } from '../utils/date';
import { Account, Transaction } from '../types';

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899', '#6b7280', '#14b8a6', '#d946ef'];
const INCOME_COLORS = ['#10b981', '#059669', '#34d399', '#14b8a6', '#0d9488', '#2dd4bf', '#22c55e', '#84cc16', '#06b6d4', '#3b82f6'];

const getLocalDateString = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const parseIsoDate = (iso: string) => {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d);
};

// Parse a YYYY-MM-DD string as LOCAL midnight (not UTC), so period math is
// timezone-safe. new Date("YYYY-MM-DD") would parse as UTC and shift the day
// in negative-offset timezones.
const parseLocalDate = (s: string) => {
    const [y, m, d] = s.substring(0, 10).split('-').map(Number);
    return new Date(y, m - 1, d);
};

const addDays = (iso: string, days: number) => {
    const d = parseIsoDate(iso);
    d.setDate(d.getDate() + days);
    return getLocalDateString(d);
};

const eachDayInRange = (start: string, end: string): string[] => {
    if (!start || !end || start > end) return [];
    const days: string[] = [];
    let cur = start;
    // Safety cap for very long ranges (e.g. multi-year)
    let guard = 0;
    while (cur <= end && guard < 800) {
        days.push(cur);
        cur = addDays(cur, 1);
        guard++;
    }
    return days;
};

type CategorySlice = { name: string; value: number; icon: string };

const CategoryDistribution: React.FC<{
    title: string;
    subtitle: string;
    data: CategorySlice[];
    total: number;
    currency: string;
    colors: string[];
    emptyLabel: string;
    amountPrefix?: string;
    amountClass?: string;
}> = ({ title, subtitle, data, total, currency, colors, emptyLabel, amountPrefix = '', amountClass = 'text-gray-900 dark:text-white' }) => (
    <Card className="h-full flex flex-col">
        <div className="flex justify-between items-center gap-4 mb-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-baseline flex-wrap">
                <span>{title}</span>
                <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 ml-1.5">{subtitle}</span>
            </h3>
        </div>

        {data.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 flex-1 text-center">
                <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 dark:text-gray-500 mb-3">
                    <Icon name="Tags" size={24} />
                </div>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{emptyLabel}</p>
            </div>
        ) : (
            <div className="flex flex-col gap-6 flex-1">
                <div className="h-[220px] relative w-full flex-shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                innerRadius={70}
                                outerRadius={105}
                                paddingAngle={3}
                                dataKey="value"
                                stroke="none"
                            >
                                {data.map((_, index) => (
                                    <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                                ))}
                            </Pie>
                            <Tooltip
                                formatter={(value: number) => {
                                    const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0';
                                    return [`${formatCurrency(value, currency)} (${percentage}%)`, 'Amount'];
                                }}
                                contentStyle={{
                                    backgroundColor: 'rgba(31, 41, 55, 0.95)',
                                    border: 'none',
                                    borderRadius: '12px',
                                    color: '#fff',
                                }}
                                itemStyle={{ color: '#fff' }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-xl font-black text-gray-900 dark:text-white leading-none">
                            {formatCurrency(total, currency)}
                        </span>
                        <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mt-1.5">Total</span>
                    </div>
                </div>

                <div className="space-y-1.5 max-h-[200px] overflow-y-auto pr-1 w-full mx-auto">
                    {data.map((cat, index) => {
                        const color = colors[index % colors.length];
                        const percentage = total > 0 ? ((cat.value / total) * 100).toFixed(1) : '0';
                        return (
                            <div key={cat.name} className="flex items-center justify-between p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold flex-shrink-0" style={{ color, backgroundColor: `${color}18` }}>
                                        <Icon name={cat.icon} size={16} />
                                    </div>
                                    <span className="font-semibold text-xs sm:text-sm text-gray-800 dark:text-gray-200 truncate">{cat.name}</span>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                    <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                                        {percentage}%
                                    </span>
                                    <span className={`font-bold text-xs sm:text-sm tabular-nums ${amountClass}`}>
                                        {amountPrefix}{formatCurrency(cat.value, currency)}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        )}
    </Card>
);

const FlowChart: React.FC<{
    title: string;
    subtitle: string;
    data: { date: string; label: string; income: number; expense: number }[];
    currency: string;
    emptyLabel: string;
}> = ({ title, subtitle, data, currency, emptyLabel }) => {
    const hasData = data.some(d => d.income > 0 || d.expense > 0);
    return (
        <div>
            <div className="mb-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    {title}
                    <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 ml-1.5">{subtitle}</span>
                </h3>
            </div>
            {!hasData ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-gray-500">
                    <Icon name="TrendingUp" size={28} className="mb-2 opacity-40" />
                    <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">{emptyLabel}</p>
                </div>
            ) : (
                <div className="h-[220px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="grad-income" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.01} />
                                </linearGradient>
                                <linearGradient id="grad-expense" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.25} />
                                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.01} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-gray-100 dark:stroke-gray-800" />
                            <XAxis
                                dataKey="label"
                                tick={{ fontSize: 11, fill: '#9ca3af' }}
                                interval="preserveStartEnd"
                                minTickGap={28}
                            />
                            <YAxis
                                tick={{ fontSize: 11, fill: '#9ca3af' }}
                                width={56}
                                tickFormatter={(v) => {
                                    if (v >= 1000) return `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k`;
                                    return String(v);
                                }}
                            />
                            <Tooltip
                                formatter={(value: number, name: string) => [
                                    formatCurrency(value, currency),
                                    name === 'income' ? 'Income' : 'Expense'
                                ]}
                                labelFormatter={(_, payload) => payload?.[0]?.payload?.date ? formatTransactionDate(payload[0].payload.date) : ''}
                                contentStyle={{
                                    backgroundColor: 'rgba(31, 41, 55, 0.95)',
                                    border: 'none',
                                    borderRadius: '12px',
                                    color: '#fff',
                                }}
                                itemStyle={{ color: '#fff' }}
                            />
                            <Legend />
                            <Area
                                type="monotone"
                                dataKey="income"
                                name="income"
                                stroke="#10b981"
                                strokeWidth={2}
                                fill="url(#grad-income)"
                            />
                            <Area
                                type="monotone"
                                dataKey="expense"
                                name="expense"
                                stroke="#f43f5e"
                                strokeWidth={2}
                                fill="url(#grad-expense)"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    );
};

const MoneyCalendar: React.FC<{
    monthOffset: number;
    onMonthOffsetChange: (newOffset: number) => void;
    baseStartDate: string;
    dayTotals: Record<string, number>;
    currency: string;
    accent: 'expense' | 'income';
    rangeStart: string;
    rangeEnd: string;
}> = ({ monthOffset, onMonthOffsetChange, baseStartDate, dayTotals, currency, accent, rangeStart, rangeEnd }) => {
    const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const isExpense = accent === 'expense';

    // Parse the start date as the anchor for month offset
    const anchor = useMemo(() => {
        const [y, m, d] = baseStartDate.split('-').map(Number);
        return new Date(y, m - 1, d);
    }, [baseStartDate]);

    // Active calendar month details
    const activeDate = useMemo(() => {
        return new Date(anchor.getFullYear(), anchor.getMonth() + monthOffset, 1);
    }, [anchor, monthOffset]);

    const activeYear = activeDate.getFullYear();
    const activeMonth = activeDate.getMonth() + 1;
    const activeKey = `${activeYear}-${String(activeMonth).padStart(2, '0')}`;

    const daysInMonth = new Date(activeYear, activeMonth, 0).getDate();
    // Monday-first padding calculation
    const startPad = (new Date(activeYear, activeMonth - 1, 1).getDay() + 6) % 7;

    const cells: (null | { day: number; iso: string })[] = [];
    for (let i = 0; i < startPad; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
        const iso = `${activeKey}-${String(d).padStart(2, '0')}`;
        cells.push({ day: d, iso });
    }

    const monthLabel = activeDate.toLocaleString('default', { month: 'long', year: 'numeric' });

    // Format amounts compactly
    const symbol = getCurrencySymbol(currency);
    const formatCompact = (val: number) => {
        if (val <= 0) return '';
        // E.g. format to rounded whole number or decimal k
        if (val >= 1000) {
            return `${symbol}${(val / 1000).toFixed(1).replace('.0', '')}k`;
        }
        return `${symbol}${Math.round(val)}`;
    };

    const max = Math.max(1, ...(Object.values(dayTotals) as number[]));
    const intensityClass = (amount: number) => {
        if (amount <= 0) return 'bg-gray-50 dark:bg-gray-800/40 text-gray-400 dark:text-gray-500 border border-gray-100 dark:border-gray-800/50';
        const ratio = amount / max;
        if (isExpense) {
            if (ratio > 0.75) return 'bg-rose-500 text-white border border-rose-600';
            if (ratio > 0.5) return 'bg-rose-400 text-white border border-rose-500';
            if (ratio > 0.25) return 'bg-rose-100 dark:bg-rose-900/50 text-rose-900 dark:text-rose-100 border border-rose-200 dark:border-rose-800/60';
            return 'bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300 border border-rose-100 dark:border-rose-900/30';
        }
        if (ratio > 0.75) return 'bg-emerald-500 text-white border border-emerald-600';
        if (ratio > 0.5) return 'bg-emerald-400 text-white border border-emerald-500';
        if (ratio > 0.25) return 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-100 border border-emerald-200 dark:border-emerald-800/60';
        return 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-900/30';
    };

    return (
        <div className="w-full max-w-md mx-auto">
            {/* Header controls inside calendar */}
            <div className="flex items-center justify-between mb-4 border-b border-gray-100 dark:border-gray-800 pb-3">
                <button
                    type="button"
                    onClick={() => onMonthOffsetChange(monthOffset - 1)}
                    className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors"
                >
                    <Icon name="ChevronLeft" size={16} />
                </button>
                <h4 className="text-sm font-black text-gray-950 dark:text-white uppercase tracking-wider">
                    {monthLabel}
                </h4>
                <button
                    type="button"
                    onClick={() => onMonthOffsetChange(monthOffset + 1)}
                    className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors"
                >
                    <Icon name="ChevronRight" size={16} />
                </button>
            </div>

            {/* Week days */}
            <div className="grid grid-cols-7 gap-1 mb-2">
                {weekDays.map(wd => (
                    <div key={wd} className="text-center text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase">
                        {wd}
                    </div>
                ))}
            </div>

            {/* Grid days */}
            <div className="grid grid-cols-7 gap-1">
                {cells.map((cell, idx) => {
                    if (!cell) {
                        return <div key={`empty-${idx}`} className="h-12 rounded-lg bg-gray-50/20 dark:bg-gray-900/10 opacity-30" />;
                    }
                    const inRange = cell.iso >= rangeStart && cell.iso <= rangeEnd;
                    const amount = dayTotals[cell.iso] || 0;
                    const formattedAmt = formatCompact(amount);

                    return (
                        <div
                            key={cell.iso}
                            title={inRange && amount > 0
                                ? `${formatTransactionDate(cell.iso)}: ${formatCurrency(amount, currency)}`
                                : formatTransactionDate(cell.iso)}
                            className={`h-12 rounded-lg flex flex-col items-center justify-between p-1 transition-all ${
                                !inRange
                                    ? 'bg-transparent text-gray-300 dark:text-gray-700 border border-transparent'
                                    : intensityClass(amount)
                            }`}
                        >
                            <span className="text-[10px] font-bold self-start leading-none">{cell.day}</span>
                            {inRange && amount > 0 && (
                                <span className="text-[8px] font-black tracking-tighter self-end truncate max-w-full leading-none opacity-90">
                                    {formattedAmt}
                                </span>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

type AccountStats = {
    account: Account;
    income: number;
    expense: number;
    transferIn: number;
    transferOut: number;
    periodNet: number;
    incomePct: number;
    expensePct: number;
    txs: Transaction[];
};

const AccountOverviewModal: React.FC<{
    stats: AccountStats | null;
    currency: string;
    categories: { id: string; name: string; icon?: string }[];
    accounts: Account[];
    onClose: () => void;
}> = ({ stats, currency, categories, accounts, onClose }) => {
    if (!stats) return null;
    const { account, income, expense, transferIn, transferOut, periodNet, incomePct, expensePct, txs } = stats;
    const reconstructed =
        account.initialBalance + income - expense - transferOut + transferIn;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-200 dark:border-gray-700"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-11 h-11 rounded-xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary dark:text-indigo-300 flex-shrink-0">
                            <Icon name={account.icon || 'Wallet'} size={22} />
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate">{account.name}</h3>
                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 capitalize">{account.type} · Period overview</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        aria-label="Close"
                    >
                        <Icon name="X" size={20} />
                    </button>
                </div>

                <div className="p-5 overflow-y-auto space-y-5">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <div className="p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Initial balance</p>
                            <p className="text-base font-bold text-gray-900 dark:text-white mt-1 tabular-nums">{formatCurrency(account.initialBalance, currency)}</p>
                        </div>
                        <div className="p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Income</p>
                            <p className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-1 tabular-nums">+{formatCurrency(income, currency)}</p>
                            <p className="text-[10px] text-gray-400 mt-0.5">{incomePct.toFixed(1)}% of period income</p>
                        </div>
                        <div className="p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">Expense</p>
                            <p className="text-base font-bold text-rose-600 dark:text-rose-400 mt-1 tabular-nums">−{formatCurrency(expense, currency)}</p>
                            <p className="text-[10px] text-gray-400 mt-0.5">{expensePct.toFixed(1)}% of period expense</p>
                        </div>
                        <div className="p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-blue-500">Transfer in</p>
                            <p className="text-base font-bold text-blue-500 mt-1 tabular-nums">+{formatCurrency(transferIn, currency)}</p>
                        </div>
                        <div className="p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-orange-500">Transfer out</p>
                            <p className="text-base font-bold text-orange-500 mt-1 tabular-nums">−{formatCurrency(transferOut, currency)}</p>
                        </div>
                        <div className="p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-primary dark:text-indigo-400">Current balance</p>
                            <p className="text-base font-bold text-primary dark:text-indigo-400 mt-1 tabular-nums">{formatCurrency(account.balance, currency)}</p>
                            <p className="text-[10px] text-gray-400 mt-0.5">Period net {periodNet >= 0 ? '+' : '−'}{formatCurrency(Math.abs(periodNet), currency)}</p>
                        </div>
                    </div>

                    <div className="rounded-xl border border-gray-100 dark:border-gray-700 p-3 bg-gray-50/80 dark:bg-gray-900/30 text-xs text-gray-600 dark:text-gray-400 space-y-1">
                        <p className="font-semibold text-gray-800 dark:text-gray-200">Balance check (period activity on initial)</p>
                        <p className="tabular-nums">
                            {formatCurrency(account.initialBalance, currency)}
                            {' + '}{formatCurrency(income, currency)}
                            {' − '}{formatCurrency(expense, currency)}
                            {' − '}{formatCurrency(transferOut, currency)}
                            {' + '}{formatCurrency(transferIn, currency)}
                            {' = '}
                            <strong className="text-gray-900 dark:text-white">{formatCurrency(reconstructed, currency)}</strong>
                            <span className="text-gray-400"> (period-only; full current balance may include other dates)</span>
                        </p>
                    </div>

                    <div>
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-2">
                            Transactions ({txs.length})
                        </h4>
                        {txs.length === 0 ? (
                            <p className="text-sm text-gray-500 py-6 text-center">No transactions for this account in the selected period.</p>
                        ) : (
                            <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
                                <table className="min-w-full text-sm">
                                    <thead className="bg-gray-50 dark:bg-gray-900/50 sticky top-0">
                                        <tr className="text-left text-[10px] uppercase tracking-wider text-gray-500 font-bold">
                                            <th className="px-3 py-2">Date</th>
                                            <th className="px-3 py-2">Note</th>
                                            <th className="px-3 py-2">Type</th>
                                            <th className="px-3 py-2 text-right">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                        {txs.map(t => {
                                            const cat = categories.find(c => c.id === t.categoryId);
                                            const dest = t.transferToAccountId
                                                ? accounts.find(a => a.id === t.transferToAccountId)
                                                : null;
                                            const isOut = t.type === 'expense' || (t.type === 'transfer' && t.accountId === account.id);
                                            const isIn = t.type === 'income' || (t.type === 'transfer' && t.transferToAccountId === account.id);
                                            return (
                                                <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                                                    <td className="px-3 py-2 whitespace-nowrap text-gray-600 dark:text-gray-300">
                                                        {formatTransactionDate(t.date)}
                                                    </td>
                                                    <td className="px-3 py-2 text-gray-900 dark:text-gray-100 max-w-[12rem] truncate" title={t.note}>
                                                        {t.type === 'transfer'
                                                            ? (t.accountId === account.id
                                                                ? `To ${dest?.name || 'account'}`
                                                                : `From ${accounts.find(a => a.id === t.accountId)?.name || 'account'}`)
                                                            : t.note}
                                                        {cat && t.type !== 'transfer' && (
                                                            <span className="block text-[10px] text-gray-400">{cat.name}</span>
                                                        )}
                                                    </td>
                                                    <td className="px-3 py-2 capitalize text-gray-500">{t.type}</td>
                                                    <td className={`px-3 py-2 text-right font-bold tabular-nums whitespace-nowrap ${
                                                        isOut ? 'text-rose-600 dark:text-rose-400' : isIn ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-700 dark:text-gray-200'
                                                    }`}>
                                                        {isOut ? '−' : '+'}{formatCurrency(t.amount, currency)}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export const Reports: React.FC = () => {
    const context = useContext(AppContext)!;
    const { transactions, categories, budgets, currency, accounts, theme } = context;
    const { showToast } = useToast();
    const startDateRef = useRef<HTMLInputElement>(null);
    const endDateRef = useRef<HTMLInputElement>(null);

    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const [startDate, setStartDate] = useState(getLocalDateString(firstDayOfMonth));
    const [endDate, setEndDate] = useState(getLocalDateString(lastDayOfMonth));
    const [viewMode, setViewMode] = useState<string>('Monthly');
    const [carryOver, setCarryOver] = useState<boolean>(true);
    const [showInsights, setShowInsights] = useState<boolean>(true);
    const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
    const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
    const [calendarTab, setCalendarTab] = useState<'expense' | 'income'>('expense');
    const [accountChartView, setAccountChartView] = useState<'income_expense' | 'transfers'>('income_expense');

    // Section collapse states
    const [isOverviewExpanded, setIsOverviewExpanded] = useState<boolean>(true);
    const [isFlowExpanded, setIsFlowExpanded] = useState<boolean>(true);
    const [isAccountsExpanded, setIsAccountsExpanded] = useState<boolean>(true);

    // Calendar navigation month offset
    const [calendarMonthOffset, setCalendarMonthOffset] = useState<number>(0);

    // Reset the calendar's month offset whenever the report period changes, so
    // the Activity Grid never points at a month outside the selected range.
    useEffect(() => {
        setCalendarMonthOffset(0);
    }, [startDate, endDate]);


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
                start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
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

    const handleShiftPeriod = (direction: -1 | 1) => {
        if (viewMode === 'Custom') return;

        const currentStart = parseLocalDate(startDate);
        let newStart = parseLocalDate(startDate);
        let newEnd = parseLocalDate(endDate);

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

    const buildCategoryData = (type: 'expense' | 'income'): CategorySlice[] => {
        const byCat = dateFilteredTransactions
            .filter(t => t.type === type)
            .reduce((acc, t) => {
                const category = categories.find(c => c.id === t.categoryId);
                const name = category?.name || 'Uncategorized';
                acc[name] = (acc[name] || 0) + t.amount;
                return acc;
            }, {} as Record<string, number>);

        return (Object.entries(byCat) as [string, number][])
            .map(([name, value]) => ({
                name,
                value,
                icon: categories.find(c => c.name === name)?.icon || 'Tags',
            }))
            .sort((a, b) => b.value - a.value);
    };

    const expenseData = useMemo(() => buildCategoryData('expense'), [dateFilteredTransactions, categories]);
    const incomeData = useMemo(() => buildCategoryData('income'), [dateFilteredTransactions, categories]);

    const dailySeries = useMemo(() => {
        const days = eachDayInRange(startDate, endDate);
        const expenseByDay: Record<string, number> = {};
        const incomeByDay: Record<string, number> = {};
        dateFilteredTransactions.forEach(t => {
            const d = t.date.split('T')[0];
            if (t.type === 'expense') expenseByDay[d] = (expenseByDay[d] || 0) + t.amount;
            if (t.type === 'income') incomeByDay[d] = (incomeByDay[d] || 0) + t.amount;
        });

        const toLabel = (iso: string) => {
            const [, m, d] = iso.split('-');
            return `${d}/${m}`;
        };

        return {
            combinedFlow: days.map(date => ({
                date,
                label: toLabel(date),
                income: incomeByDay[date] || 0,
                expense: expenseByDay[date] || 0
            })),
            expenseByDay,
            incomeByDay,
        };
    }, [startDate, endDate, dateFilteredTransactions]);

    const accountStats = useMemo((): AccountStats[] => {
        return accounts.map(account => {
            let income = 0;
            let expense = 0;
            let transferIn = 0;
            let transferOut = 0;
            const txs: Transaction[] = [];

            dateFilteredTransactions.forEach(t => {
                const touches =
                    t.accountId === account.id ||
                    t.transferToAccountId === account.id;
                if (!touches) return;
                txs.push(t);

                if (t.type === 'income' && t.accountId === account.id) income += t.amount;
                if (t.type === 'expense' && t.accountId === account.id) expense += t.amount;
                if (t.type === 'transfer') {
                    if (t.accountId === account.id) transferOut += t.amount;
                    if (t.transferToAccountId === account.id) transferIn += t.amount;
                }
            });

            txs.sort((a, b) => b.date.localeCompare(a.date));

            return {
                account,
                income,
                expense,
                transferIn,
                transferOut,
                periodNet: income - expense - transferOut + transferIn,
                incomePct: totalIncome > 0 ? (income / totalIncome) * 100 : 0,
                expensePct: totalExpenses > 0 ? (expense / totalExpenses) * 100 : 0,
                txs,
            };
        }).sort((a, b) => (b.income + b.expense) - (a.income + a.expense));
    }, [accounts, dateFilteredTransactions, totalIncome, totalExpenses]);

    const accountBarData = useMemo(() => {
        return accountStats.map(s => ({
            name: s.account.name.length > 12 ? s.account.name.slice(0, 11) + '…' : s.account.name,
            fullName: s.account.name,
            income: s.income,
            expense: s.expense,
            transferIn: s.transferIn,
            transferOut: s.transferOut,
        }));
    }, [accountStats]);

    const selectedStats = accountStats.find(s => s.account.id === selectedAccountId) || null;

    const burnRateMetrics = useMemo(() => {
        const startMs = parseLocalDate(startDate).getTime();
        const endMs = parseLocalDate(endDate).getTime();
        const days = Math.max(1, Math.round((endMs - startMs) / (1000 * 60 * 60 * 24)) + 1);
        const dailyBurn = totalExpenses / days;
        const topCategoryName = expenseData[0]?.name || 'None';
        const savingsRate = totalIncome > 0 ? Math.max(0, ((totalIncome - totalExpenses) / totalIncome) * 100) : 0;

        const activeBudgetsCatIds = budgets
            .filter(b => !b.month || b.month === startDate.substring(0, 7))
            .map(b => b.categoryId);
        const unbudgetedSpent = dateFilteredTransactions
            .filter(t => t.type === 'expense' && !activeBudgetsCatIds.includes(t.categoryId || ''))
            .reduce((sum, t) => sum + t.amount, 0);

        return { dailyBurn, topCategoryName, savingsRate, unbudgetedSpent };
    }, [totalExpenses, totalIncome, expenseData, budgets, startDate, endDate, dateFilteredTransactions]);

    const insights = useMemo(() => {
        const start = parseLocalDate(startDate);
        const end = parseLocalDate(endDate);

        // Comparison baseline: the equivalent period immediately preceding the
        // selected range. For Monthly we keep previous-calendar-month semantics;
        // for every other view we compare against a range of the same length
        // ending the day before startDate (timezone-safe, local dates).
        let prevStart: string;
        let prevEnd: string;
        let comparisonLabel: string;
        if (viewMode === 'Monthly') {
            const prevDate = new Date(start.getFullYear(), start.getMonth() - 1, 1);
            const prevMonthEnd = new Date(start.getFullYear(), start.getMonth(), 0);
            prevStart = getLocalDateString(prevDate);
            prevEnd = getLocalDateString(prevMonthEnd);
            comparisonLabel = prevDate.toLocaleString('default', { month: 'long' });
        } else {
            const msPerDay = 1000 * 60 * 60 * 24;
            const lengthDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / msPerDay) + 1);
            const prevEndDate = new Date(start.getFullYear(), start.getMonth(), start.getDate() - 1);
            const prevStartDate = new Date(prevEndDate.getFullYear(), prevEndDate.getMonth(), prevEndDate.getDate() - (lengthDays - 1));
            prevStart = getLocalDateString(prevStartDate);
            prevEnd = getLocalDateString(prevEndDate);
            comparisonLabel = `previous ${lengthDays} day${lengthDays === 1 ? '' : 's'}`;
        }

        const prevTransactions = transactions.filter(t => {
            if (t.type !== 'expense') return false;
            const d = t.date.split('T')[0];
            return d >= prevStart && d <= prevEnd;
        });
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

        const now = new Date();
        const isCurrentMonth = start.getMonth() === now.getMonth() && start.getFullYear() === now.getFullYear();
        let pace: { projected: number; totalBudget: number } | null = null;
        if (isCurrentMonth) {
            // Dedupe budgets so a monthly override replaces the recurring budget
            // for the same category (mirrors Budgets.tsx), avoiding double-counting.
            const monthStr = startDate.substring(0, 7);
            const monthlyBudgets = budgets.filter(b => b.month === monthStr);
            const repeatingBudgets = budgets.filter(b => !b.month && !monthlyBudgets.some(mb => mb.categoryId === b.categoryId));
            const totalBudget = [...monthlyBudgets, ...repeatingBudgets]
                .reduce((sum, b) => sum + (b.effectiveAmount ?? b.amount), 0);
            if (totalBudget > 0 && now.getDate() > 0) {
                const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
                pace = { projected: (totalExpenses / now.getDate()) * daysInMonth, totalBudget };
            }
        }

        return { totalDeltaPct, prevTotal, comparisonLabel, biggestChange, pace };
    }, [startDate, endDate, viewMode, totalExpenses, transactions, dateFilteredTransactions, categories, budgets]);

    const hasInsights = insights.totalDeltaPct !== null || (insights.biggestChange && insights.biggestChange.delta !== 0) || insights.pace;

    // RFC 4180-style field escaping: double any embedded quote, and wrap the
    // field in quotes when it contains a comma, quote, or newline.
    const csvField = (value: unknown): string => {
        const str = value == null ? '' : String(value);
        const escaped = str.replace(/"/g, '""');
        return /[",\n\r]/.test(str) ? `"${escaped}"` : escaped;
    };

    const exportToCSV = () => {
        if (dateFilteredTransactions.length === 0) {
            showToast('No transactions in this period to export', 'info');
            return;
        }

        const headers = ['Date', 'Time', 'Note', 'Amount', 'Account', 'Type', 'Category', 'Transfer To'];
        const rows = dateFilteredTransactions.map(transaction => {
            const category = categories.find(c => c.id === transaction.categoryId);
            const account = accounts.find(a => a.id === transaction.accountId);
            const transferAccount = transaction.transferToAccountId
                ? accounts.find(a => a.id === transaction.transferToAccountId)
                : null;
            const timePart = transaction.date.includes('T') ? transaction.date.split('T')[1]?.slice(0, 5) : '';

            return [
                formatTransactionDate(transaction.date),
                timePart || '',
                transaction.note,
                transaction.amount.toFixed(2),
                account?.name || '',
                transaction.type,
                category?.name || (transaction.type === 'transfer' ? 'Transfer' : ''),
                transferAccount?.name || '',
            ].map(csvField);
        });

        const csvContent = [headers.map(csvField).join(','), ...rows.map(row => row.join(','))].join('\n');
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
            {/* Header controls */}
            <div className="flex flex-wrap justify-between items-center gap-4 border-b border-gray-100 dark:border-gray-800 pb-4">
                <div className="flex items-center gap-3 flex-wrap">
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

                        <label htmlFor="view-mode" className="text-[10px] font-bold text-gray-500 dark:text-gray-400 px-2 uppercase">View</label>
                        <select
                            id="view-mode"
                            value={viewMode}
                            onChange={(e) => {
                                const mode = e.target.value;
                                setViewMode(mode);
                                updateDatesForViewMode(mode);
                            }}
                            className="input text-xs py-1 px-2.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-800 dark:text-gray-200 cursor-pointer outline-none font-bold"
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

                    <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 p-1.5 rounded-xl border border-gray-200 dark:border-gray-700">
                        <label htmlFor="start-date" className="text-[10px] font-bold text-gray-500 dark:text-gray-400 px-1 uppercase">From</label>
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
                                className="bg-transparent border-none text-xs text-gray-900 dark:text-white outline-none w-28 py-0.5 font-semibold"
                                style={{ colorScheme: theme }}
                            />
                            <button
                                type="button"
                                onClick={() => startDateRef.current?.showPicker?.()}
                                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded text-gray-400 hover:text-gray-300 flex items-center justify-center"
                            >
                                <Icon name="Calendar" size={13} />
                            </button>
                        </div>

                        <label htmlFor="end-date" className="text-[10px] font-bold text-gray-500 dark:text-gray-400 px-1 uppercase">To</label>
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
                                className="bg-transparent border-none text-xs text-gray-900 dark:text-white outline-none w-28 py-0.5 font-semibold"
                                style={{ colorScheme: theme }}
                            />
                            <button
                                type="button"
                                onClick={() => endDateRef.current?.showPicker?.()}
                                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded text-gray-400 hover:text-gray-300 flex items-center justify-center"
                            >
                                <Icon name="Calendar" size={13} />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
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
                            <Icon name="Info" size={12} className="text-gray-400 dark:text-gray-500 hover:text-primary dark:hover:text-indigo-400 cursor-pointer" />
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 p-2 bg-gray-900 text-white text-[10px] rounded-lg shadow-xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-200 z-50 leading-normal">
                                Includes your savings/expenses from previous months in the starting balance.
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={() => setIsImportModalOpen(true)}
                        className="btn flex items-center gap-1.5 py-2 px-3.5 text-xs font-bold bg-primary hover:bg-primary-hover text-white border border-primary rounded-lg transition-colors shadow-sm"
                    >
                        <Icon name="Upload" size={14} />
                        Import Data
                    </button>
                    <button
                        onClick={exportToCSV}
                        className="btn flex items-center gap-1.5 py-2 px-3.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-600 rounded-lg transition-colors shadow-sm"
                    >
                        <Icon name="Download" size={14} />
                        Export CSV
                    </button>
                </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="flex items-center p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/60 shadow-sm rounded-xl">
                    <div className="w-12 h-12 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 flex items-center justify-center mr-4">
                        <Icon name="TrendingDown" className="text-danger dark:text-rose-400" size={24} />
                    </div>
                    <div>
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Total Expense</h4>
                        <p className="text-2xl font-bold mt-1 text-danger dark:text-rose-400 tabular-nums">
                            −{formatCurrency(totalExpenses, currency)}
                        </p>
                    </div>
                </Card>

                <Card className="flex items-center p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/60 shadow-sm rounded-xl">
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 flex items-center justify-center mr-4">
                        <Icon name="TrendingUp" className="text-success dark:text-emerald-400" size={24} />
                    </div>
                    <div>
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Total Income</h4>
                        <p className="text-2xl font-bold mt-1 text-success dark:text-emerald-400 tabular-nums">
                            +{formatCurrency(totalIncome, currency)}
                        </p>
                    </div>
                </Card>

                <Card className="flex items-center p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/60 shadow-sm rounded-xl">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-indigo-900/30 text-primary dark:text-indigo-300 flex items-center justify-center mr-4">
                        <Icon name="CircleDollarSign" size={24} />
                    </div>
                    <div>
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                            {carryOver ? 'Balance (with Carry Over)' : 'Net Balance'}
                        </h4>
                        <p className="text-2xl font-bold mt-1 text-primary dark:text-indigo-400 tabular-nums">
                            {formatCurrency(displayBalance, currency)}
                        </p>
                    </div>
                </Card>
            </div>

            {/* Redesigned Sections Accordion */}
            <div className="space-y-6">
                
                {/* 1. Overview Section */}
                <Card className="p-0 overflow-hidden border border-gray-200 dark:border-gray-800 shadow-sm">
                    <button
                        type="button"
                        onClick={() => setIsOverviewExpanded(!isOverviewExpanded)}
                        className="w-full flex items-center justify-between p-5 text-left border-none focus:outline-none bg-transparent hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors"
                    >
                        <div>
                            <h3 className="text-lg font-black text-gray-950 dark:text-white uppercase tracking-wider">Overview</h3>
                            <p className="text-xs text-gray-400 font-semibold mt-0.5">Distribution of expenses and income by category</p>
                        </div>
                        <Icon name={isOverviewExpanded ? 'ChevronUp' : 'ChevronDown'} size={20} className="text-gray-400" />
                    </button>
                    {isOverviewExpanded && (
                        <div className="p-5 border-t border-gray-100 dark:border-gray-700/60 bg-white dark:bg-gray-800">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <CategoryDistribution
                                    title="Expense Overview"
                                    subtitle="(Category breakdown)"
                                    data={expenseData}
                                    total={totalExpenses}
                                    currency={currency}
                                    colors={COLORS}
                                    emptyLabel="No expenses recorded for this period."
                                    amountPrefix="−"
                                    amountClass="text-rose-600 dark:text-rose-400"
                                />
                                <CategoryDistribution
                                    title="Income Overview"
                                    subtitle="(Category breakdown)"
                                    data={incomeData}
                                    total={totalIncome}
                                    currency={currency}
                                    colors={INCOME_COLORS}
                                    emptyLabel="No income recorded for this period."
                                    amountPrefix="+"
                                    amountClass="text-emerald-600 dark:text-emerald-400"
                                />
                            </div>
                        </div>
                    )}
                </Card>

                {/* 2. Flow & Activity Section */}
                <Card className="p-0 overflow-hidden border border-gray-200 dark:border-gray-800 shadow-sm">
                    <button
                        type="button"
                        onClick={() => setIsFlowExpanded(!isFlowExpanded)}
                        className="w-full flex items-center justify-between p-5 text-left border-none focus:outline-none bg-transparent hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors"
                    >
                        <div>
                            <h3 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-wider">Transaction Flow & Activity</h3>
                            <p className="text-xs text-gray-400 font-semibold mt-0.5">Combined view of transaction trends and calendar activity</p>
                        </div>
                        <Icon name={isFlowExpanded ? 'ChevronUp' : 'ChevronDown'} size={20} className="text-gray-400" />
                    </button>
                    {isFlowExpanded && (
                        <div className="p-5 border-t border-gray-100 dark:border-gray-700/60 bg-white dark:bg-gray-800">
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                                {/* Left: Activity Calendar */}
                                <div className="lg:col-span-5 flex flex-col gap-4">
                                    <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-2 flex-wrap gap-2">
                                        <span className="text-[10px] font-extrabold uppercase text-gray-400 tracking-wider">Activity Grid</span>
                                        <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5 flex-shrink-0" onClick={e => e.stopPropagation()}>
                                            <button
                                                type="button"
                                                onClick={() => setCalendarTab('expense')}
                                                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${
                                                    calendarTab === 'expense'
                                                        ? 'bg-white dark:bg-gray-700 text-rose-600 dark:text-rose-400 shadow-sm'
                                                        : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                                }`}
                                            >
                                                Expenses
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setCalendarTab('income')}
                                                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${
                                                    calendarTab === 'income'
                                                        ? 'bg-white dark:bg-gray-700 text-emerald-600 dark:text-emerald-400 shadow-sm'
                                                        : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                                }`}
                                            >
                                                Income
                                            </button>
                                        </div>
                                    </div>
                                    <MoneyCalendar
                                        monthOffset={calendarMonthOffset}
                                        onMonthOffsetChange={setCalendarMonthOffset}
                                        baseStartDate={startDate}
                                        dayTotals={calendarTab === 'expense' ? dailySeries.expenseByDay : dailySeries.incomeByDay}
                                        currency={currency}
                                        accent={calendarTab}
                                        rangeStart={startDate}
                                        rangeEnd={endDate}
                                    />
                                </div>

                                {/* Right: Flow Chart */}
                                <div className="lg:col-span-7 flex flex-col gap-4">
                                    <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-2">
                                        <span className="text-[10px] font-extrabold uppercase text-gray-400 tracking-wider">Flow Chart</span>
                                    </div>
                                    <FlowChart
                                        title=""
                                        subtitle=""
                                        data={dailySeries.combinedFlow}
                                        currency={currency}
                                        emptyLabel="No activity to chart."
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </Card>

                {/* 3. Accounts Summary Section */}
                <Card className="p-0 overflow-hidden border border-gray-200 dark:border-gray-800 shadow-sm">
                    <button
                        type="button"
                        onClick={() => setIsAccountsExpanded(!isAccountsExpanded)}
                        className="w-full flex items-center justify-between p-5 text-left border-none focus:outline-none bg-transparent hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors"
                    >
                        <div>
                            <h3 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-wider">Accounts Summary</h3>
                            <p className="text-xs text-gray-400 font-semibold mt-0.5">Overview of initial/current balances, income, expenses & transfers</p>
                        </div>
                        <Icon name={isAccountsExpanded ? 'ChevronUp' : 'ChevronDown'} size={20} className="text-gray-400" />
                    </button>
                    {isAccountsExpanded && (
                        <div className="p-5 border-t border-gray-100 dark:border-gray-700/60 bg-white dark:bg-gray-800">
                            {accounts.length === 0 ? (
                                <p className="text-sm text-gray-500 text-center py-10">No accounts yet.</p>
                            ) : (
                                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                                    {/* Left: Bar Chart */}
                                    <div className="xl:col-span-4 border border-gray-200 dark:border-gray-700/60 rounded-xl p-4 flex flex-col justify-between h-full bg-gray-50/10 dark:bg-gray-900/5">
                                        <div className="flex items-center justify-between mb-3 border-b border-gray-100 dark:border-gray-800 pb-2">
                                            <span className="text-[10px] font-extrabold uppercase text-gray-400 tracking-wider">Metrics Chart</span>
                                            <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5 flex-shrink-0">
                                                <button
                                                    type="button"
                                                    onClick={() => setAccountChartView('income_expense')}
                                                    className={`px-2 py-0.5 text-[9px] font-bold rounded transition-colors ${
                                                        accountChartView === 'income_expense'
                                                            ? 'bg-white dark:bg-gray-700 text-rose-600 dark:text-rose-400 shadow-sm'
                                                            : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                                    }`}
                                                >
                                                    Inc / Exp
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setAccountChartView('transfers')}
                                                    className={`px-2 py-0.5 text-[9px] font-bold rounded transition-colors ${
                                                        accountChartView === 'transfers'
                                                            ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                                                            : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                                    }`}
                                                >
                                                    Transfers
                                                </button>
                                            </div>
                                        </div>

                                        {accountBarData.some(d => d.income > 0 || d.expense > 0 || d.transferIn > 0 || d.transferOut > 0) ? (
                                            <div className="h-[180px] w-full">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <BarChart data={accountBarData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                                                        <CartesianGrid strokeDasharray="3 3" className="stroke-gray-100 dark:stroke-gray-800" />
                                                        <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#9ca3af' }} />
                                                        <YAxis
                                                            tick={{ fontSize: 9, fill: '#9ca3af' }}
                                                            width={48}
                                                            tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))}
                                                        />
                                                        <Tooltip
                                                            formatter={(value: number, name: string) => [
                                                                formatCurrency(value, currency),
                                                                name === 'income' ? 'Income'
                                                                    : name === 'expense' ? 'Expense'
                                                                    : name === 'transferIn' ? 'Transfer In'
                                                                    : 'Transfer Out',
                                                            ]}
                                                            labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName || ''}
                                                            contentStyle={{
                                                                backgroundColor: 'rgba(31, 41, 55, 0.95)',
                                                                border: 'none',
                                                                borderRadius: '12px',
                                                                color: '#fff',
                                                            }}
                                                            itemStyle={{ color: '#fff' }}
                                                        />
                                                        {accountChartView === 'income_expense' ? (
                                                            <>
                                                                <Bar dataKey="income" name="income" fill="#10b981" radius={[2, 2, 0, 0]} />
                                                                <Bar dataKey="expense" name="expense" fill="#f43f5e" radius={[2, 2, 0, 0]} />
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Bar dataKey="transferIn" name="transferIn" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                                                                <Bar dataKey="transferOut" name="transferOut" fill="#f59e0b" radius={[2, 2, 0, 0]} />
                                                            </>
                                                        )}
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </div>
                                        ) : (
                                            <p className="text-xs text-gray-400 text-center py-10">No account activity to chart.</p>
                                        )}
                                    </div>

                                    {/* Right: Tabular view of accounts */}
                                    <div className="xl:col-span-8 overflow-x-auto w-full border border-gray-200 dark:border-gray-700/60 rounded-xl bg-gray-50/40 dark:bg-gray-900/10 p-4">
                                        <table className="w-full text-left border-collapse text-xs">
                                            <thead>
                                                <tr className="border-b border-gray-200 dark:border-gray-700 text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
                                                    <th className="py-2.5 px-2 text-left">Account</th>
                                                    <th className="py-2.5 px-2 text-right">Initial Balance</th>
                                                    <th className="py-2.5 px-2 text-right text-emerald-600 dark:text-emerald-400">Income</th>
                                                    <th className="py-2.5 px-2 text-right text-rose-600 dark:text-rose-400">Expense</th>
                                                    <th className="py-2.5 px-2 text-right text-blue-500">Transfer In</th>
                                                    <th className="py-2.5 px-2 text-right text-orange-500">Transfer Out</th>
                                                    <th className="py-2.5 px-2 text-right text-primary dark:text-indigo-400 font-extrabold">Current Balance</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                                {accountStats.map(stats => {
                                                    const { account, income, expense, transferIn, transferOut } = stats;
                                                    return (
                                                        <tr
                                                            key={account.id}
                                                            onClick={() => setSelectedAccountId(account.id)}
                                                            className="hover:bg-gray-100/50 dark:hover:bg-gray-800/40 cursor-pointer transition-colors"
                                                        >
                                                            <td className="py-3 px-2 font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                                                <Icon name={account.icon || 'Wallet'} size={14} className="text-gray-400" />
                                                                <span>{account.name}</span>
                                                            </td>
                                                            <td className="py-3 px-2 text-right tabular-nums text-gray-500">
                                                                {formatCurrency(account.initialBalance, currency)}
                                                            </td>
                                                            <td className="py-3 px-2 text-right tabular-nums text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-500/5">
                                                                +{formatCurrency(income, currency)}
                                                            </td>
                                                            <td className="py-3 px-2 text-right tabular-nums text-rose-600 dark:text-rose-400 font-semibold bg-rose-500/5">
                                                                −{formatCurrency(expense, currency)}
                                                            </td>
                                                            <td className="py-3 px-2 text-right tabular-nums text-blue-500 font-medium bg-blue-500/5">
                                                                +{formatCurrency(transferIn, currency)}
                                                            </td>
                                                            <td className="py-3 px-2 text-right tabular-nums text-orange-500 font-medium bg-orange-500/5">
                                                                −{formatCurrency(transferOut, currency)}
                                                            </td>
                                                            <td className="py-3 px-2 text-right tabular-nums text-primary dark:text-indigo-400 font-extrabold bg-primary/5">
                                                                {formatCurrency(account.balance, currency)}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </Card>

                {/* 4. AI & Budget Insights Section (Collapsed by default, below Accounts) */}
                <Card className="p-0 overflow-hidden border border-gray-200 dark:border-gray-800 shadow-sm">
                    <button
                        type="button"
                        onClick={() => setShowInsights(!showInsights)}
                        className="w-full flex items-center justify-between p-5 text-left border-none focus:outline-none bg-transparent hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors"
                    >
                        <div className="flex items-center gap-2">
                            <Icon name="Sparkles" size={18} className="text-amber-500 animate-pulse" />
                            <div>
                                <h3 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-wider">AI & Budget Insights</h3>
                                <p className="text-xs text-gray-400 font-semibold mt-0.5">Key budget metrics and automated financial insights</p>
                            </div>
                        </div>
                        <Icon name={showInsights ? 'ChevronUp' : 'ChevronDown'} size={20} className="text-gray-400" />
                    </button>
                    {showInsights && (
                        <div className="p-6 border-t border-gray-100 dark:border-gray-700/60 bg-white dark:bg-gray-800 space-y-6">
                            {/* The 4 clean borderless metrics */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 divide-y md:divide-y-0 md:divide-x divide-gray-200 dark:divide-gray-700">
                                <div className="flex flex-col justify-between py-2">
                                    <span className="text-[10px] font-bold text-gray-500 dark:text-gray-500 uppercase tracking-wider">Daily Burn Rate</span>
                                    <p className="text-lg font-black text-gray-900 dark:text-white mt-1.5 tabular-nums">
                                        {formatCurrency(burnRateMetrics.dailyBurn, currency)}
                                        <span className="text-xs font-normal text-gray-400">/day</span>
                                    </p>
                                </div>
                                <div className="flex flex-col justify-between py-2 pt-4 md:pt-2 md:pl-6">
                                    <span className="text-[10px] font-bold text-gray-500 dark:text-gray-500 uppercase tracking-wider">Top Category</span>
                                    <p className="text-lg font-black text-gray-900 dark:text-white mt-1.5 truncate" title={burnRateMetrics.topCategoryName}>
                                        {burnRateMetrics.topCategoryName}
                                    </p>
                                </div>
                                <div className="flex flex-col justify-between py-2 pt-4 md:pt-2 md:pl-6">
                                    <span className="text-[10px] font-bold text-gray-500 dark:text-gray-500 uppercase tracking-wider">Savings Rate</span>
                                    <p className="text-lg font-black text-gray-900 dark:text-white mt-1.5">
                                        {burnRateMetrics.savingsRate.toFixed(1)}%
                                    </p>
                                </div>
                                <div className="flex flex-col justify-between py-2 pt-4 md:pt-2 md:pl-6">
                                    <span className="text-[10px] font-bold text-gray-500 dark:text-gray-500 uppercase tracking-wider">Unbudgeted Spent</span>
                                    <p className="text-lg font-black text-gray-900 dark:text-white mt-1.5">
                                        {formatCurrency(burnRateMetrics.unbudgetedSpent, currency)}
                                    </p>
                                </div>
                            </div>

                            {/* AI Insights text results */}
                            {hasInsights && (
                                <div className="pt-6 border-t border-gray-100 dark:border-gray-700/60 space-y-3 text-sm text-gray-600 dark:text-gray-300">
                                    {insights.totalDeltaPct !== null && (
                                        <div className="flex items-start gap-2.5">
                                            <Icon
                                                name={insights.totalDeltaPct >= 0 ? 'TrendingUp' : 'TrendingDown'}
                                                size={18}
                                                className={insights.totalDeltaPct >= 0 ? 'text-danger mt-0.5' : 'text-success mt-0.5'}
                                            />
                                            <span>
                                                Spending is <strong>{Math.abs(insights.totalDeltaPct).toFixed(0)}% {insights.totalDeltaPct >= 0 ? 'higher' : 'lower'}</strong> than {insights.comparisonLabel} ({formatCurrency(insights.prevTotal, currency)})
                                            </span>
                                        </div>
                                    )}
                                    {insights.biggestChange && insights.biggestChange.delta !== 0 && (
                                        <div className="flex items-start gap-2.5">
                                            <Icon name="ArrowLeftRight" size={18} className="text-primary mt-0.5" />
                                            <span>
                                                Biggest change: <strong>{insights.biggestChange.name}</strong> ({insights.biggestChange.delta > 0 ? '+' : '−'}{formatCurrency(Math.abs(insights.biggestChange.delta), currency)} vs {insights.comparisonLabel})
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
                        </div>
                    )}
                </Card>
            </div>

            <AccountOverviewModal
                stats={selectedStats}
                currency={currency}
                categories={categories}
                accounts={accounts}
                onClose={() => setSelectedAccountId(null)}
            />

            <ImportTransactionsModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
            />
        </div>
    );
};
