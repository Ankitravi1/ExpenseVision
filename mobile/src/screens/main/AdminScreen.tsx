import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, RefreshControl, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { SheetModal, Input, Button } from '../../components/ui';
import { apiFetch } from '../../services/api';
import { spacing, radius } from '../../theme';

// The one designated superadmin — mirrors backend/src/routes/admin.ts.
const SUPERADMIN_EMAIL = 'ankitravione@gmail.com';

interface UserItem {
    id: string;
    email: string;
    name: string;
    role: string;
    googleId?: string | null;
    createdAt: string;
}

const isSuperAdminRow = (user: UserItem) => user.role === 'superadmin' || user.email === SUPERADMIN_EMAIL;

// ─── Reset Password Sheet ──────────────────────────────────────────────────
const ResetPasswordSheet: React.FC<{
    user: UserItem | null;
    onClose: () => void;
    onSuccess: (name: string) => void;
}> = ({ user, onClose, onSuccess }) => {
    const { theme } = useTheme();
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Reset local state whenever the target user changes.
    useEffect(() => {
        setPassword('');
        setConfirm('');
        setError('');
        setLoading(false);
    }, [user?.id]);

    const isValid = password.length >= 8 && password === confirm;

    const submit = async () => {
        if (!user || !isValid) return;
        setLoading(true);
        setError('');
        try {
            const res = await apiFetch(`/admin/users/${user.id}/password`, {
                method: 'PUT',
                body: JSON.stringify({ password }),
            });
            if (res.ok) {
                onSuccess(user.name);
                onClose();
            } else {
                const err = await res.json().catch(() => ({} as any));
                setError(err.error || 'Failed to update password');
            }
        } catch (e: any) {
            setError(e.message || 'Failed to update password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SheetModal visible={!!user} title="Reset Password" onClose={onClose}>
            {user ? (
                <Text style={{ color: theme.colors.textTertiary, fontSize: 13, marginBottom: spacing.md }}>
                    {user.name} · {user.email}
                </Text>
            ) : null}
            {error ? (
                <View style={[styles.errorBox, { backgroundColor: theme.colors.dangerBg }]}>
                    <Text style={{ color: theme.colors.danger, fontSize: 13 }}>{error}</Text>
                </View>
            ) : null}
            <Input
                label="New Password"
                value={password}
                onChangeText={setPassword}
                placeholder="Min. 8 characters"
                secureTextEntry
                autoCapitalize="none"
            />
            <Input
                label="Confirm Password"
                value={confirm}
                onChangeText={setConfirm}
                placeholder="Re-enter password"
                secureTextEntry
                autoCapitalize="none"
            />
            {confirm.length > 0 && password !== confirm ? (
                <Text style={{ color: theme.colors.danger, fontSize: 12, marginBottom: spacing.sm }}>Passwords do not match</Text>
            ) : null}
            <Button title={loading ? 'Saving...' : 'Set Password'} onPress={submit} loading={loading} disabled={!isValid} />
        </SheetModal>
    );
};

export default function AdminScreen() {
    const navigation = useNavigation();
    const { theme } = useTheme();
    const [users, setUsers] = useState<UserItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [resetUser, setResetUser] = useState<UserItem | null>(null);

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
                            const res = await apiFetch(`/admin/users/${id}`, { method: 'DELETE' });
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
                    },
                },
            ]
        );
    };

    const filteredUsers = users.filter(
        user =>
            user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const formatJoined = (iso: string) => {
        const d = new Date(iso);
        if (isNaN(d.getTime())) return '';
        return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const renderItem = ({ item: user }: { item: UserItem }) => {
        const protectedRow = isSuperAdminRow(user);
        const isGoogle = !!user.googleId;
        return (
            <View style={[styles.userCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={[styles.avatar, { backgroundColor: theme.colors.primary }]}>
                        <Text style={styles.avatarText}>{user.name.charAt(0).toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: spacing.sm }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                            <Text style={[styles.name, { color: theme.colors.text }]}>{user.name}</Text>
                            {/* Signup-method badge */}
                            <View style={[styles.methodBadge, { backgroundColor: isGoogle ? theme.colors.dangerBg : theme.colors.primaryLight }]}>
                                <Text style={[styles.methodText, { color: isGoogle ? theme.colors.danger : theme.colors.primary }]}>
                                    {isGoogle ? 'Google' : 'Manual'}
                                </Text>
                            </View>
                        </View>
                        <Text style={[styles.email, { color: theme.colors.textTertiary }]}>{user.email}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 8 }}>
                            <View style={[styles.roleBadge, { backgroundColor: protectedRow ? theme.colors.warning + '33' : theme.colors.primaryLight }]}>
                                <Text style={[styles.roleText, { color: protectedRow ? theme.colors.warning : theme.colors.primary }]}>
                                    {user.role}
                                </Text>
                            </View>
                            <Text style={{ color: theme.colors.textTertiary, fontSize: 11 }}>Joined {formatJoined(user.createdAt)}</Text>
                        </View>
                    </View>
                    {protectedRow ? (
                        <Text style={[styles.protectedText, { color: theme.colors.textTertiary }]}>Protected</Text>
                    ) : null}
                </View>

                {/* Actions — superadmin row has none (protected) */}
                {!protectedRow ? (
                    <View style={[styles.actions, { borderTopColor: theme.colors.separator }]}>
                        <TouchableOpacity
                            onPress={() => setResetUser(user)}
                            style={[styles.resetBtn, { borderColor: theme.colors.primary }]}
                        >
                            <MaterialCommunityIcons name="key-outline" size={14} color={theme.colors.primary} />
                            <Text style={{ color: theme.colors.primary, fontSize: 12, fontWeight: '700', marginLeft: 4 }}>Reset Password</Text>
                        </TouchableOpacity>
                        <View style={{ flex: 1 }} />
                        <TouchableOpacity
                            onPress={() => handleDeleteUser(user.id, user.name)}
                            disabled={deletingId === user.id}
                            style={[styles.deleteButton, { backgroundColor: theme.colors.danger }]}
                        >
                            {deletingId === user.id ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <MaterialCommunityIcons name="trash-can-outline" size={18} color="#fff" />
                            )}
                        </TouchableOpacity>
                    </View>
                ) : null}
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

            <ResetPasswordSheet
                user={resetUser}
                onClose={() => setResetUser(null)}
                onSuccess={name => Alert.alert('Success', `Password for ${name} updated successfully.`)}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    errorBox: {
        borderRadius: radius.md,
        padding: spacing.sm,
        marginBottom: spacing.md,
    },
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
    methodBadge: {
        paddingHorizontal: 6,
        paddingVertical: 1,
        borderRadius: radius.sm,
    },
    methodText: {
        fontSize: 9,
        fontWeight: '800',
        textTransform: 'uppercase',
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
    protectedText: {
        fontSize: 12,
        fontStyle: 'italic',
        marginLeft: spacing.sm,
    },
    actions: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: spacing.md,
        paddingTop: spacing.sm,
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    resetBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: radius.sm,
        borderWidth: 1,
    },
    deleteButton: {
        width: 36,
        height: 36,
        borderRadius: radius.sm,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
