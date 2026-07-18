
import React, { useContext, useMemo, useState } from 'react';
import { AppContext } from '../App';
import { Card } from '../components/Card';
import { Icon } from '../components/Icon';
import { Transaction } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { formatCurrency } from '../utils/currency';
import { formatDisplayDate } from '../utils/date';
import { TipBanner } from '../components/TipBanner';

const StatCard: React.FC<{ title: string; subtitle?: string; amount: number; change: number; type: 'income' | 'expense' | 'net'; currency: string }> = ({ title, subtitle, amount, change, type, currency }) => {
  const isPositiveChange = change >= 0;

  // The balance card flips to a red "you spent more than you earned" look
  // whenever the month's balance is negative, so non-finance users can tell at
  // a glance that money went out the door.
  const isNegativeNet = type === 'net' && amount < 0;

  let gradientClass = '';
  let borderClass = '';
  let textClass = '';
  let titleColorClass = '';
  let iconName = '';

  switch (type) {
    case 'income':
      gradientClass = 'from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20';
      borderClass = 'border-emerald-200 dark:border-emerald-800/30';
      textClass = 'text-emerald-900 dark:text-emerald-100';
      titleColorClass = 'text-emerald-700';
      iconName = 'TrendingUp';
      break;
    case 'expense':
      gradientClass = 'from-rose-50 to-rose-100 dark:from-rose-900/20 dark:to-rose-800/20';
      borderClass = 'border-rose-200 dark:border-rose-800/30';
      textClass = 'text-rose-900 dark:text-rose-100';
      titleColorClass = 'text-rose-700';
      iconName = 'TrendingDown';
      break;
    case 'net':
      if (isNegativeNet) {
        gradientClass = 'from-rose-50 to-red-100 dark:from-rose-900/25 dark:to-red-900/25';
        borderClass = 'border-rose-300 dark:border-rose-700/50 ring-1 ring-rose-300 dark:ring-rose-700/40';
        textClass = 'text-rose-900 dark:text-rose-100';
        titleColorClass = 'text-rose-700';
        iconName = 'AlertTriangle';
      } else {
        gradientClass = 'from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-800/20';
        borderClass = 'border-blue-200 dark:border-blue-800/30';
        textClass = 'text-blue-900 dark:text-blue-100';
        titleColorClass = 'text-blue-700';
        iconName = 'Wallet';
      }
      break;
  }

  // Trend semantics differ by card type: a rising expense is unfavorable (red),
  // whereas rising income / net flow is favorable (green).
  const isFavorableChange = type === 'expense' ? change <= 0 : change >= 0;
  const trendColorClass = isFavorableChange
    ? 'text-emerald-600 dark:text-emerald-400'
    : 'text-rose-600 dark:text-rose-400';

  return (
    <div className={`flex-1 p-6 rounded-2xl border bg-gradient-to-br shadow-sm ${gradientClass} ${borderClass}`}>
      <div className="flex justify-between items-start">
        <div>
          <p className={`text-sm font-medium mb-1 ${titleColorClass} dark:text-gray-300`}>{title}</p>
          <h3 className={`text-3xl font-bold ${textClass}`}>
            {formatCurrency(amount, currency)}
          </h3>
          {subtitle && (
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>
          )}
        </div>
        <div className={`p-2 rounded-lg bg-white/50 dark:bg-white/10 ${textClass}`}>
          <Icon name={iconName} size={20} />
        </div>
      </div>
      <div className="mt-4 flex items-center text-sm">
        <span className={`font-medium flex items-center ${trendColorClass}`}>
          <Icon name={isPositiveChange ? 'ArrowUp' : 'ArrowDown'} size={14} className="mr-1" />
          {Math.abs(change)}%
        </span>
        <span className="text-gray-500 dark:text-gray-400 ml-2">vs last month</span>
      </div>
    </div>
  );
};

