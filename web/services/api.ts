import { authService } from './auth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface RequestOptions extends RequestInit {
    headers?: Record<string, string>;
}

export const api = {
    fetch: async (endpoint: string, options: RequestOptions = {}) => {
        let token = authService.getToken();

        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...options.headers,
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        let response = await fetch(`${API_URL}${endpoint}`, {
            ...options,
            headers,
        });

        // Handle 401 Unauthorized (Token expired)
        if (response.status === 401) {
            const refreshToken = authService.getRefreshToken();

            if (refreshToken) {
                try {
                    // Try to refresh token
                    const refreshResponse = await fetch(`${API_URL}/auth/refresh-token`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ refreshToken }),
                    });

                    if (refreshResponse.ok) {
                        const data = await refreshResponse.json();
                        authService.setTokens(data.token, data.refreshToken);

                        // Retry original request with new token
                        headers['Authorization'] = `Bearer ${data.token}`;
                        response = await fetch(`${API_URL}${endpoint}`, {
                            ...options,
                            headers,
                        });
                    } else {
                        // Refresh failed, logout
                        authService.logout();
                        window.location.href = '/'; // Redirect to landing
                    }
                } catch (error) {
                    authService.logout();
                    window.location.href = '/';
                }
            } else {
                // No refresh token, logout
                authService.logout();
            }
        }

        return response;
    },

    // Initial Data
    getInitialData: async () => {
        const res = await api.fetch('/initial-data');
        if (!res.ok) throw new Error('Failed to fetch initial data');
        return res.json();
    },

    // Transactions
    getTransactions: async () => {
        const res = await api.fetch('/transactions');
        if (!res.ok) throw new Error('Failed to fetch transactions');
        return res.json();
    },
    createTransaction: async (data: any) => {
        const res = await api.fetch('/transactions', {
            method: 'POST',
            body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error('Failed to create transaction');
        return res.json();
    },
    parseTransactionText: async (data: any) => {
        const res = await api.fetch('/transactions/parse-text', {
            method: 'POST',
            body: JSON.stringify(data),
        });
        if (!res.ok) {
            const error = await res.json().catch(() => ({}));
            throw new Error(error.error || 'Failed to parse transaction text');
        }
        return res.json();
    },
    updateTransaction: async (id: string, data: any) => {
        const res = await api.fetch(`/transactions/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error('Failed to update transaction');
        return res.json();
    },
    deleteTransaction: async (id: string) => {
        const res = await api.fetch(`/transactions/${id}`, {
            method: 'DELETE',
        });
        if (!res.ok) throw new Error('Failed to delete transaction');
        if (res.status === 204) return null;
        return res.json();
    },
    importTransactions: async (data: any[]) => {
        const res = await api.fetch('/transactions/bulk', {
            method: 'POST',
            body: JSON.stringify({ transactions: data }),
        });
        if (!res.ok) throw new Error('Failed to import transactions');
        return res.json();
    },
    clearAllTransactions: async () => {
        const res = await api.fetch('/transactions/all', {
            method: 'DELETE',
        });
        if (!res.ok) throw new Error('Failed to clear transactions');
        if (res.status === 204) return null;
        return res.json();
    },

    // Accounts
    getAccounts: async () => {
        const res = await api.fetch('/accounts');
        if (!res.ok) throw new Error('Failed to fetch accounts');
        return res.json();
    },
    createAccount: async (data: any) => {
        const res = await api.fetch('/accounts', {
            method: 'POST',
            body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error('Failed to create account');
        return res.json();
    },
    updateAccount: async (id: string, data: any) => {
        const res = await api.fetch(`/accounts/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error('Failed to update account');
        return res.json();
    },
    deleteAccount: async (id: string) => {
        const res = await api.fetch(`/accounts/${id}`, {
            method: 'DELETE',
        });
        if (!res.ok) {
            const error = await res.json().catch(() => ({}));
            throw new Error(error.error || 'Failed to delete account');
        }
        if (res.status === 204) return null;
        return res.json();
    },

    // Categories
    getCategories: async () => {
        const res = await api.fetch('/categories');
        if (!res.ok) throw new Error('Failed to fetch categories');
        return res.json();
    },
    createCategory: async (data: any) => {
        const res = await api.fetch('/categories', {
            method: 'POST',
            body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error('Failed to create category');
        return res.json();
    },
    updateCategory: async (id: string, data: any) => {
        const res = await api.fetch(`/categories/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error('Failed to update category');
        return res.json();
    },
    deleteCategory: async (id: string) => {
        const res = await api.fetch(`/categories/${id}`, {
            method: 'DELETE',
        });
        if (!res.ok) {
            const error = await res.json().catch(() => ({}));
            throw new Error(error.error || 'Failed to delete category');
        }
        if (res.status === 204) return null;
        return res.json();
    },

    // Budgets
    getBudgets: async () => {
        const res = await api.fetch('/budgets');
        if (!res.ok) throw new Error('Failed to fetch budgets');
        return res.json();
    },
    createBudget: async (data: any) => {
        const res = await api.fetch('/budgets', {
            method: 'POST',
            body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error('Failed to create budget');
        return res.json();
    },
    deleteBudget: async (id: string) => {
        const res = await api.fetch(`/budgets/${id}`, {
            method: 'DELETE',
        });
        if (!res.ok) throw new Error('Failed to delete budget');
        if (res.status === 204) return null;
        return res.json();
    },

    // Recurring Transactions
    getRecurring: async () => {
        const res = await api.fetch('/recurring');
        if (!res.ok) throw new Error('Failed to fetch recurring rules');
        return res.json();
    },
    createRecurring: async (data: any) => {
        const res = await api.fetch('/recurring', {
            method: 'POST',
            body: JSON.stringify(data),
        });
        if (!res.ok) {
            const error = await res.json().catch(() => ({}));
            throw new Error(error.error || 'Failed to create recurring rule');
        }
        return res.json();
    },
    updateRecurring: async (id: string, data: any) => {
        const res = await api.fetch(`/recurring/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
        if (!res.ok) {
            const error = await res.json().catch(() => ({}));
            throw new Error(error.error || 'Failed to update recurring rule');
        }
        return res.json();
    },
    deleteRecurring: async (id: string) => {
        const res = await api.fetch(`/recurring/${id}`, {
            method: 'DELETE',
        });
        if (!res.ok) {
            const error = await res.json().catch(() => ({}));
            throw new Error(error.error || 'Failed to delete recurring rule');
        }
        if (res.status === 204) return null;
        return res.json();
    },

    // Push Notifications
    getVapidKey: async () => {
        const res = await api.fetch('/push/vapid-key');
        if (!res.ok) {
            const error = await res.json().catch(() => ({}));
            throw new Error(error.error || 'Failed to load push notification key');
        }
        return res.json();
    },
    subscribeToPush: async (subscription: PushSubscription) => {
        const res = await api.fetch('/push/subscribe', {
            method: 'POST',
            body: JSON.stringify({ subscription }),
        });
        if (!res.ok) throw new Error('Failed to subscribe to push notifications');
        return res.json();
    },
    unsubscribeFromPush: async (endpoint: string) => {
        const res = await api.fetch('/push/subscribe', {
            method: 'DELETE',
            body: JSON.stringify({ endpoint }),
        });
        if (!res.ok && res.status !== 204) throw new Error('Failed to unsubscribe from push notifications');
        return null;
    },
};
