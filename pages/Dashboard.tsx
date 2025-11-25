
import React, { useContext, useMemo, useState } from 'react';
import { AppContext } from '../App';
import { Card } from '../components/Card';
import { Icon } from '../components/Icon';
import { Transaction } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

const StatCard: React.FC<{ title: string; amount: number; change: number; type: 'income' | 'expense' | 'net' }> = ({ title, amount, change, type }) => {
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
            ₹{amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
  const { categories, accounts } = useContext(AppContext)!;
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
        {amountPrefix}₹{transaction.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
  const { transactions, categories, setActivePage } = useContext(AppContext)!;
  const [currentDate, setCurrentDate] = useState(new Date());

  const changeMonth = (offset: number) => {
    setCurrentDate(prevDate => {
      const newDate = new Date(prevDate);
      newDate.setMonth(newDate.getMonth() + offset);
      return newDate;
    });
  };

  const { totalIncome, totalExpenses, netFlow, recentTransactions, expenseByCategory } = useMemo(() => {
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    startOfMonth.setUTCHours(0, 0, 0, 0);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    endOfMonth.setUTCHours(23, 59, 59, 999);

    const currentTransactions = transactions.filter(t => {
      const tDate = new Date(t.date);
      return tDate >= startOfMonth && tDate <= endOfMonth;
    });

    const totalIncome = currentTransactions
      .filter(t => t.type === 'income')
      .reduce((sum: number, t) => sum + t.amount, 0);

    const totalExpenses = currentTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum: number, t) => sum + t.amount, 0);

    const netFlow = totalIncome - totalExpenses;

    const recentTransactions = transactions
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5); // Compact list, show only 5

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

    return { totalIncome, totalExpenses, netFlow, recentTransactions, expenseByCategory: sortedExpenses };
  }, [transactions, categories, currentDate]);

  const topSpendingCategories = expenseByCategory.slice(0, 5);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header & Month Selector */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Overview of your financial health</p>
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
        <StatCard title="Total Income" amount={totalIncome} change={5.2} type="income" />
        <StatCard title="Total Expenses" amount={totalExpenses} change={8.1} type="expense" />
        <StatCard title="Net Flow" amount={netFlow} change={-2.7} type="net" />
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
                  formatter={(value: number) => `₹${value.toLocaleString('en-IN')}`}
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
                ₹{totalExpenses.toLocaleString('en-IN', { notation: 'compact' })}
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
                    <span className="font-semibold text-gray-900 dark:text-white">₹{cat.value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
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
