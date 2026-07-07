import React from 'react';
import { ActivityIndicator, View, Text, TouchableOpacity, StyleSheet, Switch } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createDrawerNavigator } from '@react-navigation/drawer';
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
import CategoriesScreen from '../screens/main/CategoriesScreen';
import RecurringScreen from '../screens/main/RecurringScreen';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import { CustomTabBar } from '../components/CustomTabBar';
import { spacing, radius } from '../theme';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const Drawer = createDrawerNavigator();

const TAB_ICONS: Record<string, keyof typeof MaterialCommunityIcons.glyphMap> = {
    Dashboard: 'view-dashboard-outline',
    Transactions: 'swap-horizontal',
    Budgets: 'target',
    Accounts: 'wallet-outline',
};

function MainTabs() {
    const { theme } = useTheme();
    return (
        <Tab.Navigator
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: theme.colors.primary,
                tabBarInactiveTintColor: theme.colors.textTertiary,
            }}
            tabBar={(props) => <CustomTabBar {...props} />}
        >
            <Tab.Screen name="Dashboard" component={DashboardScreen} />
            <Tab.Screen name="Transactions" component={TransactionsScreen} />
            <Tab.Screen name="Budgets" component={BudgetsScreen} />
            <Tab.Screen name="Accounts" component={AccountsScreen} />
        </Tab.Navigator>
    );
}

function DrawerContentComponent({ navigation }: any) {
    const { theme, mode, toggleTheme } = useTheme();
    const { user, logout } = useAuth();
    const { categories, recurring, transactions } = useData();

    const DrawerItem: React.FC<{
        icon: keyof typeof MaterialCommunityIcons.glyphMap;
        label: string;
        onPress: () => void;
        badge?: string;
        danger?: boolean;
    }> = ({ icon, label, onPress, badge, danger }) => (
        <TouchableOpacity
            onPress={onPress}
            style={[styles.drawerItem, { backgroundColor: danger ? theme.colors.dangerBg : 'transparent' }]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
            <MaterialCommunityIcons name={icon} size={24} color={danger ? theme.colors.danger : theme.colors.textSecondary} />
            <Text style={[styles.drawerLabel, { color: danger ? theme.colors.danger : theme.colors.text }]}>{label}</Text>
            {badge ? (
                <View style={[styles.badge, { backgroundColor: danger ? theme.colors.danger : theme.colors.primary }]}>
                    <Text style={styles.badgeText}>{badge}</Text>
                </View>
            ) : null}
        </TouchableOpacity>
    );

    const goToTab = (screen: string, params?: Record<string, unknown>) => {
        navigation.navigate('Main', { screen, params });
        navigation.closeDrawer();
    };

    const goToDrawerScreen = (screen: string) => {
        navigation.navigate(screen);
        navigation.closeDrawer();
    };

    return (
        <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
            <View style={styles.drawerHeader}>
                <View style={[styles.avatar, { backgroundColor: theme.colors.primary }]}>
                    <Text style={styles.avatarText}>{(user?.name || 'U').trim().charAt(0).toUpperCase()}</Text>
                </View>
                <View style={styles.headerInfo}>
                    <Text style={[styles.headerName, { color: theme.colors.text }]}>{user?.name}</Text>
                    <Text style={[styles.headerEmail, { color: theme.colors.textTertiary }]}>{user?.email}</Text>
                </View>
            </View>

            <View style={styles.section}>
                <DrawerItem icon="plus-circle" label="Add transaction" onPress={() => goToTab('Transactions', { openForm: true })} />
                <DrawerItem icon="view-dashboard-outline" label="Dashboard" onPress={() => goToTab('Dashboard')} />
                <DrawerItem icon="swap-horizontal" label="Transactions" badge={`${transactions.length}`} onPress={() => goToTab('Transactions')} />
                <DrawerItem icon="target" label="Budgets" onPress={() => goToTab('Budgets')} />
                <DrawerItem icon="wallet-outline" label="Accounts" onPress={() => goToTab('Accounts')} />
            </View>

            <View style={styles.section}>
                <View style={styles.sectionDivider} />
                <DrawerItem icon="chart-pie" label="Reports" onPress={() => goToDrawerScreen('Reports')} />
                <DrawerItem icon="tag-multiple" label="Categories" badge={`${categories.length}`} onPress={() => goToDrawerScreen('Categories')} />
                <DrawerItem icon="repeat" label="Recurring" badge={`${recurring.length}`} onPress={() => goToDrawerScreen('Recurring')} />
                <DrawerItem icon="cog-outline" label="Settings" onPress={() => goToDrawerScreen('Settings')} />
            </View>

            <View style={styles.section}>
                <View style={styles.sectionDivider} />
                <View style={styles.drawerToggleRow}>
                    <MaterialCommunityIcons name="theme-light-dark" size={24} color={theme.colors.textSecondary} />
                    <Text style={[styles.drawerLabel, { color: theme.colors.text, flex: 1 }]}>Dark mode</Text>
                    <Switch value={mode === 'dark'} onValueChange={toggleTheme} trackColor={{ true: theme.colors.primary }} />
                </View>
            </View>

            <View style={styles.section}>
                <DrawerItem icon="logout" label="Log out" danger onPress={logout} />
            </View>

            <Text style={{ color: theme.colors.textTertiary, textAlign: 'center', marginTop: spacing.lg, fontSize: 12, paddingBottom: spacing.xl }}>
                ExpenseVision · synced with your web account
            </Text>
        </View>
    );
}

function MainDrawer() {
    const { theme } = useTheme();
    return (
        <Drawer.Navigator
            screenOptions={{
                headerShown: false,
                drawerStyle: { backgroundColor: theme.colors.background, width: 280 },
                drawerType: 'slide',
                drawerPosition: 'left',
            }}
            drawerContent={(props) => <DrawerContentComponent {...props} />}
        >
            <Drawer.Screen name="Main" component={MainTabs} />
            <Drawer.Screen name="Reports" component={ReportsScreen} />
            <Drawer.Screen name="Categories" component={CategoriesScreen} />
            <Drawer.Screen name="Recurring" component={RecurringScreen} />
            <Drawer.Screen name="Settings" component={SettingsScreen} />
        </Drawer.Navigator>
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
                    <Stack.Screen name="MainDrawer" component={MainDrawer} />
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
}

const styles = StyleSheet.create({
    drawerHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.lg,
        paddingTop: spacing.xl,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#334155',
        gap: spacing.md,
    },
    avatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        color: '#fff',
        fontSize: 22,
        fontWeight: '800',
    },
    headerInfo: {
        flex: 1,
    },
    headerName: {
        fontSize: 16,
        fontWeight: '700',
    },
    headerEmail: {
        fontSize: 13,
        marginTop: 2,
    },
    section: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
    },
    sectionDivider: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: '#334155',
        marginVertical: spacing.sm,
    },
    drawerItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: spacing.sm,
        borderRadius: radius.md,
        gap: spacing.md,
    },
    drawerLabel: {
        fontSize: 15,
        fontWeight: '500',
        flex: 1,
    },
    badge: {
        minWidth: 20,
        height: 20,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 6,
    },
    badgeText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '700',
    },
    drawerToggleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: spacing.sm,
        gap: spacing.md,
    },
});
