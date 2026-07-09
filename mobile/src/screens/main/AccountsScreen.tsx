import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { EmptyState, Card, SheetModal } from '../../components/ui';
import { AccountForm } from '../../components/AccountForm';
import { ScreenHeader } from '../../components/ScreenHeader';
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
    const { accounts, deleteAccount, isLoading, refresh, transactions } = useData();
    const { user } = useAuth();
    const { theme } = useTheme();
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState<Account | null>(null);
    const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
    const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
    const currency = user?.currency || 'INR';

    const total = accounts.reduce((sum, a) => sum + a.balance, 0);

    const totalExpensesAllTime = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
    const totalIncomeAllTime = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);

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

    const getAccountTransactions = (accountId: string) => {
        return transactions.filter(t => t.accountId === accountId || t.transferToAccountId === accountId);
    };

    const getTxAmountAndColor = (t: any, accountId: string) => {
        let isDebit = false;
        let prefix = '';
        if (t.type === 'expense') {
            isDebit = true;
            prefix = '-';
        } else if (t.type === 'income') {
            isDebit = false;
            prefix = '+';
        } else if (t.type === 'transfer') {
            if (t.accountId === accountId) {
                isDebit = true;
                prefix = '-';
            } else {
                isDebit = false;
                prefix = '+';
            }
        }
        return {
            text: `${prefix}${formatCurrency(t.amount, currency)}`,
            color: isDebit ? theme.colors.danger : theme.colors.success,
        };
    };

    const renderAccountDetails = () => {
        if (!selectedAccount) return null;
        const txs = getAccountTransactions(selectedAccount.id);

        const sorted = [...txs].sort((a, b) => {
            return sortOrder === 'newest'
                ? b.date.localeCompare(a.date)
                : a.date.localeCompare(b.date);
        });

        const groups: { month: string; transactions: typeof sorted }[] = [];
        sorted.forEach(t => {
            const m = t.date.substring(0, 7);
            let group = groups.find(g => g.month === m);
            if (!group) {
                group = { month: m, transactions: [] };
                groups.push(group);
            }
            group.transactions.push(t);
        });

        return (
            <View style={{ gap: spacing.md }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs }}>
                    <View style={{ flexDirection: 'row', gap: spacing.xs }}>
                        <TouchableOpacity
                            onPress={() => setSortOrder('newest')}
                            style={[
                                styles.sortButton,
                                {
                                    backgroundColor: sortOrder === 'newest' ? theme.colors.primary : theme.colors.inputBg,
                                    borderColor: sortOrder === 'newest' ? theme.colors.primary : theme.colors.inputBorder,
                                },
                            ]}
                        >
                            <Text style={{ color: sortOrder === 'newest' ? '#fff' : theme.colors.text, fontSize: 12, fontWeight: '600' }}>
                                Newest
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => setSortOrder('oldest')}
                            style={[
                                styles.sortButton,
                                {
                                    backgroundColor: sortOrder === 'oldest' ? theme.colors.primary : theme.colors.inputBg,
                                    borderColor: sortOrder === 'oldest' ? theme.colors.primary : theme.colors.inputBorder,
                                },
                            ]}
                        >
                            <Text style={{ color: sortOrder === 'oldest' ? '#fff' : theme.colors.text, fontSize: 12, fontWeight: '600' }}>
                                Oldest
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        onPress={() => {
                            setEditing(selectedAccount);
                            setSelectedAccount(null);
                            setShowForm(true);
                        }}
                        style={[styles.editButton, { borderColor: theme.colors.primary }]}
                    >
                        <MaterialCommunityIcons name="pencil-outline" size={14} color={theme.colors.primary} />
                        <Text style={{ color: theme.colors.primary, fontSize: 12, fontWeight: '600', marginLeft: 4 }}>
                            Edit Account
                        </Text>
                    </TouchableOpacity>
                </View>

                <Card style={{ padding: spacing.sm, backgroundColor: theme.colors.inputBg, borderColor: theme.colors.inputBorder }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }}>Current Balance:</Text>
                        <Text style={{ color: selectedAccount.balance < 0 ? theme.colors.danger : theme.colors.text, fontWeight: '700', fontSize: 14 }}>
                            {formatCurrency(selectedAccount.balance, currency)}
                        </Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                        <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }}>Initial Amount:</Text>
                        <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }}>
                            {formatCurrency(selectedAccount.initialBalance ?? selectedAccount.balance, currency)}
                        </Text>
                    </View>
                </Card>

                {groups.length === 0 ? (
                    <Text style={{ color: theme.colors.textTertiary, textAlign: 'center', marginVertical: spacing.xl, fontStyle: 'italic' }}>
                        No transactions recorded for this account.
                    </Text>
                ) : (
                    groups.map(group => {
                        const [y, m] = group.month.split('-').map(Number);
                        const monthName = new Date(y, m - 1, 1).toLocaleString('default', { month: 'long', year: 'numeric' });
                        return (
                            <View key={group.month} style={{ marginBottom: spacing.sm }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.separator, paddingBottom: 4 }}>
                                    <Text style={{ color: theme.colors.text, fontWeight: '700', fontSize: 14 }}>
                                        {monthName}
                                    </Text>
                                    <Text style={{ color: theme.colors.textTertiary, fontSize: 11 }}>
                                        {group.transactions.length} transaction{group.transactions.length === 1 ? '' : 's'}
                                    </Text>
                                </View>
                                <View style={{ gap: 6 }}>
                                    {group.transactions.map(t => {
                                        const { text, color } = getTxAmountAndColor(t, selectedAccount.id);
                                        const dayStr = t.date.split('-')[2];
                                        return (
                                            <View key={t.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 }}>
                                                <View style={{ flex: 1, marginRight: spacing.md }}>
                                                    <Text style={{ color: theme.colors.text, fontSize: 13 }} numberOfLines={1}>
                                                        {t.note || 'Unspecified'}
                                                    </Text>
                                                    <Text style={{ color: theme.colors.textTertiary, fontSize: 11 }}>
                                                        Day {dayStr} • {t.type}
                                                    </Text>
                                                </View>
                                                <Text style={{ color, fontWeight: '600', fontSize: 13 }}>
                                                    {text}
                                                </Text>
                                            </View>
                                        );
                                    })}
                                </View>
                            </View>
                        );
                    })
                )}
            </View>
        );
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['top']}>
            <ScreenHeader title="Accounts" />

            {/* Combined Stats Card */}
            <View style={{ paddingHorizontal: spacing.md, marginBottom: spacing.md }}>
                <Card style={{ padding: spacing.md }}>
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 12, textTransform: 'uppercase', fontWeight: '700', letterSpacing: 0.5 }}>Combined Balance</Text>
                    <Text style={{ color: theme.colors.text, fontSize: 26, fontWeight: '800', marginVertical: 4 }}>
                        {formatCurrency(total, currency)}
                    </Text>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.separator, paddingTop: spacing.md, marginTop: spacing.xs }}>
                        <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                <MaterialCommunityIcons name="arrow-down-bold-circle-outline" size={16} color={theme.colors.success} />
                                <Text style={{ color: theme.colors.textSecondary, fontSize: 11, fontWeight: '600' }}>Income so far</Text>
                            </View>
                            <Text style={{ color: theme.colors.success, fontSize: 16, fontWeight: '700', marginTop: 2 }}>
                                {formatCurrency(totalIncomeAllTime, currency)}
                            </Text>
                        </View>
                        <View style={{ flex: 1, borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: theme.colors.separator, paddingLeft: spacing.md }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                <MaterialCommunityIcons name="arrow-up-bold-circle-outline" size={16} color={theme.colors.danger} />
                                <Text style={{ color: theme.colors.textSecondary, fontSize: 11, fontWeight: '600' }}>Expense so far</Text>
                            </View>
                            <Text style={{ color: theme.colors.danger, fontSize: 16, fontWeight: '700', marginTop: 2 }}>
                                {formatCurrency(totalExpensesAllTime, currency)}
                            </Text>
                        </View>
                    </View>
                </Card>
            </View>

            <FlatList
                data={accounts}
                keyExtractor={a => a.id}
                contentContainerStyle={{ padding: spacing.md, paddingTop: 0, gap: spacing.sm }}
                refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refresh} tintColor={theme.colors.primary} />}
                renderItem={({ item: a }) => (
                    <TouchableOpacity
                        onPress={() => {
                            setSelectedAccount(a);
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
                    <EmptyState icon="wallet-outline" title="No accounts yet" subtitle="Tap + to add your first account. Tap an account to view details, long-press to delete." />
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

            <SheetModal
                visible={!!selectedAccount}
                title={selectedAccount?.name || 'Account Records'}
                onClose={() => setSelectedAccount(null)}
            >
                {renderAccountDetails()}
            </SheetModal>

            <TouchableOpacity
                onPress={() => {
                    setEditing(null);
                    setShowForm(true);
                }}
                style={{
                    backgroundColor: theme.colors.primary,
                    position: 'absolute',
                    bottom: spacing.lg,
                    right: spacing.lg,
                    width: 56,
                    height: 56,
                    borderRadius: 28,
                    justifyContent: 'center',
                    alignItems: 'center',
                    elevation: 5,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.25,
                    shadowRadius: 3.84,
                }}
            >
                <MaterialCommunityIcons name="plus" size={28} color="#fff" />
            </TouchableOpacity>
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
    sortButton: {
        paddingHorizontal: spacing.sm,
        paddingVertical: 6,
        borderRadius: radius.sm,
        borderWidth: 1,
    },
    editButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.sm,
        paddingVertical: 6,
        borderRadius: radius.sm,
        borderWidth: 1,
    },
});
