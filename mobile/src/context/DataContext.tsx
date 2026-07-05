import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { useAuth } from './AuthContext';
import { Account, Budget, Category, RecurringRule, Transaction } from '../types';
import { transactionDateToIso } from '../utils/date';

interface DataContextValue {
    accounts: Account[];
    categories: Category[];
    transactions: Transaction[];
    budgets: Budget[];
    recurring: RecurringRule[];
    isLoading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
    addTransaction: (t: Omit<Transaction, 'id'>) => Promise<void>;
    updateTransaction: (id: string, t: Partial<Transaction>) => Promise<void>;
    deleteTransaction: (id: string) => Promise<void>;
    clearAllTransactions: () => Promise<void>;
    addAccount: (a: Omit<Account, 'id'>) => Promise<void>;
    updateAccount: (id: string, a: Partial<Account>) => Promise<void>;
    deleteAccount: (id: string) => Promise<void>;
    addCategory: (c: Omit<Category, 'id'>) => Promise<void>;
    updateCategory: (id: string, c: Partial<Category>) => Promise<void>;
    deleteCategory: (id: string) => Promise<void>;
    setBudget: (b: { categoryId: string; amount: number; month?: string; rollover?: boolean; alertThreshold?: number }) => Promise<void>;
    deleteBudget: (id: string) => Promise<void>;
    addRecurring: (r: Parameters<typeof api.createRecurring>[0]) => Promise<void>;
    updateRecurring: (id: string, r: Partial<RecurringRule> & { startDate?: string }) => Promise<void>;
    deleteRecurring: (id: string) => Promise<void>;
}

const DataContext = createContext<DataContextValue | null>(null);

const byDateDesc = (a: Transaction, b: Transaction) =>
    transactionDateToIso(b.date).localeCompare(transactionDateToIso(a.date));

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { isAuthenticated } = useAuth();
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [budgets, setBudgets] = useState<Budget[]>([]);
    const [recurring, setRecurring] = useState<RecurringRule[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await api.getInitialData();
            setAccounts(data.accounts);
            setCategories(data.categories);
            setTransactions(data.transactions);
            setBudgets(data.budgets);
            setRecurring(data.recurring || []);
        } catch (err: any) {
            setError(err.message || 'Failed to load data');
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Balances and budget progress change server-side with every transaction
    const refreshFinancials = useCallback(async () => {
        try {
            const [freshAccounts, freshBudgets] = await Promise.all([api.getAccounts(), api.getBudgets()]);
            setAccounts(freshAccounts);
            setBudgets(freshBudgets);
        } catch (err) {
            console.warn('Failed to refresh balances', err);
        }
    }, []);

    useEffect(() => {
        if (isAuthenticated) {
            refresh();
        } else {
            setAccounts([]);
            setCategories([]);
            setTransactions([]);
            setBudgets([]);
            setRecurring([]);
        }
    }, [isAuthenticated, refresh]);

    const addTransaction = useCallback(async (t: Omit<Transaction, 'id'>) => {
        const created = await api.createTransaction(t);
        setTransactions(prev => [created, ...prev].sort(byDateDesc));
        await refreshFinancials();
    }, [refreshFinancials]);

    const updateTransaction = useCallback(async (id: string, t: Partial<Transaction>) => {
        const updated = await api.updateTransaction(id, t);
        setTransactions(prev => prev.map(x => (x.id === id ? updated : x)).sort(byDateDesc));
        await refreshFinancials();
    }, [refreshFinancials]);

    const deleteTransaction = useCallback(async (id: string) => {
        await api.deleteTransaction(id);
        setTransactions(prev => prev.filter(x => x.id !== id));
        await refreshFinancials();
    }, [refreshFinancials]);

    const clearAllTransactions = useCallback(async () => {
        await api.deleteAllTransactions();
        setTransactions([]);
        await refreshFinancials();
    }, [refreshFinancials]);

    // Recurring: the server creates due transactions the next time initial-data
    // loads, so a full refresh after create/update keeps everything in sync
    const addRecurring = useCallback(async (r: Parameters<typeof api.createRecurring>[0]) => {
        await api.createRecurring(r);
        await refresh();
    }, [refresh]);

    const updateRecurring = useCallback(async (id: string, r: Partial<RecurringRule> & { startDate?: string }) => {
        await api.updateRecurring(id, r);
        await refresh();
    }, [refresh]);

    const deleteRecurring = useCallback(async (id: string) => {
        await api.deleteRecurring(id);
        setRecurring(prev => prev.filter(x => x.id !== id));
    }, []);

    const addAccount = useCallback(async (a: Omit<Account, 'id'>) => {
        const created = await api.createAccount(a);
        setAccounts(prev => [...prev, created]);
    }, []);

    const updateAccount = useCallback(async (id: string, a: Partial<Account>) => {
        const updated = await api.updateAccount(id, a);
        setAccounts(prev => prev.map(x => (x.id === id ? updated : x)));
    }, []);

    const deleteAccount = useCallback(async (id: string) => {
        await api.deleteAccount(id);
        setAccounts(prev => prev.filter(x => x.id !== id));
    }, []);

    const addCategory = useCallback(async (c: Omit<Category, 'id'>) => {
        const created = await api.createCategory(c);
        setCategories(prev => [...prev, created]);
    }, []);

    const updateCategory = useCallback(async (id: string, c: Partial<Category>) => {
        const updated = await api.updateCategory(id, c);
        setCategories(prev => prev.map(x => (x.id === id ? updated : x)));
    }, []);

    const deleteCategory = useCallback(async (id: string) => {
        await api.deleteCategory(id);
        setCategories(prev => prev.filter(x => x.id !== id));
    }, []);

    const setBudget = useCallback(async (b: { categoryId: string; amount: number; month?: string; rollover?: boolean; alertThreshold?: number }) => {
        const saved = await api.setBudget(b);
        setBudgets(prev => {
            const existing = prev.find(x => x.id === saved.id || x.categoryId === saved.categoryId);
            if (existing) return prev.map(x => (x.id === existing.id ? saved : x));
            return [...prev, saved];
        });
    }, []);

    const deleteBudget = useCallback(async (id: string) => {
        await api.deleteBudget(id);
        setBudgets(prev => prev.filter(x => x.id !== id));
    }, []);

    return (
        <DataContext.Provider
            value={{
                accounts, categories, transactions, budgets, recurring, isLoading, error, refresh,
                addTransaction, updateTransaction, deleteTransaction, clearAllTransactions,
                addAccount, updateAccount, deleteAccount,
                addCategory, updateCategory, deleteCategory,
                setBudget, deleteBudget,
                addRecurring, updateRecurring, deleteRecurring,
            }}
        >
            {children}
        </DataContext.Provider>
    );
};

export const useData = (): DataContextValue => {
    const ctx = useContext(DataContext);
    if (!ctx) throw new Error('useData must be used within DataProvider');
    return ctx;
};
