import { api } from './api';

export type AiProvider = 'deepseek' | 'openai' | 'openrouter' | 'gemini' | 'custom';

export interface AiSettings {
    enabled: boolean;
    provider: AiProvider;
    model: string;
    keys: Record<string, string[]>;
    customModels: string[];
    baseUrl?: string;
}

export const providerModels: Record<AiProvider, string[]> = {
    deepseek: ['deepseek-v4-flash', 'deepseek-v4-pro'],
    openai: ['gpt-5-mini', 'gpt-5'],
    gemini: ['gemini-2.5-flash', 'gemini-2.5-pro'],
    openrouter: ['deepseek/deepseek-v4-flash', 'openai/gpt-5-mini'],
    custom: ['']
};

export const defaultAiSettings: AiSettings = {
    enabled: false,
    provider: 'deepseek',
    model: 'deepseek-v4-flash',
    keys: {},
    customModels: [],
    baseUrl: ''
};

export const getAiSettings = async (): Promise<AiSettings> => {
    const res = await api.fetch('/ai-settings');
    if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to load AI settings');
    }
    return { ...defaultAiSettings, ...(await res.json()) };
};

export const saveAiSettings = async (settings: AiSettings): Promise<AiSettings> => {
    const res = await api.fetch('/ai-settings', {
        method: 'PUT',
        body: JSON.stringify(settings),
    });
    if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to save AI settings');
    }
    return { ...defaultAiSettings, ...(await res.json()) };
};
