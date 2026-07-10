import { api } from './api';

export type AiProvider = 'deepseek' | 'openai' | 'openrouter' | 'gemini' | 'custom' | string;

export interface AiSettings {
    enabled: boolean;
    importEnabled: boolean;
    autoParseEnabled: boolean;
    provider: AiProvider;
    model: string;
    keys: Record<string, string[]>;          // per-provider list of encrypted API keys
    customModels: Record<string, string[]>;  // per-provider list of user-added model names
    baseUrl: Record<string, string>;
}

export const defaultAiSettings: AiSettings = {
    enabled: false,
    importEnabled: true,
    autoParseEnabled: true,
    provider: 'deepseek',
    model: '',
    keys: {},
    customModels: {},
    baseUrl: {}
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
