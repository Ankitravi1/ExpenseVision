import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { DataProvider } from './src/context/DataContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import * as Notifications from 'expo-notifications';
import { apiFetch } from './src/services/api';
import Constants from 'expo-constants';
import * as Device from 'expo-device';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function Root() {
  const { mode } = useTheme();
  const { user } = useAuth();

  useEffect(() => {
    async function setupNotifications() {
      if (!user) return;
      try {
        const settings = await Notifications.getPermissionsAsync() as any;
        let granted = settings.status === 'granted' || settings.granted;
        if (!granted && settings.canAskAgain) {
          const newSettings = await Notifications.requestPermissionsAsync() as any;
          granted = newSettings.status === 'granted' || newSettings.granted;
        }
        if (!granted) return;
        if (Constants.appOwnership === 'expo' || !Device.isDevice) {
          console.log('Push notifications only work on real devices with development builds.');
          return;
        }
        
        const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId ?? 'dev';
        const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
        
        await apiFetch('/profile/expo-token', {
          method: 'POST',
          body: JSON.stringify({ token: tokenData.data }),
        });
      } catch (error) {
        console.warn('Failed to get push token:', error);
      }
    }
    setupNotifications();
  }, [user]);

  return (
    <>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <AppNavigator />
    </>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <ThemeProvider>
            <DataProvider>
              <Root />
            </DataProvider>
          </ThemeProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
