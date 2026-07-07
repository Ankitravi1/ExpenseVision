import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { EmptyState } from '../../components/ui';
import { AccountForm } from '../../components/AccountForm';
import { formatCurrency } from '../../utils/currency';
import { spacing, radius } from '../../theme';
import { Account } from '../../types';

const TYPE_ICONS: Record<string, keyof typeof MaterialCommunityIcons.glyphMap> = {
    Checking: 'bank',
    Savings: 'piggy-bank',
    savings: 'piggy-bank',
    Cash: 'cash',
    'Credit Card': 'credit-card',
    Asset: 'chart-line',
    Liability: 'scale-balance',
};

export default function AccountsScreen() {
    const navigation = useNavigation();
    const { accounts, deleteAccount, isLoading, refresh } = useData();
    const { user } = useAuth();
    const { theme } = useTheme();
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState<Account | null>(null);
    const currency = user?.currency || 'INR';

    const total = accounts.reduce((sum, a) => sum + a.balance, 0);

    const confirmDelete = (a: Account) => {
        Alert.alert('Delete account', `Delete "${a.name}"? Accounts with transactions cannot be deleted.`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: () => deleteAccount(a.id).catch(err => Alert.alert('Cannot delete', err.message)),
            },
        ]);
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['top']}>
            <View style={styles.header}>
                <View>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <TouchableOpacity
                        onPress={() => (navigation as any).openDrawer?.()}
                        style={{ marginRight: 12, padding: 4 }}
                        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    >
                        <MaterialCommunityIcons name="menu" size={26} color={theme.colors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.title, { color: theme.colors.text }]}>Accounts</Text>
                </View>
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }}>
                        Total: <Text style={{ fontWeight: '700', color: theme.colors.text }}>{formatCurrency(total, currency)}</Text>
                    </Text>
                </View>
                <TouchableOpacity
                    onPress={() => {
                        setEditing(null);
                        setShowForm(true);
                    }}
                    style={[styles.addButton, { backgroundColor: theme.colors.primary }]}
                >
                    <MaterialCommunityIcons name="plus" size={24} color="#fff" />
                </TouchableOpacity>
            </View>

            <FlatList
                data={accounts}
                keyExtractor={a => a.id}
                contentContainerStyle={{ padding: spacing.md, paddingTop: 0, gap: spacing.sm }}
                refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refresh} tintColor={theme.colors.primary} />}
                renderItem={({ item: a }) => (
                    <TouchableOpacity
                        onPress={() => {
                            setEditing(a);
                            setShowForm(true);
                        }}
                        onLongPress={() => confirmDelete(a)}
                        style={[styles.accountRow, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}
                    >
                        <View style={[styles.iconBox, { backgroundColor: theme.colors.primaryLight }]}>
                            <MaterialCommunityIcons
                                name={TYPE_ICONS[a.type] || 'wallet'}
                                size={22}
                                color={theme.colors.primary}
                            />
                        </View>
                        <View style={{ flex: 1, marginLeft: spacing.md }}>
                            <Text style={{ color: theme.colors.text, fontWeight: '700', fontSize: 15 }}>{a.name}</Text>
                            <Text style={{ color: theme.colors.textTertiary, fontSize: 12 }}>{a.type}</Text>
                        </View>
                        <Text style={{ color: a.balance < 0 ? theme.colors.danger : theme.colors.text, fontWeight: '700', fontSize: 15 }}>
                            {formatCurrency(a.balance, currency)}
                        </Text>
                    </TouchableOpacity>
                )}
                ListEmptyComponent={
                    <EmptyState icon="wallet-outline" title="No accounts yet" subtitle="Tap + to add your first account. Tap an account to edit, long-press to delete." />
                }
            />

            <AccountForm
                visible={showForm}
                onClose={() => {
                    setShowForm(false);
                    setEditing(null);
                }}
                editing={editing}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: spacing.md,
    },
    title: {
        fontSize: 26,
        fontWeight: '800',
    },
    addButton: {
        width: 44,
        height: 44,
        borderRadius: radius.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    accountRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.md,
        borderRadius: radius.md,
        borderWidth: 1,
    },
    iconBox: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
