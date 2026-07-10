import React from 'react';
import { Account, Budget, Category, Transaction, Page, User, RecurringRule } from '../types';

export interface AppContextValue {
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  budgets: Budget[];
  recurring: RecurringRule[];
  currency: string;
  setCurrency: (currency: string) => void;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  addTransaction: (transaction: Omit<Transaction, 'id'>) => Promise<void>;
  updateTransaction: (id: string, transaction: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  bulkDeleteTransactions: (ids: string[]) => Promise<void>;
  addAccount: (account: Omit<Account, 'id'>) => Promise<void>;
  updateAccount: (id: string, account: Partial<Account>) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  addCategory: (category: Omit<Category, 'id'>) => Promise<void>;
  updateCategory: (id: string, category: Partial<Category>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  setBudget: (budget: Budget) => Promise<void>;
  deleteBudget: (id: string) => Promise<void>;
  addRecurring: (rule: Partial<RecurringRule>) => Promise<void>;
  updateRecurring: (id: string, rule: Partial<RecurringRule>) => Promise<void>;
  deleteRecurring: (id: string) => Promise<void>;
  runRecurring: (id: string) => Promise<void>;
  clearAllTransactions: (confirmationPhrase: string) => Promise<void>;
  setActivePage: (page: Page) => void;
  refreshData: () => Promise<void>;
  user: User | null;
}

export const AppContext = React.createContext<AppContextValue | null>(null);
