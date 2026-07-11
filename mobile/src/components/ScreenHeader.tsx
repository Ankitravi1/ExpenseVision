import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, DeviceEventEmitter } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { formatCurrency } from '../utils/currency';
import { apiFetch } from '../services/api';
import { spacing } from '../theme';

interface ScreenHeaderProps {
    title: string;
}

export const ScreenHeader: React.FC<ScreenHeaderProps> = ({ title }) => {
    const navigation = useNavigation();
    const { theme } = useTheme();
    const { accounts } = useData();
    const { user } = useAuth();
    const [unreadCount, setUnreadCount] = useState(0);

    const currency = user?.currency || 'INR';
    // Frozen accounts are paused everywhere — excluded here too, matching Dashboard.
    const netWorth = accounts.filter(a => !a.frozen).reduce((sum, a) => sum + a.balance, 0);

    const fetchUnreadCount = () => {
        apiFetch('/notifications')
            .then(r => r.ok ? r.json() : [])
            .then((list: any[]) => setUnreadCount(list.filter((n: any) => !n.read).length))
            .catch(() => {});
    };

    useFocusEffect(
        React.useCallback(() => {
            fetchUnreadCount();
        }, [])
    );

    useEffect(() => {
        const sub = DeviceEventEmitter.addListener('transaction-created', fetchUnreadCount);
        return () => sub.remove();
    }, []);

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.cardBorder }]}>
            <View style={styles.left}>
                <TouchableOpacity
                    onPress={() => (navigation as any).openDrawer?.()}
                    style={styles.iconButton}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                    <MaterialCommunityIcons name="menu" size={24} color={theme.colors.text} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: theme.colors.text }]} numberOfLines={1}>{title}</Text>
            </View>

            <View style={styles.right}>
                {/* Notifications Bell */}
                <TouchableOpacity
                    onPress={() => navigation.navigate('Notifications' as never)}
                    style={styles.bellButton}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                    <MaterialCommunityIcons name="bell-outline" size={22} color={theme.colors.textSecondary} />
                    {unreadCount > 0 && (
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>{unreadCount}</Text>
                        </View>
                    )}
                </TouchableOpacity>

                <View style={styles.netWorthContainer}>
                    <Text style={[styles.netWorthLabel, { color: theme.colors.textTertiary }]}>NET WORTH</Text>
                    <Text style={[styles.netWorthValue, { color: theme.colors.primary }]} numberOfLines={1}>
                        {formatCurrency(netWorth, currency)}
                    </Text>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
        height: 60,
    },
    left: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        flex: 1,
    },
    title: {
        fontSize: 18,
        fontWeight: '800',
    },
    right: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },
    netWorthContainer: {
        alignItems: 'flex-end',
        justifyContent: 'center',
        marginRight: spacing.xs,
    },
    netWorthLabel: {
        fontSize: 9,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    netWorthValue: {
        fontSize: 14,
        fontWeight: '900',
        marginTop: 1,
    },
    iconButton: {
        padding: 4,
    },
    bellButton: {
        padding: 4,
        position: 'relative',
    },
    badge: {
        position: 'absolute',
        top: -2,
        right: -2,
        backgroundColor: 'red',
        minWidth: 16,
        height: 16,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 2,
    },
    badgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '800',
    },
});