const TransactionRow: React.FC<{ transaction: Transaction }> = ({ transaction }) => {
  const { categories, accounts, currency } = useContext(AppContext)!;
  const category = categories.find(c => c.id === transaction.categoryId);
  const account = accounts.find(a => a.id === transaction.accountId);
  const destAccount = accounts.find(a => a.id === transaction.transferToAccountId);

  const isExpense = transaction.type === 'expense';
  const isIncome = transaction.type === 'income';
  const isTransfer = transaction.type === 'transfer';

  let iconName = 'Tags';
  let displayNote = transaction.note;
  let amountClass = '';
  let amountPrefix = '';
  let iconBgClass = '';
  let iconColorClass = '';

  if (isExpense) {
    iconName = category?.icon || 'Tags';
    amountClass = 'text-rose-600 dark:text-rose-400';
    amountPrefix = '-';
    iconBgClass = 'bg-rose-100 dark:bg-rose-900/30';
    iconColorClass = 'text-rose-600 dark:text-rose-400';
  } else if (isIncome) {
    iconName = category?.icon || 'Tags';
    amountClass = 'text-emerald-600 dark:text-emerald-400';
    amountPrefix = '+';
    iconBgClass = 'bg-emerald-100 dark:bg-emerald-900/30';
    iconColorClass = 'text-emerald-600 dark:text-emerald-400';
  } else if (isTransfer) {
    iconName = 'ArrowLeftRight';
    displayNote = `Transfer to ${destAccount?.name || 'Account'}`;
    amountClass = 'text-blue-600 dark:text-blue-400';
    amountPrefix = '';
    iconBgClass = 'bg-blue-100 dark:bg-blue-900/30';
    iconColorClass = 'text-blue-600 dark:text-blue-400';
  }

  return (
    <div className="flex items-center justify-between py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-lg px-2 transition-colors -mx-2">
      <div className="flex items-center min-w-0 flex-1">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-4 flex-shrink-0 ${iconBgClass}`}>
          <Icon name={iconName} className={iconColorClass} size={18} />
        </div>
        <div className="min-w-0 flex-1 pr-4">
          <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{displayNote}</p>
          <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            <span className="sm:hidden">{account?.name} • </span>
            <span>{formatDisplayDate(transaction.date)}</span>
          </div>
        </div>
      </div>

      {/* Badges in the middle to utilize the empty space beautifully */}
      <div className="hidden sm:flex items-center gap-2 mr-8 flex-shrink-0">
        {category && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-gray-100 dark:bg-gray-700/60 text-gray-600 dark:text-gray-300">
            {category.name}
          </span>
        )}
        {account && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-primary-light/50 text-primary dark:bg-primary/20 dark:text-indigo-300">
            {account.name}
          </span>
        )}
      </div>

      <p className={`font-semibold whitespace-nowrap text-right ${amountClass}`}>
        {amountPrefix}{formatCurrency(transaction.amount, currency)}
      </p>
    </div>
  )
}

// Chart Colors
const COLORS = {
  Rent: '#6366f1', // Indigo
  Shopping: '#10b981', // Emerald
  'Dining Out': '#f59e0b', // Amber
  Utilities: '#f43f5e', // Rose
  Groceries: '#3b82f6', // Blue
  Transportation: '#8b5cf6', // Purple
  Entertainment: '#ec4899', // Pink
  Health: '#64748b', // Slate
  Other: '#94a3b8' // Gray
};

const DEFAULT_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#f43f5e', '#3b82f6', '#8b5cf6', '#ec4899', '#64748b'];

export const Dashboard: React.FC = () => {
  const { transactions, categories, accounts, setActivePage, currency, user } = useContext(AppContext)!;

  // Helper to get current date in user's timezone
  const getNowInTimezone = (timezone?: string | null) => {
    if (!timezone) return new Date();
    try {
      const str = new Date().toLocaleString('en-US', { timeZone: timezone });
      return new Date(str);
    } catch (e) {
      console.error('Invalid timezone:', timezone);
      return new Date();
    }
  };

  const [currentDate, setCurrentDate] = useState(getNowInTimezone(user?.timezone));

  // Update currentDate if user timezone changes (e.g. after profile update)
  React.useEffect(() => {
    setCurrentDate(getNowInTimezone(user?.timezone));
  }, [user?.timezone]);

  const now = getNowInTimezone(user?.timezone);
  const isAtCurrentMonth =
    currentDate.getFullYear() === now.getFullYear() && currentDate.getMonth() === now.getMonth();

  const changeMonth = (offset: number) => {
    setCurrentDate(prevDate => {
      // Anchor to the 1st so month arithmetic never overflows (e.g. 31st -> next month)
      const newDate = new Date(prevDate.getFullYear(), prevDate.getMonth() + offset, 1);
      // Never navigate into future months beyond the current one
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      return newDate > currentMonthStart ? currentMonthStart : newDate;
    });
  };

  // Frozen accounts are paused everywhere: they don't count toward net worth
  // and are left out of the account summary list below. Historical
  // transactions (already filtered elsewhere on this page) are unaffected.
  const activeAccounts = useMemo(() => accounts.filter(a => !a.frozen), [accounts]);

  const netWorth = useMemo(() => activeAccounts.reduce((sum, acc) => sum + acc.balance, 0), [activeAccounts]);

  const { totalIncome, totalExpenses, netFlow, incomeChange, expenseChange, netFlowChange, recentTransactions, expenseByCategory } = useMemo(() => {
    const currentMonthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

    const lastMonthDate = new Date(currentDate);
    lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
    const lastMonthKey = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`;

    const currentTransactions = transactions.filter(t => t.date.startsWith(currentMonthKey));

    const lastMonthTransactions = transactions.filter(t => t.date.startsWith(lastMonthKey));

    const calculateTotal = (txs: Transaction[], type: 'income' | 'expense') =>
      txs.filter(t => t.type === type).reduce((sum, t) => sum + t.amount, 0);

    const totalIncome = calculateTotal(currentTransactions, 'income');
    const totalExpenses = calculateTotal(currentTransactions, 'expense');
    const netFlow = totalIncome - totalExpenses;

    const lastMonthIncome = calculateTotal(lastMonthTransactions, 'income');
    const lastMonthExpenses = calculateTotal(lastMonthTransactions, 'expense');
    const lastMonthNetFlow = lastMonthIncome - lastMonthExpenses;

    const calculateChange = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    const incomeChange = calculateChange(totalIncome, lastMonthIncome);
    const expenseChange = calculateChange(totalExpenses, lastMonthExpenses);
    const netFlowChange = calculateChange(netFlow, lastMonthNetFlow);

    const recentTransactions = [...transactions]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);

    const expenseByCategory = currentTransactions
      .filter(t => t.type === 'expense')
      .reduce((acc: { [key: string]: number }, t) => {
        const categoryName = categories.find(c => c.id === t.categoryId)?.name || 'Uncategorized';
        acc[categoryName] = (acc[categoryName] || 0) + t.amount;
        return acc;
      }, {} as { [key: string]: number });

    const sortedExpenses = (Object.entries(expenseByCategory) as [string, number][])
      .sort(([, a], [, b]) => b - a)
      .map(([name, value]) => ({ name, value }));

    return {
      totalIncome, totalExpenses, netFlow,
      incomeChange, expenseChange, netFlowChange,
      recentTransactions, expenseByCategory: sortedExpenses
    };
  }, [transactions, categories, currentDate, user?.timezone]);

  const dateRangeLabel = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const format = (d: Date) => new Intl.DateTimeFormat(undefined, { year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
    const firstDay = new Date(year, month, 1);
    // For the current month, don't show future dates the user hasn't reached
    // yet — cap the range at today. Past months always show the full month.
    if (isAtCurrentMonth) {
      return `Showing transactions from ${format(firstDay)} to today (${format(now)})`;
    }
    const lastDay = new Date(year, month + 1, 0);
    return `Showing transactions from ${format(firstDay)} to ${format(lastDay)}`;
  }, [currentDate, isAtCurrentMonth]);

  const topSpendingCategories = expenseByCategory.slice(0, 5);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <TipBanner />

      {/* Month Navigator Header with Date Range Label */}
      <div data-tour="month-nav" className="flex flex-col sm:flex-row justify-between items-center gap-4">
        {/* Month slider on the left */}
        <div className="flex items-center bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 p-1">
          <button
            onClick={() => changeMonth(-1)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
            aria-label="Previous month"
          >
            <Icon name="ChevronLeft" size={20} />
          </button>
          <h2 className="text-base font-semibold text-gray-900 dark:text-white w-40 text-center tabular-nums">
            {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
          </h2>
          <button
            onClick={() => changeMonth(1)}
            disabled={isAtCurrentMonth}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent dark:disabled:hover:bg-transparent"
            aria-label="Next month"
          >
            <Icon name="ChevronRight" size={20} />
          </button>
        </div>

        {/* Date range label on the right */}
        <span className="text-xs font-bold text-primary bg-primary-light/60 dark:bg-primary/20 dark:text-indigo-300 border border-primary-light px-3 py-1.5 rounded-lg inline-block shadow-sm">
          {dateRangeLabel}
        </span>
      </div>

      {/* Stats Cards (Total Expenses card swapped to first column) */}
      <div data-tour="stat-cards" className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Total Expenses" amount={totalExpenses} change={expenseChange} type="expense" currency={currency} />
        <StatCard title="Total Income" amount={totalIncome} change={incomeChange} type="income" currency={currency} />
        <StatCard title="This Month's Balance" subtitle="Income minus Expenses" amount={netFlow} change={netFlowChange} type="net" currency={currency} />
      </div>

      {/* Merged Expense Distribution Layout (spans full 3 columns) */}
      <Card className="lg:col-span-3">
        <div className="flex justify-between items-center gap-4 mb-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-baseline flex-wrap">
            <span>Where Your Money Went</span>
            <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 ml-1.5">(This month, by category)</span>
          </h3>
          <button
            onClick={() => setActivePage('Reports')}
            className="flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary-600 hover:underline transition-colors"
            title="View Detailed Report"
          >
            <Icon name="PieChart" size={16} />
            <span>Detailed Report</span>
          </button>
        </div>

        {expenseByCategory.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 dark:text-gray-500 mb-3">
              <Icon name="Tags" size={24} />
            </div>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">No expenses recorded for this month.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Pie Chart Column */}
            <div className="lg:col-span-5 h-[320px] relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expenseByCategory}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={105}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {expenseByCategory.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[entry.name as keyof typeof COLORS] || DEFAULT_COLORS[index % DEFAULT_COLORS.length]}
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
                <span className="text-2xl font-black text-gray-900 dark:text-white leading-none">
                  {formatCurrency(totalExpenses, currency)}
                </span>
                <span className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mt-1.5">Total Spent</span>
              </div>
            </div>

            {/* Detailed Category List Column */}
            <div className="lg:col-span-7 space-y-3 max-h-[320px] overflow-y-auto pr-1 w-full max-w-xl mx-auto lg:ml-auto lg:mr-0">
              {expenseByCategory.map((cat, index) => {
                const color = COLORS[cat.name as keyof typeof COLORS] || DEFAULT_COLORS[index % DEFAULT_COLORS.length];
                const category = categories.find(c => c.name === cat.name);
                const icon = category?.icon || 'Tags';
                const percentage = totalExpenses > 0 ? ((cat.value / totalExpenses) * 100).toFixed(1) : '0';

                return (
                  <div key={cat.name} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold" style={{ color: color, backgroundColor: `${color}15` }}>
                        <Icon name={icon} size={18} />
                      </div>
                      <span className="font-semibold text-sm text-gray-800 dark:text-gray-200">{cat.name}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-gray-800 px-2 py-1 rounded-md">
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

      {/* Bottom Grid layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Transactions */}
        <Card className="lg:col-span-2 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Recent Transactions</h3>
            <button
              onClick={() => setActivePage('Transactions')}
              className="text-sm font-semibold text-primary hover:text-primary-600 hover:underline transition-colors"
            >
              View All
            </button>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800 flex-1">
            {recentTransactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-8 text-center">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No transactions recorded yet.</p>
              </div>
            ) : (
              recentTransactions.map(t => <TransactionRow key={t.id} transaction={t} />)
            )}
          </div>
        </Card>

        {/* Accounts Overview Summary */}
        <Card className="flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Accounts Summary</h3>
            <button
              onClick={() => setActivePage('Accounts')}
              className="text-sm font-semibold text-primary hover:text-primary-600 hover:underline transition-colors"
            >
              Manage
            </button>
          </div>
          <div className="space-y-4 flex-1">
            {activeAccounts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-8 text-center">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No accounts created yet.</p>
              </div>
            ) : (
              activeAccounts.map(acc => {
                let accIcon = 'Wallet';
                if (acc.type.toLowerCase().includes('savings') || acc.type.toLowerCase().includes('piggy')) accIcon = 'PiggyBank';
                else if (acc.type.toLowerCase().includes('credit')) accIcon = 'CreditCard';
                else if (acc.type.toLowerCase().includes('bank') || acc.type.toLowerCase().includes('checking')) accIcon = 'Landmark';
                
                return (
                  <div key={acc.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50/50 dark:bg-gray-800/20 border border-gray-100 dark:border-gray-700/40">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary-light dark:bg-primary/10 flex items-center justify-center text-primary dark:text-indigo-300">
                        <Icon name={acc.icon || accIcon} size={16} />
                      </div>
                      <div>
                        <p className="font-semibold text-xs text-gray-800 dark:text-gray-200">{acc.name}</p>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400">{acc.type}</p>
                      </div>
                    </div>
                    <span className={`font-bold text-xs ${acc.balance < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-gray-900 dark:text-white'}`}>
                      {formatCurrency(acc.balance, currency)}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};
