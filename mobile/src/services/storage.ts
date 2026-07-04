import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Tokens go in SecureStore (encrypted); non-sensitive user profile cache
// goes in AsyncStorage (SecureStore has small value-size limits).
export const storage = {
    getToken: () => SecureStore.getItemAsync('token'),
    getRefreshToken: () => SecureStore.getItemAsync('refreshToken'),
    setTokens: async (token: string, refreshToken: string) => {
        await SecureStore.setItemAsync('token', token);
        await SecureStore.setItemAsync('refreshToken', refreshToken);
    },
    clearTokens: async () => {
        await SecureStore.deleteItemAsync('token');
        await SecureStore.deleteItemAsync('refreshToken');
    },

    getUser: async () => {
        const raw = await AsyncStorage.getItem('user');
        return raw ? JSON.parse(raw) : null;
    },
    setUser: (user: unknown) => AsyncStorage.setItem('user', JSON.stringify(user)),
    clearUser: () => AsyncStorage.removeItem('user'),

    getTheme: () => AsyncStorage.getItem('theme'),
    setTheme: (theme: string) => AsyncStorage.setItem('theme', theme),
};
