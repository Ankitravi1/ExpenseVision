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
        background: '#fafafa', // zinc-50
        card: '#ffffff',
        cardBorder: '#e4e4e7', // zinc-200
        text: '#18181b',       // zinc-900
        textSecondary: '#71717a', // zinc-500
        textTertiary: '#a1a1aa',  // zinc-400
        primary: '#4f46e5',
        primaryLight: '#e0e7ff',
        success: '#10b981',
        successBg: '#ecfdf5',
        danger: '#f43f5e',
        dangerBg: '#fff1f2',
        warning: '#f59e0b',
        inputBg: '#ffffff',
        inputBorder: '#d4d4d8', // zinc-300
        tabBar: '#ffffff',
        separator: '#f4f4f5',   // zinc-100
    },
};

export const darkTheme: Theme = {
    dark: true,
    colors: {
        background: '#000000', // Pure black
        card: '#09090b',       // zinc-950
        cardBorder: '#27272a', // zinc-800
        text: '#fafafa',       // zinc-50
        textSecondary: '#a1a1aa', // zinc-400
        textTertiary: '#71717a',  // zinc-500
        primary: '#818cf8',
        primaryLight: '#312e81',
        success: '#34d399',
        successBg: '#064e3b',
        danger: '#fb7185',
        dangerBg: '#881337',
        warning: '#fbbf24',
        inputBg: '#18181b',    // zinc-900
        inputBorder: '#3f3f46', // zinc-700
        tabBar: '#09090b',     // zinc-950
        separator: '#27272a',  // zinc-800
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
