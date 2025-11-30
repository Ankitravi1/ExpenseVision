const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

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

export interface SignupData {
    email: string;
    password: string;
    name: string;
}

export const authService = {
    signup: async (data: SignupData): Promise<{ user: User; token: string; needsProfileCompletion: boolean }> => {
        const res = await fetch(`${API_URL}/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });

        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Signup failed');
        }

        const json = await res.json();
        localStorage.setItem('token', json.token);
        localStorage.setItem('refreshToken', json.refreshToken);
        localStorage.setItem('user', JSON.stringify(json.user));
        return json;
    },

    login: async (email: string, password: string): Promise<{ user: User; token: string; needsProfileCompletion: boolean }> => {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });

        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Login failed');
        }

        const json = await res.json();
        localStorage.setItem('token', json.token);
        localStorage.setItem('refreshToken', json.refreshToken);
        localStorage.setItem('user', JSON.stringify(json.user));
        return json;
    },

    googleAuth: async (googleToken: string): Promise<{ user: User; token: string; isNewUser: boolean; needsProfileCompletion: boolean }> => {
        const res = await fetch(`${API_URL}/auth/google`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ googleToken }),
        });

        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Google auth failed');
        }

        const json = await res.json();
        localStorage.setItem('token', json.token);
        localStorage.setItem('refreshToken', json.refreshToken);
        localStorage.setItem('user', JSON.stringify(json.user));
        return json;
    },

    completeProfile: async (data: { country?: string; timezone?: string; currency: string }): Promise<{ user: User }> => {
        const token = authService.getToken();
        if (!token) throw new Error('No token found');

        const res = await fetch(`${API_URL}/auth/complete-profile`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
                country: data.country,
                timezone: data.timezone,
                currency: data.currency,
            }),
        });

        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to complete profile');
        }

        const json = await res.json();
        localStorage.setItem('user', JSON.stringify(json.user));
        return json;
    },

    updateProfile: async (data: { name?: string; country?: string; timezone?: string; currency?: string; theme?: string }): Promise<{ user: User }> => {
        const token = authService.getToken();
        if (!token) throw new Error('No token found');

        const res = await fetch(`${API_URL}/auth/update-profile`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(data),
        });

        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Update failed');
        }

        const json = await res.json();
        localStorage.setItem('user', JSON.stringify(json.user));
        return json;
    },

    logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
    },

    isAuthenticated: (): boolean => {
        return !!localStorage.getItem('token');
    },
    getToken: (): string | null => {
        return localStorage.getItem('token');
    },

    getRefreshToken: (): string | null => {
        return localStorage.getItem('refreshToken');
    },

    setTokens: (token: string, refreshToken: string) => {
        localStorage.setItem('token', token);
        localStorage.setItem('refreshToken', refreshToken);
    },

    getUser: (): User | null => {
        const user = localStorage.getItem('user');
        return user ? JSON.parse(user) : null;
    },

    async setup2FA() {
        const token = authService.getToken();
        const res = await fetch(`${API_URL}/auth/2fa/setup`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to setup 2FA');
        return data as { secret: string; qrCode: string };
    },

    async verify2FA(code: string) {
        const token = authService.getToken();
        const res = await fetch(`${API_URL}/auth/2fa/verify`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ code }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to verify 2FA');
        return data;
    },

    async login2FA(userId: string, code: string) {
        const res = await fetch(`${API_URL}/auth/2fa/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, code }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || '2FA login failed');

        authService.setTokens(data.token, data.refreshToken);
        localStorage.setItem('user', JSON.stringify(data.user));
        return data.user;
    },
};
