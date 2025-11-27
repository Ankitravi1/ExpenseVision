

export type Page = 'Dashboard' | 'Transactions' | 'Budgets' | 'Accounts' | 'Categories' | 'Profile' | 'Settings';


export type TransactionType = 'income' | 'expense' | 'transfer';

// Allow string for custom types
export type AccountType = 'Checking' | 'Savings' | 'Cash' | 'Credit Card' | 'Asset' | 'Liability' | string;

export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: TransactionType;
  categoryId: string;
  accountId: string;
  transferToAccountId?: string;
}

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  icon: string;
}

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  balance: number;
  icon?: string; // Added icon support
  logo?: string;
}

export interface Budget {
  id: string;
  categoryId: string;
  amount: number;
  spent: number;
}

export interface User {
  id: string;
  email: string;
  name: string;
  country?: string | null;
  currency?: string | null;
  theme?: string | null;
  profilePicture?: string | null;
  profileComplete?: boolean;
  emailVerified?: boolean;
}
