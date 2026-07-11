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

    // Pull the latest user from the server and update the cache. Used on restore so
    // profile edits made on web propagate. Silent on failure — apiFetch already
    // forces a logout if the session is truly dead; transient/network errors keep
    // the current cached user.
    const refreshUserFromServer = useCallback(async () => {
        try {
            const { user: fresh } = await api.getProfile();
            await storage.setUser(fresh);
            setUser(fresh);
        } catch {
            // ignore
        }
    }, []);

    // Restore session on app start
    useEffect(() => {
        // Register before any request fires so a dead session during restore logs out.
        setOnUnauthorized(() => {
            logout();
        });

        (async () => {
            try {
                const token = await storage.getToken();
                if (!token) return;

                const storedUser = await storage.getUser();
                if (storedUser) {
                    // Boot instantly from cache, then refresh from the server.
                    setUser(storedUser);
                    setIsAuthenticated(true);
                    refreshUserFromServer();
                } else {
                    // Token but no cached user → we must not render with user=null.
                    // Fetch the profile; a 401 here means the session is dead.
                    try {
                        const { user: fresh } = await api.getProfile();
                        await storage.setUser(fresh);
                        setUser(fresh);
                        setIsAuthenticated(true);
                    } catch {
                        await storage.clearTokens();
                        await storage.clearUser();
                        setUser(null);
                        setIsAuthenticated(false);
                    }
                }
            } finally {
                setIsLoading(false);
            }
        })();
    }, [logout, refreshUserFromServer]);

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
