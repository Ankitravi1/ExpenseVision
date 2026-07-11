import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Resolve the backend URL for development:
// - Android emulator reaches the host machine via 10.0.2.2
// - A physical device uses the LAN IP of the machine running Metro,
//   which Expo exposes via the debugger host.
const getDevHost = (): string => {
    const hostUri = Constants.expoConfig?.hostUri;
    if (hostUri) {
        const host = hostUri.split(':')[0];
        // Android emulator: Metro host shows as localhost
        if (Platform.OS === 'android' && (host === 'localhost' || host === '127.0.0.1')) {
            return '10.0.2.2';
        }
        return host;
    }
    return Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
};

// Production/release builds cannot reach a Metro dev host, so they MUST set
// EXPO_PUBLIC_API_URL (e.g. https://api.expensevision.app/api) — used verbatim
// when present. Otherwise fall back to the dev host detection above.
const envApiUrl = process.env.EXPO_PUBLIC_API_URL;
export const API_URL = envApiUrl && envApiUrl.length > 0 ? envApiUrl : `http://${getDevHost()}:5000/api`;

// Same OAuth client ID as backend GOOGLE_CLIENT_ID / web VITE_GOOGLE_CLIENT_ID
export const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? '';
