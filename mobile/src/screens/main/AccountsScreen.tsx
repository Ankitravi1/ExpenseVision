import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { EmptyState, Card, SheetModal } from '../../components/ui';
import { CategoryIcon } from '../../components/CategoryIcon';
import { AccountForm, getAccountVisual } from '../../components/AccountForm';
import { TransactionForm } from '../../components/TransactionForm';
import { ScreenHeader } from '../../components/ScreenHeader';
import { formatCurrency } from '../../utils/currency';
import { spacing, radius } from '../../theme';
import { Account, Transaction } from '../../types';

export default function AccountsScreen() {
    const { accounts, deleteAccount, updateAccount, isLoading, refresh, transactions } = useData();
    const { user } = useAuth();
    const { theme } = useTheme();
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState<Account | null>(null);
    const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
    const [editTx, setEditTx] = useState<Transaction | null>(null);
    const [showTxForm, setShowTxForm] = useState(false);
    const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
    const [showFrozen, setShowFrozen] = useState(false);
    const currency = user?.currency || 'INR';

    // Frozen accounts are paused everywhere: hidden from the main list and
    // excluded from the summary stat cards below. They only reappear via the
    // "Show frozen" toggle, which is also the only way to unfreeze one.
    const activeAccounts = accounts.filter(a => !a.frozen);
    const frozenAccounts = accounts.filter(a => a.frozen);
    const activeAccountIds = new Set(activeAccounts.map(a => a.id));

    const total = activeAccounts.reduce((sum, a) => sum + a.balance, 0);

    const totalExpensesAllTime = transactions
        .filter(t => t.type === 'expense' && activeAccountIds.has(t.accountId))
        .reduce((sum, t) => sum + t.amount, 0);
    const totalIncomeAllTime = transactions
        .filter(t => t.type === 'income' && activeAccountIds.has(t.accountId))
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

    const confirmFreeze = (a: Account) => {
        Alert.alert(
            'Freeze account',
            `Freeze "${a.name}"? While frozen, it won't accept new transactions or recurring rules, and it will be excluded from balance totals until you unfreeze it.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    // Freezing is reversible (one-tap unfreeze) — not the same
                    // irreversible-destructive class as confirmDelete above it.
                    text: 'Freeze',
                    onPress: () => updateAccount(a.id, { frozen: true }).catch(err => Alert.alert('Error', err.message || 'Failed to freeze account')),
                },
            ]
        );
    };

    const handleUnfreeze = (a: Account) => {
        updateAccount(a.id, { frozen: false }).catch(err => Alert.alert('Error', err.message || 'Failed to unfreeze account'));
    };

    const getAccountTransactions = (accountId: string) => {
        return transactions.filter(t => t.accountId === accountId || t.transferToAccountId === accountId);
    };

    const openTxEdit = (t: Transaction) => {
        setSelectedAccount(null);
        setEditTx(t);
        setShowTxForm(true);
    };

    const getTxAmountAndColor = (t: Transaction, accountId: string) => {
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

    // Theme-aware subtle gradient tints for the summary stat cards (web parity).
    const statGradients: Record<'expense' | 'income' | 'balance', [string, string]> = theme.dark
        ? {
              expense: ['#2a1418', theme.colors.card],
              income: ['#0d2019', theme.colors.card],
              balance: ['#161c33', theme.colors.card],
          }
        : {
              expense: ['#fff1f2', '#ffffff'],
              income: ['#ecfdf5', '#ffffff'],
              balance: ['#eef2ff', '#ffffff'],
          };

    const StatCard = ({
        gradient,
        icon,
        label,
        value,
        color,
        tintBg,
    }: {
        gradient: [string, string];
        icon: keyof typeof MaterialCommunityIcons.glyphMap;
        label: string;
        value: string;
        color: string;
        tintBg: string;
    }) => (
        <LinearGradient
            colors={gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.statCard, { borderColor: theme.colors.cardBorder }]}
        >
            <View style={[styles.statIcon, { backgroundColor: tintBg }]}>
                <MaterialCommunityIcons name={icon} size={18} color={color} />
            </View>
            <Text style={{ color: theme.colors.textSecondary, fontSize: 11, fontWeight: '600' }} numberOfLines={1}>
                {label}
            </Text>
            <Text style={{ color, fontSize: 16, fontWeight: '800', marginTop: 2 }} numberOfLines={1} adjustsFontSizeToFit>
                {value}
            </Text>
        </LinearGradient>
    );

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
                                        // Derive the day from the ISO date portion so timed
                                        // transactions ("2026-07-10T14:30") don't render "10T14:30".
                                        const dayStr = t.date.substring(0, 10).split('-')[2];
                                        return (
                                            <TouchableOpacity
                                                key={t.id}
                                                onPress={() => openTxEdit(t)}
                                                activeOpacity={0.6}
                                                style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 }}
                                            >
                                                <View style={{ flex: 1, marginRight: spacing.md }}>
                                                    <Text style={{ color: theme.colors.text, fontSize: 13 }} numberOfLines={1}>
                                                        {t.note || 'Unspecified'}
                                                    </Text>
                                                    <Text style={{ color: theme.colors.textTertiary, fontSize: 11 }}>
                                                        Day {dayStr} • {t.type}
                                                    </Text>
                                                </View>
                                                <Text style={{ color, fontWeight: '600', fontSize: 13, marginRight: 6 }}>
                                                    {text}
                                                </Text>
                                                <MaterialCommunityIcons name="pencil-outline" size={13} color={theme.colors.textTertiary} />
                                            </TouchableOpacity>
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

    const renderAccountCard = (a: Account) => {
        const { gradient, icon } = getAccountVisual(a.type, a.icon);
        const isFrozen = !!a.frozen;
        return (
            <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => setSelectedAccount(a)}
                onLongPress={() => confirmDelete(a)}
                style={isFrozen ? { opacity: 0.6 } : undefined}
            >
                <LinearGradient
                    colors={gradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.accountCard}
                >
                    {isFrozen && (
                        <View style={styles.frozenBadge}>
                            <MaterialCommunityIcons name="snowflake" size={11} color="#fff" />
                            <Text style={styles.frozenBadgeText}>Frozen</Text>
                        </View>
                    )}
                    <View style={styles.accountCardTop}>
                        <View style={{ flex: 1, marginRight: spacing.sm }}>
                            <Text style={styles.accountName} numberOfLines={1}>{a.name}</Text>
                            <Text style={styles.accountType} numberOfLines={1}>{a.type}</Text>
                        </View>
                        <CategoryIcon
                            name={icon}
                            size={20}
                            color="#ffffff"
                            backgroundColor="rgba(255,255,255,0.18)"
                        />
                    </View>
                    <View style={styles.accountCardDivider} />
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                        <View>
                            <Text style={styles.accountBalanceLabel}>Current Balance</Text>
                            <Text style={styles.accountBalance}>{formatCurrency(a.balance, currency)}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', gap: spacing.xs }}>
                            {isFrozen ? (
                                <TouchableOpacity
                                    onPress={() => handleUnfreeze(a)}
                                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                    style={styles.accountEditBtn}
                                >
                                    <MaterialCommunityIcons name="snowflake-off" size={18} color="rgba(255,255,255,0.9)" />
                                </TouchableOpacity>
                            ) : (
                                <TouchableOpacity
                                    onPress={() => confirmFreeze(a)}
                                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                    style={styles.accountEditBtn}
                                >
                                    <MaterialCommunityIcons name="snowflake" size={18} color="rgba(255,255,255,0.9)" />
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity
                                onPress={() => {
                                    setEditing(a);
                                    setShowForm(true);
                                }}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                style={styles.accountEditBtn}
                            >
                                <MaterialCommunityIcons name="cog-outline" size={18} color="rgba(255,255,255,0.9)" />
                            </TouchableOpacity>
                        </View>
                    </View>
                </LinearGradient>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['top']}>
            <ScreenHeader title="Accounts" />

            {/* Summary stat cards (web parity): Expense / Income / Combined Balance */}
            <View style={{ flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.md, marginBottom: spacing.md }}>
                <StatCard
                    gradient={statGradients.expense}
                    icon="trending-down"
                    label="Expense so far"
                    value={formatCurrency(totalExpensesAllTime, currency)}
                    color={theme.colors.danger}
                    tintBg={theme.colors.dangerBg}
                />
                <StatCard
                    gradient={statGradients.income}
                    icon="trending-up"
                    label="Income so far"
                    value={formatCurrency(totalIncomeAllTime, currency)}
                    color={theme.colors.success}
                    tintBg={theme.colors.successBg}
                />
                <StatCard
                    gradient={statGradients.balance}
                    icon="bank-outline"
                    label="Combined"
                    value={formatCurrency(total, currency)}
                    color={theme.colors.primary}
                    tintBg={theme.colors.primaryLight}
                />
            </View>

            <FlatList
                data={activeAccounts}
                keyExtractor={a => a.id}
                contentContainerStyle={{ padding: spacing.md, paddingTop: 0, gap: spacing.sm }}
                refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refresh} tintColor={theme.colors.primary} />}
                renderItem={({ item: a }) => renderAccountCard(a)}
                ListEmptyComponent={
                    accounts.length === 0 ? (
                        <EmptyState icon="wallet-outline" title="No accounts yet" subtitle="Tap + to add your first account. Tap an account to view details, long-press to delete." />
                    ) : (
                        <EmptyState icon="snowflake" title="All accounts are frozen" subtitle={'Use "Show frozen" below to unfreeze one.'} />
                    )
                }
                ListFooterComponent={
                    frozenAccounts.length > 0 ? (
                        <View style={{ marginTop: spacing.xs }}>
                            <TouchableOpacity
                                onPress={() => setShowFrozen(v => !v)}
                                style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: spacing.sm }}
                            >
                                <MaterialCommunityIcons
                                    name={showFrozen ? 'chevron-up' : 'chevron-down'}
                                    size={18}
                                    color={theme.colors.primary}
                                />
                                <Text style={{ color: theme.colors.primary, fontWeight: '700', fontSize: 13 }}>
                                    {showFrozen ? 'Hide' : 'Show'} frozen ({frozenAccounts.length})
                                </Text>
                            </TouchableOpacity>
                            {showFrozen && (
                                <View style={{ gap: spacing.sm, marginTop: spacing.xs }}>
                                    {frozenAccounts.map(a => (
                                        <View key={a.id}>{renderAccountCard(a)}</View>
                                    ))}
                                </View>
                            )}
                        </View>
                    ) : null
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

            <TransactionForm
                visible={showTxForm}
                editing={editTx}
                onClose={() => {
                    setShowTxForm(false);
                    setEditTx(null);
                }}
            />

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
    statCard: {
        flex: 1,
        borderRadius: radius.md,
        borderWidth: 1,
        padding: spacing.sm,
    },
    statIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 6,
    },
    accountCard: {
        borderRadius: radius.lg,
        padding: spacing.md,
    },
    frozenBadge: {
        position: 'absolute',
        top: spacing.sm,
        right: spacing.sm,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(0,0,0,0.35)',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 999,
        zIndex: 1,
    },
    frozenBadgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '800',
    },
    accountCardTop: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
    },
    accountName: {
        color: '#ffffff',
        fontWeight: '800',
        fontSize: 17,
    },
    accountType: {
        color: 'rgba(255,255,255,0.8)',
        fontWeight: '600',
        fontSize: 12,
        marginTop: 2,
    },
    accountCardDivider: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: 'rgba(255,255,255,0.25)',
        marginVertical: spacing.md,
    },
    accountBalanceLabel: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 11,
    },
    accountBalance: {
        color: '#ffffff',
        fontSize: 24,
        fontWeight: '800',
        marginTop: 2,
    },
    accountEditBtn: {
        padding: 6,
        borderRadius: 999,
        backgroundColor: 'rgba(255,255,255,0.12)',
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
