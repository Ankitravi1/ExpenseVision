import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { CategoryIcon } from '../../components/CategoryIcon';
import { SheetModal, EmptyState } from '../../components/ui';
import { formatCurrency } from '../../utils/currency';
import { isoDateToDisplay } from '../../utils/date';
import { spacing, radius } from '../../theme';
import { Account, Category, Transaction } from '../../types';

export type AccountStats = {
    account: Account;
    income: number;
    expense: number;
    transferIn: number;
    transferOut: number;
    periodNet: number;
    incomePct: number;
    expensePct: number;
    txs: Transaction[];
};

const StatBox: React.FC<{ label: string; value: string; color: string; sub?: string }> = ({ label, value, color, sub }) => {
    const { theme } = useTheme();
    return (
        <View style={[styles.statBox, { borderColor: theme.colors.cardBorder }]}>
            <Text style={{ color: theme.colors.textTertiary, fontSize: 9, fontWeight: '700', letterSpacing: 0.5 }} numberOfLines={1}>
                {label.toUpperCase()}
            </Text>
            <Text style={{ color, fontSize: 15, fontWeight: '800', marginTop: 3 }} numberOfLines={1}>
                {value}
            </Text>
            {sub ? <Text style={{ color: theme.colors.textTertiary, fontSize: 10, marginTop: 1 }}>{sub}</Text> : null}
        </View>
    );
};

