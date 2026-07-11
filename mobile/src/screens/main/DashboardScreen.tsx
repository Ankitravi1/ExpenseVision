import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { PieChart } from 'react-native-chart-kit';
import { useNavigation } from '@react-navigation/native';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Card, EmptyState } from '../../components/ui';
import { CategoryIcon } from '../../components/CategoryIcon';
import { ScreenHeader } from '../../components/ScreenHeader';
import { formatCurrency } from '../../utils/currency';
import { isoDateToDisplay } from '../../utils/date';
import { spacing, radius } from '../../theme';

// Fixed palette for the expense donut / category list (mirrors ReportsScreen).
const CATEGORY_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#f43f5e', '#3b82f6', '#8b5cf6', '#ec4899', '#64748b', '#14b8a6', '#94a3b8'];

// Trend semantics differ by card type: a rising expense is unfavorable (red),
// whereas rising income / net flow is favorable (green).
const StatCard: React.FC<{
    title: string;
    amount: number;
    change: number;
    type: 'income' | 'expense' | 'net';
    currency: string;
}> = ({ title, amount, change, type, currency }) => {
    const { theme } = useTheme();
    const isPositiveChange = change >= 0;
    const isFavorable = type === 'expense' ? change <= 0 : change >= 0;
    const trendColor = isFavorable ? theme.colors.success : theme.colors.danger;
    const valueColor =
        type === 'income' ? theme.colors.success :
        type === 'expense' ? theme.colors.danger :
        theme.colors.primary;
    const icon = type === 'income' ? 'trending-up' : type === 'expense' ? 'trending-down' : 'wallet-outline';

    return (
        <Card style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Text style={[styles.cardLabel, { color: theme.colors.textSecondary }]}>{title}</Text>
                <MaterialCommunityIcons name={icon as any} size={18} color={valueColor} />
            </View>
            <Text style={[styles.statValue, { color: valueColor }]} numberOfLines={1} adjustsFontSizeToFit>
                {formatCurrency(amount, currency)}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                <MaterialCommunityIcons
                    name={isPositiveChange ? 'arrow-up' : 'arrow-down'}
                    size={12}
                    color={trendColor}
                />
                <Text style={{ color: trendColor, fontSize: 11, fontWeight: '700' }}>{Math.abs(change)}%</Text>
                <Text style={{ color: theme.colors.textTertiary, fontSize: 11, marginLeft: 4 }}>vs last month</Text>
            </View>
        </Card>
    );
};

