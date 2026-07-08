export type TransactionType = 'income' | 'expense' | 'transfer';

export interface Transaction {
    id: string;
    date: string; // YYYY-MM-DD
    note: string;
    amount: number;
    type: TransactionType;
    categoryId: string | null;
    accountId: string;
    transferToAccountId?: string | null;
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
    nextRun: string; // YYYY-MM-DD
    endDate?: string | null;
    active: boolean;
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
    type: string;
    balance: number;
    initialBalance: number;
    color?: string | null;
    icon?: string | null;
    logo?: string | null;
}

export interface Budget {
    id: string;
    categoryId: string;
    amount: number;
    month?: string | null;
    rollover?: boolean;
    alertThreshold?: number; // percent (default 100)
    spent: number;
    carryover?: number; // last month's leftover when rollover is on
    effectiveAmount?: number; // amount + carryover, min 0
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
    expoPushToken?: string | null;
}