export const AccountsSummary: React.FC<{
    stats: AccountStats[];
    accounts: Account[];
    categories: Category[];
    currency: string;
}> = ({ stats, accounts, categories, currency }) => {
    const { theme } = useTheme();
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const selected = stats.find(s => s.account.id === selectedId) || null;

    if (accounts.length === 0) {
        return <EmptyState icon="bank-outline" title="No accounts yet" />;
    }

    // Bar scale: relative to the largest income/expense across accounts.
    const maxVal = Math.max(1, ...stats.map(s => Math.max(s.income, s.expense)));

    return (
        <View>
            {stats.map(s => {
                const { account, income, expense, transferIn, transferOut } = s;
                const hasTransfer = transferIn > 0 || transferOut > 0;
                return (
                    <TouchableOpacity
                        key={account.id}
                        activeOpacity={0.7}
                        onPress={() => setSelectedId(account.id)}
                        style={[styles.accountRow, { borderColor: theme.colors.cardBorder }]}
                    >
                        <View style={styles.accountHeader}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 0 }}>
                                <CategoryIcon name={account.icon || 'Wallet'} size={14} />
                                <Text style={{ color: theme.colors.text, fontWeight: '700', marginLeft: spacing.sm, flexShrink: 1 }} numberOfLines={1}>
                                    {account.name}
                                </Text>
                            </View>
                            <Text style={{ color: theme.colors.primary, fontWeight: '800', fontSize: 13 }}>
                                {formatCurrency(account.balance, currency)}
                            </Text>
                        </View>

                        {/* Income bar */}
                        <View style={styles.barLine}>
                            <View style={[styles.track, { backgroundColor: theme.colors.separator }]}>
                                <View style={[styles.fill, { width: `${(income / maxVal) * 100}%`, backgroundColor: theme.colors.success }]} />
                            </View>
                            <Text style={[styles.barVal, { color: theme.colors.success }]} numberOfLines={1}>
                                +{formatCurrency(income, currency)}
                            </Text>
                        </View>
                        {/* Expense bar */}
                        <View style={styles.barLine}>
                            <View style={[styles.track, { backgroundColor: theme.colors.separator }]}>
                                <View style={[styles.fill, { width: `${(expense / maxVal) * 100}%`, backgroundColor: theme.colors.danger }]} />
                            </View>
                            <Text style={[styles.barVal, { color: theme.colors.danger }]} numberOfLines={1}>
                                −{formatCurrency(expense, currency)}
                            </Text>
                        </View>
                        {hasTransfer ? (
                            <Text style={{ color: theme.colors.textTertiary, fontSize: 11, marginTop: 4 }}>
                                Transfers: +{formatCurrency(transferIn, currency)} / −{formatCurrency(transferOut, currency)}
                            </Text>
                        ) : null}
                    </TouchableOpacity>
                );
            })}

            <SheetModal
                visible={!!selected}
                title={selected?.account.name || 'Account'}
                onClose={() => setSelectedId(null)}
            >
                {selected ? (
                    <View>
                        <View style={styles.statGrid}>
                            <StatBox label="Initial" value={formatCurrency(selected.account.initialBalance, currency)} color={theme.colors.text} />
                            <StatBox label="Balance" value={formatCurrency(selected.account.balance, currency)} color={theme.colors.primary} />
                            <StatBox
                                label="Income"
                                value={`+${formatCurrency(selected.income, currency)}`}
                                color={theme.colors.success}
                                sub={`${selected.incomePct.toFixed(0)}% of period`}
                            />
                            <StatBox
                                label="Expense"
                                value={`−${formatCurrency(selected.expense, currency)}`}
                                color={theme.colors.danger}
                                sub={`${selected.expensePct.toFixed(0)}% of period`}
                            />
                            <StatBox label="Transfer In" value={`+${formatCurrency(selected.transferIn, currency)}`} color="#3b82f6" />
                            <StatBox label="Transfer Out" value={`−${formatCurrency(selected.transferOut, currency)}`} color={theme.colors.warning} />
                        </View>

                        <Text style={{ color: theme.colors.text, fontWeight: '700', fontSize: 15, marginTop: spacing.md, marginBottom: spacing.sm }}>
                            Transactions ({selected.txs.length})
                        </Text>
                        {selected.txs.length === 0 ? (
                            <Text style={{ color: theme.colors.textTertiary, fontSize: 13, paddingVertical: spacing.md }}>
                                No transactions for this account in the selected period.
                            </Text>
                        ) : (
                            selected.txs.map(t => {
                                const cat = categories.find(c => c.id === t.categoryId);
                                const isOut = t.type === 'expense' || (t.type === 'transfer' && t.accountId === selected.account.id);
                                const other = t.type === 'transfer'
                                    ? accounts.find(a => a.id === (t.accountId === selected.account.id ? t.transferToAccountId : t.accountId))
                                    : null;
                                const label = t.type === 'transfer'
                                    ? (t.accountId === selected.account.id ? `To ${other?.name || 'account'}` : `From ${other?.name || 'account'}`)
                                    : (t.note || cat?.name || t.type);
                                return (
                                    <View key={t.id} style={[styles.txRow, { borderBottomColor: theme.colors.separator }]}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 0 }}>
                                            <MaterialCommunityIcons
                                                name={isOut ? 'arrow-up-circle-outline' : 'arrow-down-circle-outline'}
                                                size={18}
                                                color={isOut ? theme.colors.danger : theme.colors.success}
                                            />
                                            <View style={{ marginLeft: spacing.sm, flexShrink: 1 }}>
                                                <Text style={{ color: theme.colors.text, fontSize: 13, fontWeight: '600' }} numberOfLines={1}>
                                                    {label}
                                                </Text>
                                                <Text style={{ color: theme.colors.textTertiary, fontSize: 11 }}>
                                                    {isoDateToDisplay(t.date)}
                                                </Text>
                                            </View>
                                        </View>
                                        <Text style={{ color: isOut ? theme.colors.danger : theme.colors.success, fontWeight: '700', fontSize: 13 }}>
                                            {isOut ? '−' : '+'}{formatCurrency(t.amount, currency)}
                                        </Text>
                                    </View>
                                );
                            })
                        )}
                    </View>
                ) : null}
            </SheetModal>
        </View>
    );
};

const styles = StyleSheet.create({
    accountRow: {
        borderWidth: 1,
        borderRadius: radius.md,
        padding: spacing.md,
        marginBottom: spacing.sm,
    },
    accountHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.sm,
    },
    barLine: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    track: {
        flex: 1,
        height: 8,
        borderRadius: 4,
        overflow: 'hidden',
        marginRight: spacing.sm,
    },
    fill: {
        height: 8,
        borderRadius: 4,
    },
    barVal: {
        fontSize: 12,
        fontWeight: '700',
        width: 96,
        textAlign: 'right',
    },
    statGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    statBox: {
        width: '47%',
        flexGrow: 1,
        borderWidth: 1,
        borderRadius: radius.md,
        padding: spacing.sm,
    },
    txRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 10,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
});
