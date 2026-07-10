import React, { useContext } from 'react';
import { AppContext } from '../App';
import { Icon } from './Icon';
import { NotificationCenter } from './NotificationCenter';
import { formatCurrency } from '../utils/currency';

interface HeaderProps {
  pageTitle: string;
  onNewTransaction: () => void;
}

const getPageSubtitle = (title: string) => {
  switch (title.toLowerCase()) {
    case 'dashboard':
      return 'Overview of your financial health';
    case 'accounts':
      return 'Manage your bank accounts and cards';
    case 'budgets':
      return 'Monitor your monthly spending limits';
    case 'reports':
      return 'Analyze your expense distribution';
    case 'recurring':
      return 'Rent, EMI, salary, subscriptions, and other scheduled entries.';
    case 'settings':
      return 'Configure API keys and preferences';
    case 'admin':
      return 'Super admin console';
    default:
      return 'Track and optimize your finances';
  }
};

export const Header: React.FC<HeaderProps> = ({ pageTitle, onNewTransaction }) => {
  const context = useContext(AppContext);
  const accounts = context?.accounts || [];
  const currency = context?.currency || 'INR';

  const netWorth = accounts.reduce((sum, acc) => sum + acc.balance, 0);

  const displayTitle = pageTitle === 'Budgets' 
    ? 'Budget Management' 
    : pageTitle === 'Recurring' 
      ? 'Recurring Transactions' 
      : pageTitle === 'Transactions' 
        ? 'All Transactions' 
        : pageTitle;

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-300 p-4 sm:px-6 lg:px-8 flex items-center justify-between dark:bg-gray-800 dark:border-gray-700 backdrop-blur-sm bg-opacity-95 dark:bg-opacity-95 shadow-sm">
      <div className="flex flex-col">
        <h2 className="text-xl sm:text-2xl font-black text-gray-darkest dark:text-gray-50 leading-tight">{displayTitle}</h2>
        <span className="text-xs text-gray-medium dark:text-gray-400 font-medium hidden sm:inline">{getPageSubtitle(pageTitle)}</span>
      </div>
      
      <div className="flex items-center gap-3 sm:gap-4">
        <div className="flex flex-col items-end border-r border-gray-200 dark:border-gray-700 pr-3 sm:pr-4">
          <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Net Worth</span>
          <span className="text-base sm:text-lg font-black text-primary dark:text-indigo-400">{formatCurrency(netWorth, currency)}</span>
        </div>
        
        <NotificationCenter />
        <button
          onClick={onNewTransaction}
          className="btn btn-primary flex items-center gap-2 py-2 px-3 sm:px-4"
        >
          <Icon name="Plus" size={20} />
          <span className="hidden sm:inline">New Transaction</span>
        </button>
      </div>
    </header>
  );
};