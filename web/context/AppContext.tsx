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
  addTransaction: (transaction: Omit<Transaction, 'id'>) => Promise<boolean>;
  updateTransaction: (id: string, transaction: Partial<Transaction>) => Promise<boolean>;
  deleteTransaction: (id: string) => Promise<boolean>;
  bulkDeleteTransactions: (ids: string[]) => Promise<boolean>;
  addAccount: (account: Omit<Account, 'id'>) => Promise<boolean>;
  updateAccount: (id: string, account: Partial<Account>) => Promise<boolean>;
  deleteAccount: (id: string) => Promise<boolean>;
  addCategory: (category: Omit<Category, 'id'>) => Promise<boolean>;
  updateCategory: (id: string, category: Partial<Category>) => Promise<boolean>;
  deleteCategory: (id: string) => Promise<boolean>;
  setBudget: (budget: Budget) => Promise<boolean>;
  deleteBudget: (id: string) => Promise<boolean>;
  addRecurring: (rule: Partial<RecurringRule>) => Promise<boolean>;
  updateRecurring: (id: string, rule: Partial<RecurringRule>) => Promise<boolean>;
  deleteRecurring: (id: string) => Promise<boolean>;
  runRecurring: (id: string) => Promise<boolean>;
  clearAllTransactions: (confirmationPhrase: string) => Promise<boolean>;
  setActivePage: (page: Page) => void;
  refreshData: () => Promise<void>;
  user: User | null;
  updateUser: (user: User) => void;
}

export const AppContext = React.createContext<AppContextValue | null>(null);
