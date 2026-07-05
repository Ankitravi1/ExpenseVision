import { API_URL } from '../config';
import { storage } from './storage';
import { Account, Budget, Category, RecurringRule, Transaction, User } from '../types';
import { AiSettings } from './aiSettings';

// Fired when the session can no longer be refreshed; AuthContext listens.
let onUnauthorized: (() => void) | null = null;
export const setOnUnauthorized = (handler: () => void) => {
    onUnauthorized = handler;
};

const request = async (endpoint: string, options: RequestInit = {}): Promise<Response> => {
    const token = await storage.getToken();

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string>),
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    let response = await fetch(`${API_URL}${endpoint}`, { ...options, headers });

    // Access token expired → try refresh once, then retry the request
    if (response.status === 401) {
        const refreshToken = await storage.getRefreshToken();
        if (refreshToken) {
            try {
                const refreshResponse = await fetch(`${API_URL}/auth/refresh-token`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ refreshToken }),
                });
                if (refreshResponse.ok) {
                    const data = await refreshResponse.json();
                    await storage.setTokens(data.token, data.refreshToken);
                    headers['Authorization'] = `Bearer ${data.token}`;
                    response = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
                } else {
                    await storage.clearTokens();
                    onUnauthorized?.();
                }
            } catch {
                await storage.clearTokens();
                onUnauthorized?.();
            }
        } else {
            onUnauthorized?.();
        }
    }

    return response;
};

const json = async <T>(res: Response, fallbackError: string): Promise<T> => {
    if (!res.ok) {
        const body = await res.json().catch(() => ({} as any));
        throw new Error(typeof body.error === 'string' ? body.error : fallbackError);
    }
    if (res.status === 204) return null as T;
    return res.json();
};

export const api = {
    getInitialData: async (): Promise<{
        accounts: Account[];
        categories: Category[];
        transactions: Transaction[];
        budgets: Budget[];
        recurring: RecurringRule[];
    }> => json(await request('/initial-data'), 'Failed to load data'),

    // Transactions
    createTransaction: async (data: Omit<Transaction, 'id'>): Promise<Transaction> =>
        json(await request('/transactions', { method: 'POST', body: JSON.stringify(data) }), 'Failed to add transaction'),
    parseTransactionText: async (data: { text: string; preferredType?: Transaction['type']; aiConfig: AiSettings }): Promise<{
        type: Transaction['type'];
        amount: number;
        description: string;
        date: string;
        accountId: string;
        categoryId: string;
        transferToAccountId: string;
        confidence: number | null;
        missingFields: string[];
        sourceText: string;
    }> =>
        json(await request('/transactions/parse-text', { method: 'POST', body: JSON.stringify(data) }), 'Failed to parse transaction note'),
    updateTransaction: async (id: string, data: Partial<Transaction>): Promise<Transaction> =>
        json(await request(`/transactions/${id}`, { method: 'PUT', body: JSON.stringify(data) }), 'Failed to update transaction'),
    deleteTransaction: async (id: string): Promise<void> =>
        json(await request(`/transactions/${id}`, { method: 'DELETE' }), 'Failed to delete transaction'),
    deleteAllTransactions: async (): Promise<void> =>
        json(await request('/transactions/all', { method: 'DELETE' }), 'Failed to clear transactions'),
    exportTransactionsCsv: async (): Promise<string> => {
        const res = await request('/transactions/export');
        if (!res.ok) throw new Error('Failed to export transactions');
        return res.text();
    },

    // Recurring rules
    getRecurring: async (): Promise<RecurringRule[]> => json(await request('/recurring'), 'Failed to load recurring rules'),
    createRecurring: async (data: {
        description: string;
        amount: number;
        type: Transaction['type'];
        accountId: string;
        transferToAccountId?: string | null;
        categoryId?: string | null;
        frequency: RecurringRule['frequency'];
        startDate: string;
        endDate?: string | null;
        notes?: string | null;
    }): Promise<RecurringRule> =>
        json(await request('/recurring', { method: 'POST', body: JSON.stringify(data) }), 'Failed to add recurring rule'),
    updateRecurring: async (id: string, data: Partial<RecurringRule> & { startDate?: string }): Promise<RecurringRule> =>
        json(await request(`/recurring/${id}`, { method: 'PUT', body: JSON.stringify(data) }), 'Failed to update recurring rule'),
    deleteRecurring: async (id: string): Promise<void> =>
        json(await request(`/recurring/${id}`, { method: 'DELETE' }), 'Failed to delete recurring rule'),

    // Accounts
    getAccounts: async (): Promise<Account[]> => json(await request('/accounts'), 'Failed to load accounts'),
    createAccount: async (data: Omit<Account, 'id'>): Promise<Account> =>
        json(await request('/accounts', { method: 'POST', body: JSON.stringify(data) }), 'Failed to add account'),
    updateAccount: async (id: string, data: Partial<Account>): Promise<Account> =>
        json(await request(`/accounts/${id}`, { method: 'PUT', body: JSON.stringify(data) }), 'Failed to update account'),
    deleteAccount: async (id: string): Promise<void> =>
        json(await request(`/accounts/${id}`, { method: 'DELETE' }), 'Failed to delete account'),

    // Categories
    createCategory: async (data: Omit<Category, 'id'>): Promise<Category> =>
        json(await request('/categories', { method: 'POST', body: JSON.stringify(data) }), 'Failed to add category'),
    updateCategory: async (id: string, data: Partial<Category>): Promise<Category> =>
        json(await request(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }), 'Failed to update category'),
    deleteCategory: async (id: string): Promise<void> =>
        json(await request(`/categories/${id}`, { method: 'DELETE' }), 'Failed to delete category'),

    // Budgets
    getBudgets: async (): Promise<Budget[]> => json(await request('/budgets'), 'Failed to load budgets'),
    setBudget: async (data: { categoryId: string; amount: number; month?: string; rollover?: boolean; alertThreshold?: number }): Promise<Budget> =>
        json(await request('/budgets', { method: 'POST', body: JSON.stringify(data) }), 'Failed to set budget'),
    deleteBudget: async (id: string): Promise<void> =>
        json(await request(`/budgets/${id}`, { method: 'DELETE' }), 'Failed to delete budget'),

    // Auth
    signup: async (data: { email: string; password: string; name: string }): Promise<{ user: User; token: string; refreshToken: string; needsProfileCompletion: boolean }> => {
        const res = await fetch(`${API_URL}/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        return json(res, 'Signup failed');
    },
    login: async (email: string, password: string): Promise<{ user?: User; token?: string; refreshToken?: string; needsProfileCompletion?: boolean; require2FA?: boolean; userId?: string }> => {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });
        return json(res, 'Login failed');
    },
    login2FA: async (userId: string, code: string): Promise<{ user: User; token: string; refreshToken: string }> => {
        const res = await fetch(`${API_URL}/auth/2fa/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, code }),
        });
        return json(res, '2FA login failed');
    },
    forgotPassword: async (email: string): Promise<{ message?: string }> => {
        const res = await fetch(`${API_URL}/auth/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
        });
        return json(res, 'Failed to send reset email');
    },
    completeProfile: async (data: { currency: string; timezone?: string; country?: string }): Promise<{ user: User }> =>
        json(await request('/auth/complete-profile', { method: 'PUT', body: JSON.stringify(data) }), 'Failed to complete profile'),
    updateProfile: async (data: { name?: string; currency?: string; timezone?: string; theme?: string }): Promise<{ user: User }> =>
        json(await request('/auth/update-profile', { method: 'PUT', body: JSON.stringify(data) }), 'Failed to update profile'),
};
