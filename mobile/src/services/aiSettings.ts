import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

export type AiProvider = 'deepseek' | 'openai' | 'openrouter' | 'custom';

export interface AiSettings {
    enabled: boolean;
    provider: AiProvider;
    model: string;
    apiKey: string;
    baseUrl?: string;
}

const SETTINGS_KEY = 'expensevision_ai_settings';
const API_KEY_KEY = 'expensevision_ai_api_key';

export const providerModels: Record<AiProvider, string[]> = {
    deepseek: ['deepseek-v4-flash', 'deepseek-v4-pro'],
    openai: ['gpt-5-mini', 'gpt-5'],
    openrouter: ['deepseek/deepseek-v4-flash', 'openai/gpt-5-mini'],
    custom: [''],
};

export const defaultAiSettings: AiSettings = {
    enabled: false,
    provider: 'deepseek',
    model: 'deepseek-v4-flash',
    apiKey: '',
    baseUrl: '',
};

export const getAiSettings = async (): Promise<AiSettings> => {
    const [rawSettings, apiKey] = await Promise.all([
        AsyncStorage.getItem(SETTINGS_KEY),
        SecureStore.getItemAsync(API_KEY_KEY),
    ]);

    const saved = rawSettings ? JSON.parse(rawSettings) : {};
    return {
        ...defaultAiSettings,
        ...saved,
        apiKey: apiKey || '',
    };
};

export const saveAiSettings = async (settings: AiSettings) => {
    const { apiKey, ...settingsWithoutKey } = settings;
    await Promise.all([
        AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settingsWithoutKey)),
        apiKey ? SecureStore.setItemAsync(API_KEY_KEY, apiKey) : SecureStore.deleteItemAsync(API_KEY_KEY),
    ]);
};
