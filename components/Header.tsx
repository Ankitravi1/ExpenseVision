import React from 'react';
import { Icon } from './Icon';


interface HeaderProps {
  pageTitle: string;
  onNewTransaction: () => void;
}

export const Header: React.FC<HeaderProps> = ({ pageTitle, onNewTransaction }) => {
  return (
    <header className="bg-white border-b border-gray-200 p-4 sm:px-6 lg:px-8 flex items-center justify-between dark:bg-gray-800 dark:border-gray-700 backdrop-blur-sm bg-opacity-95 dark:bg-opacity-95">
      <h2 className="text-2xl font-bold text-gray-darkest dark:text-gray-50">{pageTitle}</h2>
      <div className="flex items-center gap-2 sm:gap-3">
        <button className="p-2 rounded-full text-gray-medium hover:bg-gray-light hover:text-gray-darkest dark:hover:bg-gray-700 dark:text-gray-400 dark:hover:text-white transition-all">
          <Icon name="Bell" size={22} />
        </button>
        <button
          onClick={onNewTransaction}
          className="btn btn-primary flex items-center gap-2"
        >
          <Icon name="Plus" size={20} />
          <span className="hidden sm:inline">New Transaction</span>
        </button>
      </div>
    </header>
  );
};