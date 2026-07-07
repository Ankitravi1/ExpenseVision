Phase 4: Mobile Features - Done!
- Implemented pie chart in ReportsScreen using react-native-chart-kit.
- Integrated expo-notifications in App.tsx.
- Added Mark Read / Clear individual notifications to NotificationsScreen.
- Updated SettingsScreen to handle multiple API keys per provider.

Phase 2 & 3: Backend Implementation - Done!
- Updated `backend/src/routes/push.ts` to handle both Web Push and Expo Push (`Expo.sendPushNotificationsAsync`).
- Created `POST /api/profile/expo-token` inside `backend/src/routes/profile.ts` to save expo token to the User.
- Refactored `backend/src/routes/aiSettings.ts` to expect arrays of strings in keys, and map through them in encryption/decryption loops.
