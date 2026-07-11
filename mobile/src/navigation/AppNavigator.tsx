import React, { useState } from 'react';
import { ActivityIndicator, View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
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
import ImportExportScreen from '../screens/main/ImportExportScreen';
import ProfileScreen from '../screens/main/ProfileScreen';
import NotificationsScreen from '../screens/main/NotificationsScreen';
import AdminScreen from '../screens/main/AdminScreen';
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
    const [userMenuOpen, setUserMenuOpen] = useState(false);

    const DrawerItem: React.FC<{
        icon: keyof typeof MaterialCommunityIcons.glyphMap;
        label: string;
        onPress: () => void;
        badge?: string;
        danger?: boolean;
        rightElement?: React.ReactNode;
    }> = ({ icon, label, onPress, badge, danger, rightElement }) => (
        <TouchableOpacity
            onPress={onPress}
            style={[styles.drawerItem, { backgroundColor: danger ? theme.colors.dangerBg : 'transparent' }]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
            <MaterialCommunityIcons name={icon} size={24} color={danger ? theme.colors.danger : theme.colors.textSecondary} />
            <Text style={[styles.drawerLabel, { color: danger ? theme.colors.danger : theme.colors.text }]}>{label}</Text>
            {rightElement || (badge ? (
                <View style={[styles.badge, { backgroundColor: danger ? theme.colors.danger : theme.colors.primary }]}>
                    <Text style={styles.badgeText}>{badge}</Text>
                </View>
            ) : null)}
        </TouchableOpacity>
    );

    const goToTab = (screen: string, params?: Record<string, unknown>) => {
        navigation.navigate('Main', { screen, params });
        navigation.closeDrawer();
        setUserMenuOpen(false);
    };

    const goToDrawerScreen = (screen: string) => {
        navigation.navigate(screen);
        navigation.closeDrawer();
        setUserMenuOpen(false);
    };

    const handleLogout = () => {
        navigation.closeDrawer();
        setUserMenuOpen(false);
        logout();
    };

    const initials = (user?.name || 'U').trim().charAt(0).toUpperCase();

    return (
        <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
            {/* Main nav items */}
            <View style={[styles.section, { marginTop: spacing.xl + spacing.lg }]}>
                <DrawerItem icon="view-dashboard-outline" label="Dashboard" onPress={() => goToTab('Dashboard')} />
                <DrawerItem icon="swap-horizontal" label="Transactions" badge={`${transactions.length}`} onPress={() => goToTab('Transactions')} />
                <DrawerItem icon="target" label="Budgets" onPress={() => goToTab('Budgets')} />
                <DrawerItem icon="wallet-outline" label="Accounts" onPress={() => goToTab('Accounts')} />
            </View>

            <View style={styles.section}>
                <View style={[styles.sectionDivider, { backgroundColor: theme.colors.separator }]} />
                <DrawerItem icon="chart-pie" label="Reports" onPress={() => goToDrawerScreen('Reports')} />
                <DrawerItem icon="tag-multiple" label="Categories" badge={`${categories.length}`} onPress={() => goToDrawerScreen('Categories')} />
                <DrawerItem icon="repeat" label="Recurring" badge={`${recurring.length}`} onPress={() => goToDrawerScreen('Recurring')} />
                <DrawerItem icon="swap-horizontal-bold" label="Import / Export" onPress={() => goToDrawerScreen('ImportExport')} />
                {user?.role === 'superadmin' && (
                    <DrawerItem icon="shield-outline" label="Admin" onPress={() => goToDrawerScreen('Admin')} />
                )}
            </View>

            {/* Spacer */}
            <View style={{ flex: 1 }} />

            {/* Add Transaction — prominent button just above user pill */}
            <TouchableOpacity
                onPress={() => goToTab('Transactions', { openForm: true })}
                style={[styles.addTxnButton, { backgroundColor: theme.colors.primary }]}
                activeOpacity={0.85}
            >
                <MaterialCommunityIcons name="plus" size={22} color="#fff" />
                <Text style={styles.addTxnLabel}>Add Transaction</Text>
            </TouchableOpacity>

            {/* User menu (expands upward from the pill) */}
            {userMenuOpen && (
                <View style={[styles.userMenu, { backgroundColor: theme.colors.card, borderColor: theme.colors.separator }]}>
                    <TouchableOpacity
                        style={styles.userMenuItem}
                        onPress={() => goToDrawerScreen('Profile')}
                    >
                        <MaterialCommunityIcons name="account-outline" size={20} color={theme.colors.text} />
                        <Text style={[styles.userMenuLabel, { color: theme.colors.text }]}>Profile</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.userMenuItem}
                        onPress={() => goToDrawerScreen('Settings')}
                    >
                        <MaterialCommunityIcons name="cog-outline" size={20} color={theme.colors.text} />
                        <Text style={[styles.userMenuLabel, { color: theme.colors.text }]}>Settings</Text>
                    </TouchableOpacity>

                    <View style={[styles.menuDivider, { backgroundColor: theme.colors.separator }]} />

                    {/* Dark mode toggle inside user menu */}
                    <TouchableOpacity
                        style={styles.userMenuItem}
                        onPress={toggleTheme}
                    >
                        <MaterialCommunityIcons
                            name="palette-outline"
                            size={20}
                            color={theme.colors.text}
                        />
                        <Text style={[styles.userMenuLabel, { color: theme.colors.text }]}>Theme</Text>
                        <Text style={{ color: theme.colors.textTertiary, fontSize: 13, marginLeft: 'auto' }}>
                            {mode === 'dark' ? 'Dark' : 'Light'}
                        </Text>
                    </TouchableOpacity>

                    <View style={[styles.menuDivider, { backgroundColor: theme.colors.separator }]} />

                    <TouchableOpacity
                        style={styles.userMenuItem}
                        onPress={handleLogout}
                    >
                        <MaterialCommunityIcons name="logout" size={20} color={theme.colors.danger} />
                        <Text style={[styles.userMenuLabel, { color: theme.colors.danger }]}>Log out</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* User pill — always visible at bottom */}
            <TouchableOpacity
                onPress={() => setUserMenuOpen(v => !v)}
                style={[styles.userPill, { backgroundColor: theme.colors.card, borderColor: theme.colors.separator, marginBottom: spacing.xs }]}
                activeOpacity={0.8}
            >
                <View style={[styles.pillAvatar, { backgroundColor: theme.colors.primary }]}>
                    <Text style={styles.pillAvatarText}>{initials}</Text>
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={[styles.pillName, { color: theme.colors.text }]} numberOfLines={1}>{user?.name}</Text>
                    <Text style={[styles.pillEmail, { color: theme.colors.textTertiary }]} numberOfLines={1}>{user?.email}</Text>
                </View>
                <MaterialCommunityIcons
                    name={userMenuOpen ? 'chevron-down' : 'chevron-up'}
                    size={20}
                    color={theme.colors.textTertiary}
                />
            </TouchableOpacity>

            {/* Sync note */}
            <Text style={{ color: theme.colors.textTertiary, textAlign: 'center', fontSize: 11, marginBottom: spacing.md, paddingHorizontal: spacing.md }}>
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
            <Drawer.Screen name="ImportExport" component={ImportExportScreen} />
            <Drawer.Screen name="Settings" component={SettingsScreen} />
            <Drawer.Screen name="Profile" component={ProfileScreen} />
            <Drawer.Screen name="Notifications" component={NotificationsScreen} />
            <Drawer.Screen name="Admin" component={AdminScreen} />
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
    section: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
    },
    sectionDivider: {
        height: StyleSheet.hairlineWidth,
        marginVertical: spacing.sm,
    },
    menuDivider: {
        height: StyleSheet.hairlineWidth,
        marginHorizontal: spacing.md,
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
    // Add Transaction button just above user pill
    addTxnButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: spacing.md,
        marginBottom: spacing.sm,
        paddingVertical: 13,
        borderRadius: radius.lg,
        gap: spacing.sm,
    },
    addTxnLabel: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '700',
    },
    // User pill at the bottom
    userPill: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: spacing.md,
        marginBottom: spacing.lg,
        padding: spacing.sm,
        borderRadius: radius.lg,
        borderWidth: 1,
        gap: spacing.sm,
    },
    pillAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    pillAvatarText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '800',
    },
    pillName: {
        fontSize: 14,
        fontWeight: '600',
    },
    pillEmail: {
        fontSize: 12,
        marginTop: 1,
    },
    // User menu popup above the pill
    userMenu: {
        marginHorizontal: spacing.md,
        marginBottom: spacing.sm,
        borderRadius: radius.lg,
        borderWidth: 1,
        overflow: 'hidden',
    },
    userMenuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: 14,
        gap: spacing.md,
    },
    userMenuLabel: {
        fontSize: 15,
        fontWeight: '500',
    },
});
