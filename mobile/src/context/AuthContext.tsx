import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api, setOnUnauthorized } from '../services/api';
import { storage } from '../services/storage';
import { User } from '../types';

interface AuthContextValue {
    user: User | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    needsProfileCompletion: boolean;
    login: (email: string, password: string) => Promise<{ require2FA?: boolean; userId?: string }>;
    login2FA: (userId: string, code: string) => Promise<void>;
    signup: (name: string, email: string, password: string) => Promise<void>;
    googleAuth: (googleToken: string) => Promise<void>;
    completeProfile: (currency: string, timezone?: string) => Promise<void>;
    updateProfile: (data: { name?: string; currency?: string; timezone?: string; theme?: string }) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const logout = useCallback(async () => {
        await storage.clearTokens();
        await storage.clearUser();
        setUser(null);
        setIsAuthenticated(false);
    }, []);

    // Restore session on app start
    useEffect(() => {
        (async () => {
            try {
                const token = await storage.getToken();
                if (token) {
                    const storedUser = await storage.getUser();
                    if (storedUser) setUser(storedUser);
                    setIsAuthenticated(true);
                }
            } finally {
                setIsLoading(false);
            }
        })();

        setOnUnauthorized(() => {
            logout();
        });
    }, [logout]);

    const applySession = async (session: { user: User; token: string; refreshToken: string }) => {
        await storage.setTokens(session.token, session.refreshToken);
        await storage.setUser(session.user);
        setUser(session.user);
        setIsAuthenticated(true);
    };

    const login = useCallback(async (email: string, password: string) => {
        const res = await api.login(email, password);
        if (res.require2FA && res.userId) {
            return { require2FA: true, userId: res.userId };
        }
        await applySession(res as { user: User; token: string; refreshToken: string });
        return {};
    }, []);

    const login2FA = useCallback(async (userId: string, code: string) => {
        const res = await api.login2FA(userId, code);
        await applySession(res);
    }, []);

    const signup = useCallback(async (name: string, email: string, password: string) => {
        const res = await api.signup({ name, email, password });
        await applySession(res);
    }, []);

    const googleAuth = useCallback(async (googleToken: string) => {
        const res = await api.googleAuth(googleToken);
        await applySession(res);
    }, []);

    const completeProfile = useCallback(async (currency: string, timezone?: string) => {
        const tz = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
        const res = await api.completeProfile({ currency, timezone: tz });
        await storage.setUser(res.user);
        setUser(res.user);
    }, []);

    const updateProfile = useCallback(async (data: { name?: string; currency?: string; timezone?: string; theme?: string }) => {
        const res = await api.updateProfile(data);
        await storage.setUser(res.user);
        setUser(res.user);
    }, []);

    return (
        <AuthContext.Provider
            value={{
                user,
                isLoading,
                isAuthenticated,
                needsProfileCompletion: isAuthenticated && !!user && user.profileComplete !== true,
                login,
                login2FA,
                signup,
                googleAuth,
                completeProfile,
                updateProfile,
                logout,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = (): AuthContextValue => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
};
