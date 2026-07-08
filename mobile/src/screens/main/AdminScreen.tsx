import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, RefreshControl, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { apiFetch } from '../../services/api';
import { spacing, radius } from '../../theme';

interface UserItem {
    id: string;
    email: string;
    name: string;
    role: string;
    createdAt: string;
}

export default function AdminScreen() {
    const navigation = useNavigation();
    const { theme } = useTheme();
    const [users, setUsers] = useState<UserItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const fetchUsers = async (isRefresh = false) => {
        if (isRefresh) {
            setRefreshing(true);
        } else {
            setLoading(true);
        }
        try {
            const res = await apiFetch('/admin/users');
            if (res.ok) {
                const data = await res.json();
                setUsers(data);
            } else {
                const err = await res.json();
                Alert.alert('Error', err.error || 'Failed to load users');
            }
        } catch (e: any) {
            Alert.alert('Error', e.message || 'Failed to fetch users');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleDeleteUser = (id: string, name: string) => {
        if (id === deletingId) return;
        Alert.alert(
            'Delete User',
            `Are you sure you want to delete the user "${name}" and all of their transaction history, accounts, budgets, and settings?\n\nThis action is permanent.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete User',
                    style: 'destructive',
                    onPress: async () => {
                        setDeletingId(id);
                        try {
                            const res = await apiFetch(`/admin/users/${id}`, {
                                method: 'DELETE'
                            });
                            if (res.ok) {
                                Alert.alert('Success', 'User and all data deleted successfully.');
                                setUsers(prev => prev.filter(u => u.id !== id));
                            } else {
                                const err = await res.json();
                                Alert.alert('Error', err.error || 'Failed to delete user');
                            }
                        } catch (e: any) {
                            Alert.alert('Error', e.message || 'Failed to delete user');
                        } finally {
                            setDeletingId(null);
                        }
                    }
                }
            ]
        );
    };

    const filteredUsers = users.filter(
        user =>
            user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const renderItem = ({ item: user }: { item: UserItem }) => {
        const isSelf = user.role === 'superadmin';
        return (
            <View style={[styles.userCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}>
                <View style={[styles.avatar, { backgroundColor: theme.colors.primary }]}>
                    <Text style={styles.avatarText}>{user.name.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: spacing.sm }}>
                    <Text style={[styles.name, { color: theme.colors.text }]}>{user.name}</Text>
                    <Text style={[styles.email, { color: theme.colors.textTertiary }]}>{user.email}</Text>
                    <View style={{ flexDirection: 'row', marginTop: 4 }}>
                        <View style={[styles.roleBadge, { backgroundColor: isSelf ? '#fef3c7' : '#dbeafe' }]}>
                            <Text style={[styles.roleText, { color: isSelf ? '#b45309' : '#1d4ed8' }]}>
                                {user.role}
                            </Text>
                        </View>
                    </View>
                </View>
                {!isSelf ? (
                    <TouchableOpacity
                        onPress={() => handleDeleteUser(user.id, user.name)}
                        disabled={deletingId === user.id}
                        style={[styles.deleteButton, { backgroundColor: theme.colors.danger }]}
                    >
                        {deletingId === user.id ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <MaterialCommunityIcons name="trash-can-outline" size={20} color="#fff" />
                        )}
                    </TouchableOpacity>
                ) : (
                    <Text style={[styles.protectedText, { color: theme.colors.textTertiary }]}>Protected</Text>
                )}
            </View>
        );
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['top']}>
            <View style={styles.header}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <TouchableOpacity
                        onPress={() => (navigation as any).openDrawer?.()}
                        style={{ marginRight: 12, padding: 4 }}
                        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    >
                        <MaterialCommunityIcons name="menu" size={26} color={theme.colors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.title, { color: theme.colors.text }]}>Admin Panel</Text>
                </View>
            </View>

            <View style={{ paddingHorizontal: spacing.md }}>
                <View style={[styles.searchBox, { backgroundColor: theme.colors.inputBg, borderColor: theme.colors.inputBorder }]}>
                    <MaterialCommunityIcons name="magnify" size={20} color={theme.colors.textTertiary} />
                    <TextInput
                        value={searchTerm}
                        onChangeText={setSearchTerm}
                        placeholder="Search users..."
                        placeholderTextColor={theme.colors.textTertiary}
                        style={[styles.searchInput, { color: theme.colors.text }]}
                    />
                    {searchTerm ? (
                        <TouchableOpacity onPress={() => setSearchTerm('')}>
                            <MaterialCommunityIcons name="close-circle" size={18} color={theme.colors.textTertiary} />
                        </TouchableOpacity>
                    ) : null}
                </View>
            </View>

            {loading && users.length === 0 ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                    <Text style={{ marginTop: 12, color: theme.colors.textSecondary, fontSize: 14 }}>
                        Loading users list...
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={filteredUsers}
                    keyExtractor={item => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={{ padding: spacing.md, paddingTop: 0, gap: spacing.sm }}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => fetchUsers(true)}
                            tintColor={theme.colors.primary}
                        />
                    }
                    ListEmptyComponent={
                        <View style={{ padding: spacing.xl, alignItems: 'center' }}>
                            <MaterialCommunityIcons name="account-search-outline" size={48} color={theme.colors.textTertiary} />
                            <Text style={{ marginTop: 12, color: theme.colors.textSecondary, fontWeight: '600' }}>
                                No matching users found
                            </Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: spacing.md,
        paddingBottom: spacing.sm,
    },
    title: {
        fontSize: 26,
        fontWeight: '800',
    },
    searchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: radius.md,
        paddingHorizontal: 12,
        marginBottom: spacing.sm,
    },
    searchInput: {
        flex: 1,
        paddingVertical: 10,
        paddingHorizontal: 8,
        fontSize: 15,
    },
    userCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.md,
        borderRadius: radius.md,
        borderWidth: 1,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 18,
    },
    name: {
        fontWeight: '600',
        fontSize: 15,
    },
    email: {
        fontSize: 12,
        marginTop: 2,
    },
    roleBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: radius.sm,
    },
    roleText: {
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    deleteButton: {
        width: 36,
        height: 36,
        borderRadius: radius.sm,
        alignItems: 'center',
        justifyContent: 'center',
    },
    protectedText: {
        fontSize: 12,
        fontStyle: 'italic',
    },
});
