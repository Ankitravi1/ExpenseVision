import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, RefreshControl, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { EmptyState, ChipSelector } from '../../components/ui';
import { CategoryIcon } from '../../components/CategoryIcon';
import { TransactionForm } from '../../components/TransactionForm';
import { formatCurrency } from '../../utils/currency';
import { spacing, radius } from '../../theme';
import { Transaction } from '../../types';

export default function TransactionsScreen() {
    const { transactions, categories, accounts, deleteTransaction, isLoading, refresh } = useData();
    const { user } = useAuth();
    const { theme } = useTheme();
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState<Transaction | null>(null);
    const currency = user?.currency || 'INR';

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return transactions.filter(t => {
            if (typeFilter !== 'all' && t.type !== typeFilter) return false;
            if (!q) return true;
            const cat = categories.find(c => c.id === t.categoryId);
            const acc = accounts.find(a => a.id === t.accountId);
            return (
                t.description.toLowerCase().includes(q) ||
                (cat?.name.toLowerCase().includes(q) ?? false) ||
                (acc?.name.toLowerCase().includes(q) ?? false)
            );
        });
    }, [transactions, categories, accounts, search, typeFilter]);

    const confirmDelete = (t: Transaction) => {
        Alert.alert('Delete transaction', `Delete "${t.description}"? Account balances will be adjusted.`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: () => deleteTransaction(t.id).catch(err => Alert.alert('Error', err.message)),
            },
        ]);
    };

    const renderItem = ({ item: t }: { item: Transaction }) => {
        const cat = categories.find(c => c.id === t.categoryId);
        const acc = accounts.find(a => a.id === t.accountId);
        const isIncome = t.type === 'income';
        return (
            <TouchableOpacity
                onPress={() => {
                    setEditing(t);
                    setShowForm(true);
                }}
                onLongPress={() => confirmDelete(t)}
                style={[styles.txRow, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}
            >
                <CategoryIcon name={t.type === 'transfer' ? 'CreditCard' : cat?.icon} size={16} />
                <View style={{ flex: 1, marginLeft: spacing.sm }}>
                    <Text style={{ color: theme.colors.text, fontWeight: '600' }} numberOfLines={1}>{t.description}</Text>
                    <Text style={{ color: theme.colors.textTertiary, fontSize: 12 }}>
                        {t.date.split('T')[0]} · {acc?.name || '—'}{cat ? ` · ${cat.name}` : ''}
                    </Text>
                </View>
                <Text
                    style={{
                        fontWeight: '700',
                        color: isIncome ? theme.colors.success : t.type === 'expense' ? theme.colors.danger : theme.colors.textSecondary,
                    }}
                >
                    {isIncome ? '+' : t.type === 'expense' ? '-' : ''}{formatCurrency(t.amount, currency)}
                </Text>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['top']}>
            <View style={styles.header}>
                <Text style={[styles.title, { color: theme.colors.text }]}>Transactions</Text>
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

            <View style={{ paddingHorizontal: spacing.md }}>
                <View style={[styles.searchBox, { backgroundColor: theme.colors.inputBg, borderColor: theme.colors.inputBorder }]}>
                    <MaterialCommunityIcons name="magnify" size={20} color={theme.colors.textTertiary} />
                    <TextInput
                        value={search}
                        onChangeText={setSearch}
                        placeholder="Search transactions..."
                        placeholderTextColor={theme.colors.textTertiary}
                        style={[styles.searchInput, { color: theme.colors.text }]}
                    />
                    {search ? (
                        <TouchableOpacity onPress={() => setSearch('')}>
                            <MaterialCommunityIcons name="close-circle" size={18} color={theme.colors.textTertiary} />
                        </TouchableOpacity>
                    ) : null}
                </View>
                <ChipSelector
                    options={[
                        { value: 'all', label: 'All' },
                        { value: 'expense', label: 'Expenses' },
                        { value: 'income', label: 'Income' },
                        { value: 'transfer', label: 'Transfers' },
                    ]}
                    value={typeFilter}
                    onChange={setTypeFilter}
                />
            </View>

            <FlatList
                data={filtered}
                keyExtractor={t => t.id}
                renderItem={renderItem}
                contentContainerStyle={{ padding: spacing.md, paddingTop: 0, gap: spacing.sm }}
                refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refresh} tintColor={theme.colors.primary} />}
                ListEmptyComponent={
                    <EmptyState
                        icon="swap-horizontal"
                        title={search || typeFilter !== 'all' ? 'No matching transactions' : 'No transactions yet'}
                        subtitle={search || typeFilter !== 'all' ? 'Try changing the search or filter' : 'Tap + to add your first transaction. Tap a transaction to edit it, long-press to delete.'}
                    />
                }
            />

            <TransactionForm
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
        paddingBottom: spacing.sm,
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
    txRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.md,
        borderRadius: radius.md,
        borderWidth: 1,
    },
});
