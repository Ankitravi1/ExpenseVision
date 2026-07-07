

export type Page = 'Dashboard' | 'Transactions' | 'Recurring' | 'Budgets' | 'Accounts' | 'Categories' | 'Reports' | 'Profile' | 'Settings';


export type TransactionType = 'income' | 'expense' | 'transfer';

// Allow string for custom types
export type AccountType = 'Checking' | 'Savings' | 'Cash' | 'Credit Card' | 'Asset' | 'Liability' | string;

export interface Transaction {
  id: string;
  date: string;
  note: string;
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
  color?: string;
  icon?: string; // Added icon support
  logo?: string;
}

export interface Budget {
  id: string;
  categoryId: string;
  amount: number;
  spent: number;
  month?: string | null; // YYYY-MM, or null for a recurring (month-less) budget
  rollover?: boolean;
  alertThreshold?: number; // percent, default 100
  carryover?: number; // 0 unless rollover is enabled
  effectiveAmount?: number; // amount + carryover, clamped >= 0
}

export type RecurringFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface RecurringRule {
  id: string;
  note: string;
  amount: number;
  type: TransactionType;
  accountId: string;
  transferToAccountId?: string | null;
  categoryId?: string | null;
  frequency: RecurringFrequency;
  startDate: string; // YYYY-MM-DD
  endDate?: string | null; // YYYY-MM-DD
  nextRun: string; // YYYY-MM-DD
  dayAnchor?: number | null;
  active: boolean;

}

export interface User {
  id: string;
  email: string;
  name: string;
  country?: string | null;
  timezone?: string | null;
  currency?: string | null;
  theme?: string | null;
  profilePicture?: string | null;
  profileComplete?: boolean;
  emailVerified?: boolean;
}
