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

export const API_URL = `http://${getDevHost()}:5000/api`;
