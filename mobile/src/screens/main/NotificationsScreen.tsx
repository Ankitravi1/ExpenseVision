import React, { useState, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { spacing, radius } from '../../theme';
import { apiFetch } from '../../services/api';

export default function NotificationsScreen({ navigation }: any) {
    const { theme } = useTheme();
    const [notifications, setNotifications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchNotifications = async () => {
        try {
            const res = await apiFetch('/notifications');
            if (res.ok) {
                setNotifications(await res.json());
            }
        } catch (error) {
            console.error('Failed to fetch notifications', error);
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        React.useCallback(() => {
            fetchNotifications();
        }, [])
    );

    const markAsRead = async (id: string) => {
        try {
            const res = await apiFetch(`/notifications/${id}/read`, { method: 'PUT' });
            if (res.ok) {
                setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
            }
        } catch (error) {
            console.error('Failed to mark notification as read', error);
        }
    };

    const clearNotification = async (id: string) => {
        try {
            const res = await apiFetch(`/notifications/${id}`, { method: 'DELETE' });
            if (res.ok) {
                setNotifications(prev => prev.filter(n => n.id !== id));
            }
        } catch (error) {
            console.error('Failed to clear notification', error);
        }
    };

    const clearAll = async () => {
        try {
            const res = await apiFetch('/notifications', { method: 'DELETE' });
            if (res.ok) {
                setNotifications([]);
            }
        } catch (error) {
            console.error('Failed to clear notifications', error);
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={theme.colors.text} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: theme.colors.text }]}>Notifications</Text>
                {notifications.length > 0 ? (
                    <TouchableOpacity onPress={clearAll}>
                        <Text style={[styles.clearText, { color: theme.colors.primary }]}>Clear All</Text>
                    </TouchableOpacity>
                ) : (
                    <View style={{ width: 60 }} />
                )}
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                </View>
            ) : notifications.length === 0 ? (
                <View style={styles.center}>
                    <MaterialCommunityIcons name="bell-off-outline" size={64} color={theme.colors.textTertiary} />
                    <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>No notifications yet</Text>
                </View>
            ) : (
                <FlatList
                    data={notifications}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <View
                            style={[
                                styles.notificationItem,
                                {
                                    backgroundColor: item.read ? theme.colors.card : theme.colors.primary + '15',
                                    borderColor: theme.colors.separator,
                                    opacity: item.read ? 0.4 : 1.0,
                                }
                            ]}
                        >
                            <View style={[styles.dot, { backgroundColor: item.read ? 'transparent' : '#3b82f6' }]} />
                            <TouchableOpacity 
                                style={styles.content}
                                activeOpacity={item.read ? 1 : 0.7}
                                onPress={() => !item.read && markAsRead(item.id)}
                            >
                                <Text style={[styles.itemTitle, { color: item.read ? theme.colors.textSecondary : theme.colors.text }]}>
                                    {item.title}
                                </Text>
                                <Text style={[styles.itemMessage, { color: theme.colors.textSecondary }]}>
                                    {item.message}
                                </Text>
                                <Text style={[styles.itemDate, { color: theme.colors.textTertiary }]}>
                                    {new Date(item.createdAt).toLocaleString()}
                                </Text>
                            </TouchableOpacity>
                            <View style={styles.actions}>
                                <TouchableOpacity onPress={() => clearNotification(item.id)} style={styles.actionButton}>
                                    <MaterialCommunityIcons name="trash-can-outline" size={20} color={theme.colors.danger} />
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                    contentContainerStyle={styles.listContent}
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
    },
    backButton: { padding: spacing.sm, marginLeft: -spacing.sm },
    title: { fontSize: 20, fontWeight: '700' },
    clearText: { fontSize: 14, fontWeight: '600' },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    emptyText: { marginTop: spacing.md, fontSize: 16 },
    listContent: { padding: spacing.md, gap: spacing.sm },
    notificationItem: {
        flexDirection: 'row',
        padding: spacing.md,
        borderRadius: radius.lg,
        borderWidth: 1,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginTop: 6,
        marginRight: spacing.sm,
    },
    content: { flex: 1 },
    itemTitle: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
    itemMessage: { fontSize: 14, marginBottom: 4 },
    itemDate: { fontSize: 12 },
    actions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    actionButton: {
        padding: spacing.xs,
    },
});
