import { API_URL } from '../config';
import { storage } from './storage';
import { Account, Budget, Category, RecurringRule, Transaction, User } from '../types';
import { AiSettings } from './aiSettings';

// Fired when the session can no longer be refreshed; AuthContext listens.
let onUnauthorized: (() => void) | null = null;
export const setOnUnauthorized = (handler: () => void) => {
    onUnauthorized = handler;
};

// Single-flight token refresh. The backend rotates and revokes refresh tokens on
// use (each refresh token is single-use), so concurrent 401s (initial-data +
// notifications + ai-settings on app open) must NOT each POST /auth/refresh-token
// with the same token — the first would succeed and the rest 401, forcing a random
// logout. Instead every caller awaits the same in-flight refresh. Resolves to the
// new access token, or null when the shared refresh itself failed.
let refreshPromise: Promise<string | null> | null = null;

const performRefresh = async (): Promise<string | null> => {
    const refreshToken = await storage.getRefreshToken();
    if (!refreshToken) return null;
    try {
        const refreshResponse = await fetch(`${API_URL}/auth/refresh-token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
        });
        if (!refreshResponse.ok) return null;
        const data = await refreshResponse.json();
        await storage.setTokens(data.token, data.refreshToken);
        return data.token as string;
    } catch {
        return null;
    }
};

export const apiFetch = async (endpoint: string, options: RequestInit = {}): Promise<Response> => {
    const token = await storage.getToken();

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string>),
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    let response = await fetch(`${API_URL}${endpoint}`, { ...options, headers });

    // Access token expired → refresh once (shared across concurrent callers), then
    // retry the original request with the new access token.
    if (response.status === 401) {
        if (!refreshPromise) {
            refreshPromise = performRefresh().finally(() => {
                refreshPromise = null;
            });
        }
        const newToken = await refreshPromise;
        if (newToken) {
            headers['Authorization'] = `Bearer ${newToken}`;
            response = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
        } else {
            // The shared refresh failed → the session is truly dead.
            await storage.clearTokens();
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
    }> => json(await apiFetch('/initial-data'), 'Failed to load data'),

    // Transactions
    createTransaction: async (data: Omit<Transaction, 'id'>): Promise<Transaction> =>
        json(await apiFetch('/transactions', { method: 'POST', body: JSON.stringify(data) }), 'Failed to add transaction'),
    parseTransactionText: async (data: { text: string; preferredType?: Transaction['type'] }): Promise<{
        type: Transaction['type'];
        amount: number;
        note: string;
        date: string;
        time?: string;
        accountId: string;
        categoryId: string;
        transferToAccountId: string;
        confidence: number | null;
        missingFields: string[];
        sourceText: string;
    }> =>
        json(await apiFetch('/transactions/parse-text', { method: 'POST', body: JSON.stringify(data) }), 'Failed to parse transaction note'),
    updateTransaction: async (id: string, data: Partial<Transaction>): Promise<Transaction> =>
        json(await apiFetch(`/transactions/${id}`, { method: 'PUT', body: JSON.stringify(data) }), 'Failed to update transaction'),
    deleteTransaction: async (id: string): Promise<void> =>
        json(await apiFetch(`/transactions/${id}`, { method: 'DELETE' }), 'Failed to delete transaction'),
    deleteAllTransactions: async (confirmationPhrase: string): Promise<void> =>
        json(
            await apiFetch('/transactions/all', {
                method: 'DELETE',
                body: JSON.stringify({ confirmationPhrase }),
            }),
            'Failed to clear transactions'
        ),
    exportTransactionsCsv: async (): Promise<string> => {
        const res = await apiFetch('/transactions/export');
        if (!res.ok) throw new Error('Failed to export transactions');
        return res.text();
    },

    // Recurring rules
    getRecurring: async (): Promise<RecurringRule[]> => json(await apiFetch('/recurring'), 'Failed to load recurring rules'),
    createRecurring: async (data: {
        note: string;
        amount: number;
        type: Transaction['type'];
        accountId: string;
        transferToAccountId?: string | null;
        categoryId?: string | null;
        frequency: RecurringRule['frequency'];
        startDate: string;
        endDate?: string | null;

    }): Promise<RecurringRule> =>
        json(await apiFetch('/recurring', { method: 'POST', body: JSON.stringify(data) }), 'Failed to add recurring rule'),
    updateRecurring: async (id: string, data: Partial<RecurringRule> & { startDate?: string }): Promise<RecurringRule> =>
        json(await apiFetch(`/recurring/${id}`, { method: 'PUT', body: JSON.stringify(data) }), 'Failed to update recurring rule'),
    deleteRecurring: async (id: string): Promise<void> =>
        json(await apiFetch(`/recurring/${id}`, { method: 'DELETE' }), 'Failed to delete recurring rule'),

    // Accounts
    getAccounts: async (): Promise<Account[]> => json(await apiFetch('/accounts'), 'Failed to load accounts'),
    createAccount: async (data: Omit<Account, 'id'>): Promise<Account> =>
        json(await apiFetch('/accounts', { method: 'POST', body: JSON.stringify(data) }), 'Failed to add account'),
    updateAccount: async (id: string, data: Partial<Account>): Promise<Account> =>
        json(await apiFetch(`/accounts/${id}`, { method: 'PUT', body: JSON.stringify(data) }), 'Failed to update account'),
    deleteAccount: async (id: string): Promise<void> =>
        json(await apiFetch(`/accounts/${id}`, { method: 'DELETE' }), 'Failed to delete account'),

    // Categories
    createCategory: async (data: Omit<Category, 'id'>): Promise<Category> =>
        json(await apiFetch('/categories', { method: 'POST', body: JSON.stringify(data) }), 'Failed to add category'),
    updateCategory: async (id: string, data: Partial<Category>): Promise<Category> =>
        json(await apiFetch(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }), 'Failed to update category'),
    deleteCategory: async (id: string): Promise<void> =>
        json(await apiFetch(`/categories/${id}`, { method: 'DELETE' }), 'Failed to delete category'),

    // Budgets
    getBudgets: async (): Promise<Budget[]> => json(await apiFetch('/budgets'), 'Failed to load budgets'),
    setBudget: async (data: { id?: string; categoryId: string; amount: number; month?: string | null; rollover?: boolean; alertThreshold?: number; spent?: number }): Promise<Budget> =>
        json(await apiFetch('/budgets', { method: 'POST', body: JSON.stringify(data) }), 'Failed to set budget'),
    deleteBudget: async (id: string): Promise<void> =>
        json(await apiFetch(`/budgets/${id}`, { method: 'DELETE' }), 'Failed to delete budget'),

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
    // No dedicated GET endpoint exists; PUT /auth/update-profile with an empty body
    // returns the current user unchanged (and 401s on an invalid/expired session),
    // so it doubles as "fetch me".
    getProfile: async (): Promise<{ user: User }> =>
        json(await apiFetch('/auth/update-profile', { method: 'PUT', body: JSON.stringify({}) }), 'Failed to load profile'),
    completeProfile: async (data: { currency: string; timezone?: string; country?: string }): Promise<{ user: User }> =>
        json(await apiFetch('/auth/complete-profile', { method: 'PUT', body: JSON.stringify(data) }), 'Failed to complete profile'),
    updateProfile: async (data: { name?: string; currency?: string; timezone?: string; theme?: string }): Promise<{ user: User }> =>
        json(await apiFetch('/auth/update-profile', { method: 'PUT', body: JSON.stringify(data) }), 'Failed to update profile'),

    googleAuth: async (googleToken: string): Promise<{
        user: User;
        token: string;
        refreshToken: string;
        needsProfileCompletion?: boolean;
    }> => {
        const res = await fetch(`${API_URL}/auth/google`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ googleToken }),
        });
        return json(res, 'Google auth failed');
    },
};