export default function DashboardScreen() {
    const { accounts, transactions, categories, isLoading, refresh } = useData();
    const { user } = useAuth();
    const { theme } = useTheme();
    const navigation = useNavigation();
    const currency = user?.currency || 'INR';

    const now = new Date();
    const [currentDate, setCurrentDate] = useState(new Date(now.getFullYear(), now.getMonth(), 1));

    const isAtCurrentMonth =
        currentDate.getFullYear() === now.getFullYear() && currentDate.getMonth() === now.getMonth();

    const changeMonth = (offset: number) => {
        setCurrentDate(prev => {
            // Anchor to the 1st so month arithmetic never overflows month-end.
            const next = new Date(prev.getFullYear(), prev.getMonth() + offset, 1);
            const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
            return next > currentMonthStart ? currentMonthStart : next;
        });
    };

    // Frozen accounts are excluded from account-level aggregates (net worth,
    // accounts summary) — transaction-level lists/charts below are untouched.
    const activeAccounts = useMemo(() => accounts.filter(a => !a.frozen), [accounts]);
    const netWorth = useMemo(() => activeAccounts.reduce((sum, a) => sum + a.balance, 0), [activeAccounts]);

    const { totalIncome, totalExpenses, netFlow, incomeChange, expenseChange, netFlowChange, recent, expenseByCategory } = useMemo(() => {
        const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const currentMonthKey = monthKey(currentDate);
        const lastMonthKey = monthKey(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));

        // Compare by the YYYY-MM prefix of the date-only portion (never new Date()).
        const inMonth = (t: (typeof transactions)[number], key: string) => t.date.substring(0, 10).slice(0, 7) === key;
        const sumType = (key: string, type: 'income' | 'expense') =>
            transactions.filter(t => t.type === type && inMonth(t, key)).reduce((s, t) => s + t.amount, 0);

        const totalIncome = sumType(currentMonthKey, 'income');
        const totalExpenses = sumType(currentMonthKey, 'expense');
        const netFlow = totalIncome - totalExpenses;

        const lastIncome = sumType(lastMonthKey, 'income');
        const lastExpenses = sumType(lastMonthKey, 'expense');
        const lastNet = lastIncome - lastExpenses;

        const calcChange = (cur: number, prev: number) => {
            if (prev === 0) return cur > 0 ? 100 : 0;
            return Math.round(((cur - prev) / prev) * 100);
        };

        const recent = [...transactions]
            .sort((a, b) => b.date.substring(0, 10).localeCompare(a.date.substring(0, 10)))
            .slice(0, 6);

        const byCat: Record<string, number> = {};
        for (const t of transactions) {
            if (t.type !== 'expense' || !inMonth(t, currentMonthKey)) continue;
            const name = categories.find(c => c.id === t.categoryId)?.name || 'Uncategorized';
            byCat[name] = (byCat[name] || 0) + t.amount;
        }
        const expenseByCategory = (Object.entries(byCat) as [string, number][])
            .sort(([, a], [, b]) => b - a)
            .map(([name, value]) => ({ name, value }));

        return {
            totalIncome, totalExpenses, netFlow,
            incomeChange: calcChange(totalIncome, lastIncome),
            expenseChange: calcChange(totalExpenses, lastExpenses),
            netFlowChange: calcChange(netFlow, lastNet),
            recent, expenseByCategory,
        };
    }, [transactions, categories, currentDate]);

    const chartWidth = Dimensions.get('window').width - spacing.md * 4;
    const donutSize = 130;
    const pieData = expenseByCategory.map((c, i) => ({
        name: c.name,
        amount: c.value,
        color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
        legendFontColor: theme.colors.textSecondary,
        legendFontSize: 12,
    }));

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['top']}>
            <ScreenHeader title="Dashboard" />
            <ScrollView
                contentContainerStyle={styles.container}
                refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refresh} tintColor={theme.colors.primary} />}
            >
                {/* Month navigator */}
                <View style={[styles.monthNav, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}>
                    <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.monthNavBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <MaterialCommunityIcons name="chevron-left" size={24} color={theme.colors.textSecondary} />
                    </TouchableOpacity>
                    <Text style={[styles.monthLabel, { color: theme.colors.text }]}>
                        {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                    </Text>
                    <TouchableOpacity
                        onPress={() => changeMonth(1)}
                        disabled={isAtCurrentMonth}
                        style={[styles.monthNavBtn, { opacity: isAtCurrentMonth ? 0.3 : 1 }]}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                        <MaterialCommunityIcons name="chevron-right" size={24} color={theme.colors.textSecondary} />
                    </TouchableOpacity>
                </View>

                {/* Net worth */}
                <Card style={{ marginBottom: spacing.md }}>
                    <Text style={[styles.cardLabel, { color: theme.colors.textSecondary }]}>Net Worth</Text>
                    <Text style={[styles.netWorth, { color: theme.colors.text }]}>{formatCurrency(netWorth, currency)}</Text>
                    <Text style={{ color: theme.colors.textTertiary, fontSize: 12 }}>
                        Across {activeAccounts.length} account{activeAccounts.length === 1 ? '' : 's'}
                    </Text>
                </Card>

                {/* Stat cards with % change vs previous month */}
                <View style={styles.row}>
                    <StatCard title="Expenses" amount={totalExpenses} change={expenseChange} type="expense" currency={currency} />
                    <StatCard title="Income" amount={totalIncome} change={incomeChange} type="income" currency={currency} />
                </View>
                <View style={{ marginTop: spacing.md }}>
                    <StatCard title="Balance (net flow)" amount={netFlow} change={netFlowChange} type="net" currency={currency} />
                </View>

                {/* Expense distribution donut */}
                <Card style={{ marginTop: spacing.md }}>
                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Expense Distribution</Text>
                    {expenseByCategory.length === 0 ? (
                        <EmptyState icon="chart-pie" title="No expenses this month" />
                    ) : (
                        <>
                            <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                                <PieChart
                                    data={pieData}
                                    width={chartWidth}
                                    height={200}
                                    chartConfig={{ color: () => theme.colors.text }}
                                    accessor="amount"
                                    backgroundColor="transparent"
                                    paddingLeft={String(chartWidth / 4)}
                                    hasLegend={false}
                                    absolute
                                />
                                {/* Center overlay converts the pie into a donut */}
                                <View
                                    pointerEvents="none"
                                    style={[
                                        styles.donutCenter,
                                        {
                                            width: donutSize,
                                            height: donutSize,
                                            borderRadius: donutSize / 2,
                                            backgroundColor: theme.colors.card,
                                        },
                                    ]}
                                >
                                    <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: '800' }} numberOfLines={1} adjustsFontSizeToFit>
                                        {formatCurrency(totalExpenses, currency)}
                                    </Text>
                                    <Text style={{ color: theme.colors.textTertiary, fontSize: 10, fontWeight: '700', letterSpacing: 0.5, marginTop: 2 }}>
                                        TOTAL SPENT
                                    </Text>
                                </View>
                            </View>

                            {/* Category breakdown list */}
                            <View style={{ marginTop: spacing.md }}>
                                {expenseByCategory.map((cat, i) => {
                                    const color = CATEGORY_COLORS[i % CATEGORY_COLORS.length];
                                    const category = categories.find(c => c.name === cat.name);
                                    const pct = totalExpenses > 0 ? ((cat.value / totalExpenses) * 100).toFixed(1) : '0';
                                    return (
                                        <View key={cat.name} style={styles.catRow}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                                <View style={[styles.catDot, { backgroundColor: color }]} />
                                                <CategoryIcon name={category?.icon} size={14} />
                                                <Text style={{ color: theme.colors.text, fontWeight: '600', marginLeft: spacing.sm }} numberOfLines={1}>
                                                    {cat.name}
                                                </Text>
                                            </View>
                                            <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }}>
                                                {formatCurrency(cat.value, currency)} · {pct}%
                                            </Text>
                                        </View>
                                    );
                                })}
                            </View>
                        </>
                    )}
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
                                            {t.note}
                                        </Text>
                                        <Text style={{ color: theme.colors.textTertiary, fontSize: 12 }}>
                                            {isoDateToDisplay(t.date)}{cat ? ` · ${cat.name}` : ''}
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

                {/* Accounts summary */}
                <Card style={{ marginTop: spacing.md }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
                        <Text style={[styles.sectionTitle, { color: theme.colors.text, marginBottom: 0 }]}>Accounts Summary</Text>
                        <TouchableOpacity onPress={() => (navigation as any).navigate('Accounts')}>
                            <Text style={{ color: theme.colors.primary, fontWeight: '600', fontSize: 13 }}>Manage</Text>
                        </TouchableOpacity>
                    </View>
                    {activeAccounts.length === 0 ? (
                        <EmptyState icon="wallet-outline" title="No accounts yet" />
                    ) : (
                        activeAccounts.map(acc => {
                            let accIcon: keyof typeof MaterialCommunityIcons.glyphMap = 'wallet-outline';
                            const type = acc.type.toLowerCase();
                            if (type.includes('savings') || type.includes('piggy')) accIcon = 'piggy-bank-outline';
                            else if (type.includes('credit')) accIcon = 'credit-card-outline';
                            else if (type.includes('bank') || type.includes('checking')) accIcon = 'bank-outline';
                            return (
                                <View key={acc.id} style={[styles.accRow, { backgroundColor: theme.colors.background, borderColor: theme.colors.cardBorder }]}>
                                    <View style={[styles.accIcon, { backgroundColor: theme.colors.primaryLight }]}>
                                        <MaterialCommunityIcons name={accIcon} size={16} color={theme.colors.primary} />
                                    </View>
                                    <View style={{ flex: 1, marginLeft: spacing.sm }}>
                                        <Text style={{ color: theme.colors.text, fontWeight: '600', fontSize: 13 }} numberOfLines={1}>{acc.name}</Text>
                                        <Text style={{ color: theme.colors.textTertiary, fontSize: 11 }} numberOfLines={1}>{acc.type}</Text>
                                    </View>
                                    <Text style={{ fontWeight: '700', fontSize: 13, color: acc.balance < 0 ? theme.colors.danger : theme.colors.text }}>
                                        {formatCurrency(acc.balance, currency)}
                                    </Text>
                                </View>
                            );
                        })
                    )}
                </Card>

                <View style={{ height: spacing.xl }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: spacing.md,
    },
    monthNav: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderRadius: radius.md,
        paddingHorizontal: spacing.sm,
        paddingVertical: 4,
        marginBottom: spacing.md,
    },
    monthNavBtn: {
        padding: spacing.xs,
    },
    monthLabel: {
        fontSize: 15,
        fontWeight: '700',
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
        fontSize: 20,
        fontWeight: '800',
        marginTop: 2,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: spacing.md,
    },
    donutCenter: {
        position: 'absolute',
        alignItems: 'center',
        justifyContent: 'center',
    },
    catRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 8,
    },
    catDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginRight: spacing.sm,
    },
    txRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    accRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.sm,
        borderRadius: radius.md,
        borderWidth: 1,
        marginBottom: spacing.sm,
    },
    accIcon: {
        width: 32,
        height: 32,
        borderRadius: radius.sm,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
