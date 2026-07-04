import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Card, EmptyState } from '../../components/ui';
import { CategoryIcon } from '../../components/CategoryIcon';
import { TransactionForm } from '../../components/TransactionForm';
import { formatCurrency } from '../../utils/currency';
import { spacing, radius } from '../../theme';

const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

export default function DashboardScreen() {
    const { accounts, transactions, categories, isLoading, refresh } = useData();
    const { user } = useAuth();
    const { theme } = useTheme();
    const [showForm, setShowForm] = useState(false);
    const currency = user?.currency || 'INR';

    const { netWorth, monthIncome, monthExpense, recent, sixMonths } = useMemo(() => {
        const netWorth = accounts.reduce((sum, a) => sum + a.balance, 0);
        const nowKey = monthKey(new Date());

        let monthIncome = 0;
        let monthExpense = 0;
        for (const t of transactions) {
            if (t.date.startsWith(nowKey)) {
                if (t.type === 'income') monthIncome += t.amount;
                if (t.type === 'expense') monthExpense += t.amount;
            }
        }

        // Last 6 months income/expense for the mini bar chart
        const sixMonths: { label: string; income: number; expense: number }[] = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            const key = monthKey(d);
            let income = 0;
            let expense = 0;
            for (const t of transactions) {
                if (t.date.startsWith(key)) {
                    if (t.type === 'income') income += t.amount;
                    if (t.type === 'expense') expense += t.amount;
                }
            }
            sixMonths.push({ label: d.toLocaleString('default', { month: 'short' }), income, expense });
        }

        return { netWorth, monthIncome, monthExpense, recent: transactions.slice(0, 6), sixMonths };
    }, [accounts, transactions]);

    const maxBar = Math.max(1, ...sixMonths.flatMap(m => [m.income, m.expense]));

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['top']}>
            <ScrollView
                contentContainerStyle={styles.container}
                refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refresh} tintColor={theme.colors.primary} />}
            >
                <View style={styles.headerRow}>
                    <View>
                        <Text style={[styles.greeting, { color: theme.colors.textSecondary }]}>Hi {user?.name?.split(' ')[0] || 'there'} 👋</Text>
                        <Text style={[styles.title, { color: theme.colors.text }]}>Dashboard</Text>
                    </View>
                    <TouchableOpacity
                        onPress={() => setShowForm(true)}
                        style={[styles.addButton, { backgroundColor: theme.colors.primary }]}
                    >
                        <MaterialCommunityIcons name="plus" size={24} color="#fff" />
                    </TouchableOpacity>
                </View>

                {/* Net worth */}
                <Card style={{ marginBottom: spacing.md }}>
                    <Text style={[styles.cardLabel, { color: theme.colors.textSecondary }]}>Net Worth</Text>
                    <Text style={[styles.netWorth, { color: theme.colors.text }]}>{formatCurrency(netWorth, currency)}</Text>
                    <Text style={{ color: theme.colors.textTertiary, fontSize: 12 }}>
                        Across {accounts.length} account{accounts.length === 1 ? '' : 's'}
                    </Text>
                </Card>

                {/* This month income / expense */}
                <View style={styles.row}>
                    <Card style={{ flex: 1 }}>
                        <Text style={[styles.cardLabel, { color: theme.colors.textSecondary }]}>Income</Text>
                        <Text style={[styles.statValue, { color: theme.colors.success }]}>
                            +{formatCurrency(monthIncome, currency)}
                        </Text>
                        <Text style={{ color: theme.colors.textTertiary, fontSize: 11 }}>this month</Text>
                    </Card>
                    <Card style={{ flex: 1 }}>
                        <Text style={[styles.cardLabel, { color: theme.colors.textSecondary }]}>Expenses</Text>
                        <Text style={[styles.statValue, { color: theme.colors.danger }]}>
                            -{formatCurrency(monthExpense, currency)}
                        </Text>
                        <Text style={{ color: theme.colors.textTertiary, fontSize: 11 }}>this month</Text>
                    </Card>
                </View>

                {/* 6-month trend */}
                <Card style={{ marginTop: spacing.md }}>
                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Last 6 months</Text>
                    <View style={styles.chart}>
                        {sixMonths.map(m => (
                            <View key={m.label} style={styles.chartGroup}>
                                <View style={styles.chartBars}>
                                    <View
                                        style={{
                                            width: 10,
                                            borderRadius: 3,
                                            height: Math.max(3, (m.income / maxBar) * 90),
                                            backgroundColor: theme.colors.success,
                                        }}
                                    />
                                    <View
                                        style={{
                                            width: 10,
                                            borderRadius: 3,
                                            height: Math.max(3, (m.expense / maxBar) * 90),
                                            backgroundColor: theme.colors.danger,
                                        }}
                                    />
                                </View>
                                <Text style={{ color: theme.colors.textTertiary, fontSize: 11 }}>{m.label}</Text>
                            </View>
                        ))}
                    </View>
                    <View style={styles.legend}>
                        <View style={[styles.legendDot, { backgroundColor: theme.colors.success }]} />
                        <Text style={{ color: theme.colors.textSecondary, fontSize: 12, marginRight: spacing.md }}>Income</Text>
                        <View style={[styles.legendDot, { backgroundColor: theme.colors.danger }]} />
                        <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>Expenses</Text>
                    </View>
                </Card>

                {/* Recent transactions */}
                <Card style={{ marginTop: spacing.md }}>
                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Recent transactions</Text>
                    {recent.length === 0 ? (
                        <EmptyState icon="swap-horizontal" title="No transactions yet" subtitle="Tap + to add your first transaction" />
                    ) : (
                        recent.map(t => {
                            const cat = categories.find(c => c.id === t.categoryId);
                            const isIncome = t.type === 'income';
                            return (
                                <View key={t.id} style={[styles.txRow, { borderBottomColor: theme.colors.separator }]}>
                                    <CategoryIcon name={t.type === 'transfer' ? 'CreditCard' : cat?.icon} size={16} />
                                    <View style={{ flex: 1, marginLeft: spacing.sm }}>
                                        <Text style={{ color: theme.colors.text, fontWeight: '600' }} numberOfLines={1}>
                                            {t.description}
                                        </Text>
                                        <Text style={{ color: theme.colors.textTertiary, fontSize: 12 }}>
                                            {t.date.split('T')[0]}{cat ? ` · ${cat.name}` : ''}
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
                                </View>
                            );
                        })
                    )}
                </Card>

                <View style={{ height: spacing.xl }} />
            </ScrollView>

            <TransactionForm visible={showForm} onClose={() => setShowForm(false)} />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: spacing.md,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    greeting: {
        fontSize: 14,
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
    cardLabel: {
        fontSize: 13,
        fontWeight: '500',
        marginBottom: 4,
    },
    netWorth: {
        fontSize: 30,
        fontWeight: '800',
        marginBottom: 4,
    },
    row: {
        flexDirection: 'row',
        gap: spacing.md,
    },
    statValue: {
        fontSize: 17,
        fontWeight: '700',
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: spacing.md,
    },
    chart: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        height: 110,
        paddingHorizontal: spacing.xs,
    },
    chartGroup: {
        alignItems: 'center',
        gap: 6,
    },
    chartBars: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 3,
    },
    legend: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: spacing.md,
    },
    legendDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 4,
    },
    txRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
});
