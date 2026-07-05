import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Card, EmptyState, lightHaptic } from '../../components/ui';
import { CategoryIcon } from '../../components/CategoryIcon';
import { formatCurrency } from '../../utils/currency';
import { spacing, radius } from '../../theme';

const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

const monthLabel = (key: string) => {
    const [y, m] = key.split('-').map(Number);
    return new Date(y, m - 1, 1).toLocaleString('default', { month: 'long', year: 'numeric' });
};

const shiftMonth = (key: string, delta: number) => {
    const [y, m] = key.split('-').map(Number);
    return monthKey(new Date(y, m - 1 + delta, 1));
};

export default function ReportsScreen() {
    const { transactions, categories, budgets } = useData();
    const { user } = useAuth();
    const { theme } = useTheme();
    const navigation = useNavigation();
    const currency = user?.currency || 'INR';
    const currentMonth = monthKey(new Date());
    const [month, setMonth] = useState(currentMonth);
    const prevMonth = shiftMonth(month, -1);

    const report = useMemo(() => {
        const spentByCategory = (m: string) => {
            const map = new Map<string, number>();
            let total = 0;
            let income = 0;
            for (const t of transactions) {
                if (!t.date.startsWith(m)) continue;
                if (t.type === 'income') income += t.amount;
                if (t.type !== 'expense') continue;
                total += t.amount;
                const key = t.categoryId || 'uncategorized';
                map.set(key, (map.get(key) || 0) + t.amount);
            }
            return { map, total, income };
        };

        const cur = spentByCategory(month);
        const prev = spentByCategory(prevMonth);

        // Category rows sorted by spend
        const rows = [...cur.map.entries()]
            .map(([categoryId, amount]) => ({
                categoryId,
                category: categories.find(c => c.id === categoryId),
                amount,
                share: cur.total > 0 ? amount / cur.total : 0,
            }))
            .sort((a, b) => b.amount - a.amount);

        // Insight 1: biggest category change vs previous month
        let biggestChange: { name: string; icon?: string; delta: number } | null = null;
        const allCatIds = new Set([...cur.map.keys(), ...prev.map.keys()]);
        for (const id of allCatIds) {
            const delta = (cur.map.get(id) || 0) - (prev.map.get(id) || 0);
            if (!biggestChange || Math.abs(delta) > Math.abs(biggestChange.delta)) {
                const c = categories.find(x => x.id === id);
                biggestChange = { name: c?.name || 'Uncategorized', icon: c?.icon, delta };
            }
        }

        // Insight 2: spending pace vs total budget (only for the current month)
        let pace: { projected: number; totalBudget: number } | null = null;
        if (month === currentMonth) {
            const totalBudget = budgets.reduce((sum, b) => sum + (b.effectiveAmount ?? b.amount), 0);
            if (totalBudget > 0) {
                const now = new Date();
                const daysElapsed = now.getDate();
                const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
                pace = { projected: (cur.total / daysElapsed) * daysInMonth, totalBudget };
            }
        }

        // Insight 3: total vs previous month
        const totalDeltaPct = prev.total > 0 ? ((cur.total - prev.total) / prev.total) * 100 : null;

        return { rows, total: cur.total, income: cur.income, prevTotal: prev.total, biggestChange, pace, totalDeltaPct };
    }, [transactions, categories, budgets, month, prevMonth, currentMonth]);

    const barColors = [theme.colors.primary, theme.colors.success, theme.colors.warning, theme.colors.danger];

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={theme.colors.text} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: theme.colors.text }]}>Reports</Text>
                <View style={{ width: 24 }} />
            </View>

            {/* Month navigator */}
            <View style={styles.monthRow}>
                <TouchableOpacity
                    onPress={() => {
                        lightHaptic();
                        setMonth(shiftMonth(month, -1));
                    }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                    <MaterialCommunityIcons name="chevron-left" size={26} color={theme.colors.textSecondary} />
                </TouchableOpacity>
                <Text style={{ color: theme.colors.text, fontWeight: '700', fontSize: 15 }}>{monthLabel(month)}</Text>
                <TouchableOpacity
                    onPress={() => {
                        if (month >= currentMonth) return;
                        lightHaptic();
                        setMonth(shiftMonth(month, 1));
                    }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={{ opacity: month < currentMonth ? 1 : 0.3 }}
                >
                    <MaterialCommunityIcons name="chevron-right" size={26} color={theme.colors.textSecondary} />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: spacing.md, paddingTop: 0 }}>
                {/* Totals */}
                <View style={{ flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md }}>
                    <Card style={{ flex: 1 }}>
                        <Text style={[styles.cardLabel, { color: theme.colors.textSecondary }]}>Spent</Text>
                        <Text style={{ color: theme.colors.danger, fontWeight: '800', fontSize: 18 }}>
                            {formatCurrency(report.total, currency)}
                        </Text>
                    </Card>
                    <Card style={{ flex: 1 }}>
                        <Text style={[styles.cardLabel, { color: theme.colors.textSecondary }]}>Income</Text>
                        <Text style={{ color: theme.colors.success, fontWeight: '800', fontSize: 18 }}>
                            {formatCurrency(report.income, currency)}
                        </Text>
                    </Card>
                </View>

                {/* Insights */}
                <Card style={{ marginBottom: spacing.md }}>
                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Insights</Text>

                    {report.totalDeltaPct !== null ? (
                        <View style={styles.insightRow}>
                            <MaterialCommunityIcons
                                name={report.totalDeltaPct >= 0 ? 'trending-up' : 'trending-down'}
                                size={20}
                                color={report.totalDeltaPct >= 0 ? theme.colors.danger : theme.colors.success}
                            />
                            <Text style={[styles.insightText, { color: theme.colors.textSecondary }]}>
                                Spending is {Math.abs(report.totalDeltaPct).toFixed(0)}% {report.totalDeltaPct >= 0 ? 'higher' : 'lower'} than {monthLabel(prevMonth)} ({formatCurrency(report.prevTotal, currency)})
                            </Text>
                        </View>
                    ) : null}

                    {report.biggestChange && report.biggestChange.delta !== 0 ? (
                        <View style={styles.insightRow}>
                            <CategoryIcon name={report.biggestChange.icon} size={14} />
                            <Text style={[styles.insightText, { color: theme.colors.textSecondary }]}>
                                Biggest change: {report.biggestChange.name} ({report.biggestChange.delta > 0 ? '+' : '−'}{formatCurrency(Math.abs(report.biggestChange.delta), currency)} vs last month)
                            </Text>
                        </View>
                    ) : null}

                    {report.pace ? (
                        <View style={styles.insightRow}>
                            <MaterialCommunityIcons
                                name="speedometer"
                                size={20}
                                color={report.pace.projected > report.pace.totalBudget ? theme.colors.danger : theme.colors.success}
                            />
                            <Text style={[styles.insightText, { color: theme.colors.textSecondary }]}>
                                At this pace you'll spend ~{formatCurrency(report.pace.projected, currency)} this month ({report.pace.projected > report.pace.totalBudget ? 'over' : 'within'} your {formatCurrency(report.pace.totalBudget, currency)} total budget)
                            </Text>
                        </View>
                    ) : null}

                    {report.totalDeltaPct === null && (!report.biggestChange || report.biggestChange.delta === 0) && !report.pace ? (
                        <Text style={{ color: theme.colors.textTertiary, fontSize: 13 }}>
                            Not enough data yet — insights appear once you have transactions in two months.
                        </Text>
                    ) : null}
                </Card>

                {/* Category breakdown */}
                <Card>
                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Spending by category</Text>
                    {report.rows.length === 0 ? (
                        <EmptyState icon="chart-pie" title="No expenses this month" />
                    ) : (
                        report.rows.map((row, i) => (
                            <View key={row.categoryId} style={{ marginBottom: spacing.md }}>
                                <View style={styles.catHeader}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                        <CategoryIcon name={row.category?.icon} size={14} />
                                        <Text style={{ color: theme.colors.text, fontWeight: '600', marginLeft: spacing.sm }} numberOfLines={1}>
                                            {row.category?.name || 'Uncategorized'}
                                        </Text>
                                    </View>
                                    <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }}>
                                        {formatCurrency(row.amount, currency)} · {(row.share * 100).toFixed(0)}%
                                    </Text>
                                </View>
                                <View style={[styles.track, { backgroundColor: theme.colors.separator }]}>
                                    <View
                                        style={[
                                            styles.fill,
                                            { width: `${Math.max(2, row.share * 100)}%`, backgroundColor: barColors[i % barColors.length] },
                                        ]}
                                    />
                                </View>
                            </View>
                        ))
                    )}
                </Card>

                <View style={{ height: spacing.xl }} />
            </ScrollView>
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
        fontSize: 20,
        fontWeight: '800',
    },
    monthRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.md,
    },
    cardLabel: {
        fontSize: 13,
        fontWeight: '500',
        marginBottom: 4,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: spacing.md,
    },
    insightRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing.sm,
        marginBottom: spacing.sm,
    },
    insightText: {
        flex: 1,
        fontSize: 13,
        lineHeight: 19,
    },
    catHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    track: {
        height: 8,
        borderRadius: 4,
        overflow: 'hidden',
    },
    fill: {
        height: 8,
        borderRadius: 4,
    },
});
