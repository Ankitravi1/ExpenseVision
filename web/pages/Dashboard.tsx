
import React, { useContext, useMemo, useState } from 'react';
import { AppContext } from '../App';
import { Card } from '../components/Card';
import { Icon } from '../components/Icon';
import { Transaction } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { formatCurrency } from '../utils/currency';

const StatCard: React.FC<{ title: string; amount: number; change: number; type: 'income' | 'expense' | 'net'; currency: string }> = ({ title, amount, change, type, currency }) => {
  const isPositiveChange = change >= 0;

  let gradientClass = '';
  let borderClass = '';
  let textClass = '';
  let trendColorClass = '';
  let iconName = '';

  switch (type) {
    case 'income':
      gradientClass = 'from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20';
      borderClass = 'border-emerald-200 dark:border-emerald-800/30';
      textClass = 'text-emerald-900 dark:text-emerald-100';
      trendColorClass = 'text-emerald-600 dark:text-emerald-400';
      iconName = 'TrendingUp';
      break;
    case 'expense':
      gradientClass = 'from-rose-50 to-rose-100 dark:from-rose-900/20 dark:to-rose-800/20';
      borderClass = 'border-rose-200 dark:border-rose-800/30';
      textClass = 'text-rose-900 dark:text-rose-100';
      trendColorClass = 'text-rose-600 dark:text-rose-400';
      iconName = 'TrendingDown';
      break;
    case 'net':
      gradientClass = 'from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-800/20';
      borderClass = 'border-blue-200 dark:border-blue-800/30';
      textClass = 'text-blue-900 dark:text-blue-100';
      trendColorClass = 'text-blue-600 dark:text-blue-400';
      iconName = 'Wallet';
      break;
  }

  return (
    <div className={`flex-1 p-6 rounded-2xl border bg-gradient-to-br shadow-sm ${gradientClass} ${borderClass}`}>
      <div className="flex justify-between items-start">
        <div>
          <p className={`text-sm font-medium mb-1 ${type === 'income' ? 'text-emerald-700' : type === 'expense' ? 'text-rose-700' : 'text-blue-700'} dark:text-gray-300`}>{title}</p>
          <h3 className={`text-3xl font-bold ${textClass}`}>
            {formatCurrency(amount, currency)}
          </h3>
        </div>
        <div className={`p-2 rounded-lg bg-white/50 dark:bg-white/10 ${textClass}`}>
          <Icon name={iconName} size={20} />
        </div>
      </div>
      <div className="mt-4 flex items-center text-sm">
        <span className={`font-medium flex items-center ${isPositiveChange ? 'text-emerald-600' : 'text-rose-600'}`}>
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
  let displayDescription = transaction.description;
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
    displayDescription = `Transfer to ${destAccount?.name || 'Account'}`;
    amountClass = 'text-blue-600 dark:text-blue-400';
    amountPrefix = '';
    iconBgClass = 'bg-blue-100 dark:bg-blue-900/30';
    iconColorClass = 'text-blue-600 dark:text-blue-400';
  }

  return (
    <div className="flex items-center py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-lg px-2 transition-colors -mx-2">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-4 flex-shrink-0 ${iconBgClass}`}>
        <Icon name={iconName} className={iconColorClass} size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{displayDescription}</p>
        <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          <span>{account?.name}</span>
          <span className="mx-1">•</span>
          <span>{new Date(transaction.date).toLocaleDateString()}</span>
        </div>
      </div>
      <p className={`font-semibold whitespace-nowrap ${amountClass}`}>
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

  const changeMonth = (offset: number) => {
    setCurrentDate(prevDate => {
      const newDate = new Date(prevDate);
      newDate.setMonth(newDate.getMonth() + offset);
      return newDate;
    });
  };

  const netWorth = useMemo(() => accounts.reduce((sum, acc) => sum + acc.balance, 0), [accounts]);

  const { totalIncome, totalExpenses, netFlow, incomeChange, expenseChange, netFlowChange, recentTransactions, expenseByCategory } = useMemo(() => {
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    const lastMonthDate = new Date(currentDate);
    lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
    const lastMonth = lastMonthDate.getMonth();
    const lastMonthYear = lastMonthDate.getFullYear();

    const currentTransactions = transactions.filter(t => {
      const tDate = new Date(t.date);
      let tDateInUserTZ = tDate;
      if (user?.timezone) {
        try {
          const str = tDate.toLocaleString('en-US', { timeZone: user.timezone });
          tDateInUserTZ = new Date(str);
        } catch (e) { }
      }
      return tDateInUserTZ.getMonth() === currentMonth && tDateInUserTZ.getFullYear() === currentYear;
    });

    const lastMonthTransactions = transactions.filter(t => {
      const tDate = new Date(t.date);
      let tDateInUserTZ = tDate;
      if (user?.timezone) {
        try {
          const str = tDate.toLocaleString('en-US', { timeZone: user.timezone });
          tDateInUserTZ = new Date(str);
        } catch (e) { }
      }
      return tDateInUserTZ.getMonth() === lastMonth && tDateInUserTZ.getFullYear() === lastMonthYear;
    });

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

    const recentTransactions = transactions
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

  const topSpendingCategories = expenseByCategory.slice(0, 5);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header & Month Selector */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Overview of your financial health</p>
          </div>
          {/* Net Worth Card */}
          <div className="hidden sm:block px-4 py-2 bg-gray-900 dark:bg-white rounded-xl shadow-lg transform hover:scale-105 transition-transform">
            <p className="text-xs font-medium text-gray-400 dark:text-gray-600 uppercase tracking-wider">Net Worth</p>
            <p className="text-lg font-bold text-white dark:text-gray-900">{formatCurrency(netWorth, currency)}</p>
          </div>
        </div>

        {/* Mobile Net Worth (visible only on small screens) */}
        <div className="sm:hidden w-full px-4 py-3 bg-gray-900 dark:bg-white rounded-xl shadow-lg mb-2">
          <div className="flex justify-between items-center">
            <p className="text-sm font-medium text-gray-400 dark:text-gray-600 uppercase tracking-wider">Net Worth</p>
            <p className="text-xl font-bold text-white dark:text-gray-900">{formatCurrency(netWorth, currency)}</p>
          </div>
        </div>

        <div className="flex items-center bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-1">
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
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
            aria-label="Next month"
          >
            <Icon name="ChevronRight" size={20} />
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Total Income" amount={totalIncome} change={incomeChange} type="income" currency={currency} />
        <StatCard title="Total Expenses" amount={totalExpenses} change={expenseChange} type="expense" currency={currency} />
        <StatCard title="Net Flow" amount={netFlow} change={netFlowChange} type="net" currency={currency} />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Expense Distribution */}
        <Card className="lg:col-span-1 flex flex-col">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Expense Distribution</h3>
          <div className="flex-1 min-h-[300px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={expenseByCategory}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
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
                  formatter={(value: number) => formatCurrency(value, currency)}
                  contentStyle={{
                    backgroundColor: 'rgba(31, 41, 55, 0.95)',
                    border: 'none',
                    borderRadius: '12px',
                    color: '#fff',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                  itemStyle={{ color: '#fff' }}
                />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-12">
              <span className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(totalExpenses, currency)}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">Total</span>
            </div>
          </div>
        </Card>

        {/* Top Spending Categories */}
        <Card className="lg:col-span-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Top Spending Categories</h3>
          <div className="space-y-6">
            {topSpendingCategories.map((cat, index) => {
              const color = COLORS[cat.name as keyof typeof COLORS] || DEFAULT_COLORS[index % DEFAULT_COLORS.length];
              const category = categories.find(c => c.name === cat.name);
              const icon = category?.icon || 'Tags';

              return (
                <div key={cat.name} className="group">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 group-hover:bg-opacity-80 transition-colors" style={{ color: color, backgroundColor: `${color}20` }}>
                        <Icon name={icon} size={16} />
                      </div>
                      <span className="font-medium text-gray-700 dark:text-gray-200">{cat.name}</span>
                    </div>
                    <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(cat.value, currency)}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2 dark:bg-gray-700 overflow-hidden">
                    <div
                      className="h-2 rounded-full transition-all duration-500 ease-out"
                      style={{
                        width: `${totalExpenses > 0 ? (cat.value / totalExpenses) * 100 : 0}%`,
                        backgroundColor: color
                      }}>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Transactions</h3>
          <button
            onClick={() => setActivePage('Transactions')}
            className="text-sm font-medium text-primary hover:text-primary-600 transition-colors"
          >
            View All
          </button>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {recentTransactions.map(t => <TransactionRow key={t.id} transaction={t} />)}
        </div>
      </Card>
    </div>
  );
};
