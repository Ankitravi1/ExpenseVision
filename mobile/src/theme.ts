// Shared color tokens — mirrors the web app's palette (web/tailwind.config.js)
export interface Theme {
    dark: boolean;
    colors: {
        background: string;
        card: string;
        cardBorder: string;
        text: string;
        textSecondary: string;
        textTertiary: string;
        primary: string;
        primaryLight: string;
        success: string;
        successBg: string;
        danger: string;
        dangerBg: string;
        warning: string;
        inputBg: string;
        inputBorder: string;
        tabBar: string;
        separator: string;
    };
}

export const lightTheme: Theme = {
    dark: false,
    colors: {
        background: '#f8fafc',
        card: '#ffffff',
        cardBorder: '#e2e8f0',
        text: '#1e293b',
        textSecondary: '#64748b',
        textTertiary: '#94a3b8',
        primary: '#4f46e5',
        primaryLight: '#e0e7ff',
        success: '#10b981',
        successBg: '#ecfdf5',
        danger: '#f43f5e',
        dangerBg: '#fff1f2',
        warning: '#f59e0b',
        inputBg: '#ffffff',
        inputBorder: '#cbd5e1',
        tabBar: '#ffffff',
        separator: '#f1f5f9',
    },
};

export const darkTheme: Theme = {
    dark: true,
    colors: {
        background: '#0f172a',
        card: '#1e293b',
        cardBorder: '#334155',
        text: '#f1f5f9',
        textSecondary: '#cbd5e1',
        textTertiary: '#94a3b8',
        primary: '#818cf8',
        primaryLight: '#312e81',
        success: '#34d399',
        successBg: '#064e3b',
        danger: '#fb7185',
        dangerBg: '#881337',
        warning: '#fbbf24',
        inputBg: '#1e293b',
        inputBorder: '#475569',
        tabBar: '#1e293b',
        separator: '#334155',
    },
};

export const spacing = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
};

export const radius = {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
};
