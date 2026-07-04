export type TransactionType = 'income' | 'expense' | 'transfer';

export interface Transaction {
    id: string;
    date: string; // YYYY-MM-DD
    description: string;
    amount: number;
    type: TransactionType;
    categoryId: string | null;
    accountId: string;
    transferToAccountId?: string | null;
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
    color?: string | null;
    icon?: string | null;
    logo?: string | null;
}

export interface Budget {
    id: string;
    categoryId: string;
    amount: number;
    month?: string | null;
    spent: number;
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
