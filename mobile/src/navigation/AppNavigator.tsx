import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import LoginScreen from '../screens/auth/LoginScreen';
import SignupScreen from '../screens/auth/SignupScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import CompleteProfileScreen from '../screens/auth/CompleteProfileScreen';
import DashboardScreen from '../screens/main/DashboardScreen';
import TransactionsScreen from '../screens/main/TransactionsScreen';
import AccountsScreen from '../screens/main/AccountsScreen';
import BudgetsScreen from '../screens/main/BudgetsScreen';
import ReportsScreen from '../screens/main/ReportsScreen';
import SettingsScreen from '../screens/main/SettingsScreen';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const TAB_ICONS: Record<string, keyof typeof MaterialCommunityIcons.glyphMap> = {
    Dashboard: 'view-dashboard-outline',
    Transactions: 'swap-horizontal',
    Budgets: 'target',
    Accounts: 'wallet-outline',
    Settings: 'cog-outline',
};

function MainTabs() {
    const { theme } = useTheme();
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarIcon: ({ color, size }) => (
                    <MaterialCommunityIcons name={TAB_ICONS[route.name] || 'circle'} size={size} color={color} />
                ),
                tabBarActiveTintColor: theme.colors.primary,
                tabBarInactiveTintColor: theme.colors.textTertiary,
                tabBarStyle: {
                    backgroundColor: theme.colors.tabBar,
                    borderTopColor: theme.colors.cardBorder,
                },
            })}
        >
            <Tab.Screen name="Dashboard" component={DashboardScreen} />
            <Tab.Screen name="Transactions" component={TransactionsScreen} />
            <Tab.Screen name="Budgets" component={BudgetsScreen} />
            <Tab.Screen name="Accounts" component={AccountsScreen} />
            <Tab.Screen name="Settings" component={SettingsScreen} />
        </Tab.Navigator>
    );
}

export default function AppNavigator() {
    const { isAuthenticated, isLoading, needsProfileCompletion } = useAuth();
    const { theme } = useTheme();

    const navTheme = theme.dark
        ? { ...DarkTheme, colors: { ...DarkTheme.colors, background: theme.colors.background, card: theme.colors.card, primary: theme.colors.primary } }
        : { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: theme.colors.background, card: theme.colors.card, primary: theme.colors.primary } };

    if (isLoading) {
        return (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background }}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    return (
        <NavigationContainer theme={navTheme}>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
                {!isAuthenticated ? (
                    <>
                        <Stack.Screen name="Login" component={LoginScreen} />
                        <Stack.Screen name="Signup" component={SignupScreen} />
                        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
                    </>
                ) : needsProfileCompletion ? (
                    <Stack.Screen name="CompleteProfile" component={CompleteProfileScreen} />
                ) : (
                    <>
                        <Stack.Screen name="Main" component={MainTabs} />
                        <Stack.Screen name="Reports" component={ReportsScreen} />
                    </>
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
}
