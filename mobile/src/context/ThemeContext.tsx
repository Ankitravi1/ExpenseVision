import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { lightTheme, darkTheme, Theme } from '../theme';
import { storage } from '../services/storage';
import { useAuth } from './AuthContext';

interface ThemeContextValue {
    theme: Theme;
    mode: 'light' | 'dark';
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, isAuthenticated, updateProfile } = useAuth();
    const [mode, setMode] = useState<'light' | 'dark'>('light');

    useEffect(() => {
        storage.getTheme().then(saved => {
            if (saved === 'dark' || saved === 'light') setMode(saved);
        });
    }, []);

    // Follow the theme saved on the user's profile (synced with web)
    useEffect(() => {
        if (user?.theme === 'dark' || user?.theme === 'light') {
            setMode(user.theme);
            storage.setTheme(user.theme);
        }
    }, [user?.theme]);

    const toggleTheme = useCallback(() => {
        setMode(prev => {
            const next = prev === 'light' ? 'dark' : 'light';
            storage.setTheme(next);
            if (isAuthenticated) {
                updateProfile({ theme: next }).catch(() => {});
            }
            return next;
        });
    }, [isAuthenticated, updateProfile]);

    return (
        <ThemeContext.Provider value={{ theme: mode === 'dark' ? darkTheme : lightTheme, mode, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = (): ThemeContextValue => {
    const ctx = useContext(ThemeContext);
    if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
    return ctx;
};
