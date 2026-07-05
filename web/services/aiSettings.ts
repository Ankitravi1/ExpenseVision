export type AiProvider = 'deepseek' | 'openai' | 'openrouter' | 'custom';

export interface AiSettings {
    enabled: boolean;
    provider: AiProvider;
    model: string;
    apiKey: string;
    baseUrl?: string;
}

const STORAGE_KEY = 'expensevision_ai_settings';

export const providerModels: Record<AiProvider, string[]> = {
    deepseek: ['deepseek-v4-flash', 'deepseek-v4-pro'],
    openai: ['gpt-5-mini', 'gpt-5'],
    openrouter: ['deepseek/deepseek-v4-flash', 'openai/gpt-5-mini'],
    custom: ['']
};

export const defaultAiSettings: AiSettings = {
    enabled: false,
    provider: 'deepseek',
    model: 'deepseek-v4-flash',
    apiKey: '',
    baseUrl: ''
};

export const getAiSettings = (): AiSettings => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return defaultAiSettings;
        return { ...defaultAiSettings, ...JSON.parse(raw) };
    } catch {
        return defaultAiSettings;
    }
};

export const saveAiSettings = (settings: AiSettings) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
};
