import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Card, ChipSelector, DateField, lightHaptic } from '../../components/ui';
import { formatCurrency } from '../../utils/currency';
import { spacing, radius } from '../../theme';
import { Transaction } from '../../types';
import { shareReportCsv } from '../../utils/exportCsv';
import { CategoryDonut, DonutSlice } from '../../components/reports/CategoryDonut';
import { MoneyCalendar } from '../../components/reports/MoneyCalendar';
import { FlowChart } from '../../components/reports/FlowChart';
import { AccountsSummary, AccountStats } from '../../components/reports/AccountsSummary';
import {
    ViewMode,
    getLocalDateString,
    parseLocalDate,
    dayPart,
    rangeForViewMode,
    shiftRange,
    periodLabel,
    csvField,
} from '../../components/reports/helpers';

const VIEW_MODES: ViewMode[] = ['Daily', 'Weekly', 'Monthly', '3 Month', 'Yearly', 'Custom'];

// A collapsible titled section wrapper.
const Section: React.FC<{ title: string; subtitle?: string; children: React.ReactNode; defaultOpen?: boolean }> = ({
    title,
    subtitle,
    children,
    defaultOpen = true,
}) => {
    const { theme } = useTheme();
    const [open, setOpen] = useState(defaultOpen);
    return (
        <Card style={{ marginBottom: spacing.md, padding: 0, overflow: 'hidden' }}>
            <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                    lightHaptic();
                    setOpen(o => !o);
                }}
                style={styles.sectionHeader}
            >
                <View style={{ flex: 1 }}>
                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{title}</Text>
                    {subtitle ? <Text style={{ color: theme.colors.textTertiary, fontSize: 11, marginTop: 2 }}>{subtitle}</Text> : null}
                </View>
                <MaterialCommunityIcons name={open ? 'chevron-up' : 'chevron-down'} size={22} color={theme.colors.textTertiary} />
            </TouchableOpacity>
            {open ? <View style={{ padding: spacing.md, paddingTop: 0 }}>{children}</View> : null}
        </Card>
    );
};

const StatCard: React.FC<{
    label: string;
    value: string;
    icon: keyof typeof MaterialCommunityIcons.glyphMap;
    rgb: string;
    color: string;
}> = ({ label, value, icon, rgb, color }) => {
    const { theme } = useTheme();
    return (
        <View style={[styles.statCard, { borderColor: theme.colors.cardBorder }]}>
            <LinearGradient
                colors={[`rgba(${rgb},${theme.dark ? 0.22 : 0.12})`, `rgba(${rgb},0.02)`]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
            />
            <View style={[styles.statIcon, { backgroundColor: `rgba(${rgb},0.18)` }]}>
                <MaterialCommunityIcons name={icon} size={18} color={color} />
            </View>
            <Text style={{ color: theme.colors.textTertiary, fontSize: 10, fontWeight: '700', letterSpacing: 0.4, marginTop: spacing.sm }} numberOfLines={1}>
                {label.toUpperCase()}
            </Text>
            <Text style={{ color, fontSize: 16, fontWeight: '900', marginTop: 2 }} numberOfLines={1}>
                {value}
            </Text>
        </View>
    );
};

export default function ReportsScreen() {
    const navigation = useNavigation();
    const { transactions, categories, budgets, accounts, isLoading, refresh } = useData();
    const { user } = useAuth();
    const { theme } = useTheme();
    const currency = user?.currency || 'INR';

    const initial = useMemo(() => rangeForViewMode('Monthly'), []);
    const [viewMode, setViewMode] = useState<ViewMode>('Monthly');
    const [startDate, setStartDate] = useState(initial.start);
    const [endDate, setEndDate] = useState(initial.end);
    const [carryOver, setCarryOver] = useState(true);
    const [calendarMonthOffset, setCalendarMonthOffset] = useState(0);

    // Reset the calendar's month offset whenever the report period changes, so
    // the heatmap never points at a month outside the selected range.
    useEffect(() => {
        setCalendarMonthOffset(0);
    }, [startDate, endDate]);

    const changeViewMode = (mode: ViewMode) => {
        setViewMode(mode);
        if (mode !== 'Custom') {
            const r = rangeForViewMode(mode);
            setStartDate(r.start);
            setEndDate(r.end);
        }
    };

    const shift = (direction: -1 | 1) => {
        if (viewMode === 'Custom') return;
        lightHaptic();
        const r = shiftRange(viewMode, startDate, endDate, direction);
        setStartDate(r.start);
        setEndDate(r.end);
    };

    const inRange = useCallback((t: Transaction) => {
        const d = dayPart(t.date);
        return d >= startDate && d <= endDate;
    }, [startDate, endDate]);

    const filtered = useMemo(() => transactions.filter(inRange), [transactions, inRange]);

    const totalIncome = useMemo(
        () => filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0),
        [filtered],
    );
    const totalExpenses = useMemo(
        () => filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
        [filtered],
    );

    const preRangeBalance = useMemo(() => {
        let inflow = 0;
        let outflow = 0;
        for (const t of transactions) {
            if (dayPart(t.date) >= startDate) continue;
            if (t.type === 'income') inflow += t.amount;
            else if (t.type === 'expense') outflow += t.amount;
            else if (t.type === 'transfer') {
                inflow += t.amount;
                outflow += t.amount;
            }
        }
        const initialSum = accounts.reduce((s, a) => s + (a.initialBalance ?? 0), 0);
        return inflow - outflow + initialSum;
    }, [transactions, accounts, startDate]);

    const displayBalance = carryOver ? preRangeBalance + totalIncome - totalExpenses : totalIncome - totalExpenses;

    const buildSlices = useCallback((type: 'expense' | 'income'): DonutSlice[] => {
        const byCat: Record<string, number> = {};
        for (const t of filtered) {
            if (t.type !== type) continue;
            const name = categories.find(c => c.id === t.categoryId)?.name || 'Uncategorized';
            byCat[name] = (byCat[name] || 0) + t.amount;
        }
        return Object.entries(byCat)
            .map(([name, value]) => ({ name, value, icon: categories.find(c => c.name === name)?.icon }))
            .sort((a, b) => b.value - a.value);
    }, [filtered, categories]);

    const expenseSlices = useMemo(() => buildSlices('expense'), [buildSlices]);
    const incomeSlices = useMemo(() => buildSlices('income'), [buildSlices]);

    const daySeries = useMemo(() => {
        const expenseByDay: Record<string, number> = {};
        const incomeByDay: Record<string, number> = {};
        for (const t of filtered) {
            const d = dayPart(t.date);
            if (t.type === 'expense') expenseByDay[d] = (expenseByDay[d] || 0) + t.amount;
            else if (t.type === 'income') incomeByDay[d] = (incomeByDay[d] || 0) + t.amount;
        }
        return { expenseByDay, incomeByDay };
    }, [filtered]);

    const accountStats = useMemo((): AccountStats[] => {
        return accounts
            .map(account => {
                let income = 0;
                let expense = 0;
                let transferIn = 0;
                let transferOut = 0;
                const txs: Transaction[] = [];
                for (const t of filtered) {
                    const touches = t.accountId === account.id || t.transferToAccountId === account.id;
                    if (!touches) continue;
                    txs.push(t);
                    if (t.type === 'income' && t.accountId === account.id) income += t.amount;
                    if (t.type === 'expense' && t.accountId === account.id) expense += t.amount;
                    if (t.type === 'transfer') {
                        if (t.accountId === account.id) transferOut += t.amount;
                        if (t.transferToAccountId === account.id) transferIn += t.amount;
                    }
                }
                // copy already local (txs built fresh); sort newest-first
                txs.sort((a, b) => dayPart(b.date).localeCompare(dayPart(a.date)));
                return {
                    account,
                    income,
                    expense,
                    transferIn,
                    transferOut,
                    periodNet: income - expense - transferOut + transferIn,
                    incomePct: totalIncome > 0 ? (income / totalIncome) * 100 : 0,
                    expensePct: totalExpenses > 0 ? (expense / totalExpenses) * 100 : 0,
                    txs,
                };
            })
            .sort((a, b) => b.income + b.expense - (a.income + a.expense));
    }, [accounts, filtered, totalIncome, totalExpenses]);

    const metrics = useMemo(() => {
        const startMs = parseLocalDate(startDate).getTime();
        const endMs = parseLocalDate(endDate).getTime();
        const days = Math.max(1, Math.round((endMs - startMs) / 86400000) + 1);
        const dailyBurn = totalExpenses / days;
        const topCategory = expenseSlices[0]?.name || 'None';
        const savingsRate = totalIncome > 0 ? Math.max(0, ((totalIncome - totalExpenses) / totalIncome) * 100) : 0;

        // Collect every YYYY-MM month spanned by [startDate, endDate] (not just the
        // start month) so month-specific budgets later in a 3-Month/Yearly period
        // are still recognized as "budgeted".
        const spannedMonths = new Set<string>();
        {
            const s = parseLocalDate(startDate);
            const e = parseLocalDate(endDate);
            let cursor = new Date(s.getFullYear(), s.getMonth(), 1);
            const endAnchor = new Date(e.getFullYear(), e.getMonth(), 1);
            let guard = 0;
            while (cursor.getTime() <= endAnchor.getTime() && guard < 240) {
                spannedMonths.add(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`);
                cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
                guard++;
            }
        }
        const activeBudgetCatIds = budgets
            .filter(b => !b.month || spannedMonths.has(b.month))
            .map(b => b.categoryId);
        const unbudgetedSpent = filtered
            .filter(t => t.type === 'expense' && !activeBudgetCatIds.includes(t.categoryId || ''))
            .reduce((s, t) => s + t.amount, 0);

        return { dailyBurn, topCategory, savingsRate, unbudgetedSpent };
    }, [startDate, endDate, totalExpenses, totalIncome, expenseSlices, budgets, filtered]);

    // Text insights (comparison vs previous equivalent period) — mirrors web.
    const insights = useMemo(() => {
        const start = parseLocalDate(startDate);
        const end = parseLocalDate(endDate);
        let prevStart: string;
        let prevEnd: string;
        let comparisonLabel: string;
        if (viewMode === 'Monthly') {
            const prevDate = new Date(start.getFullYear(), start.getMonth() - 1, 1);
            const prevMonthEnd = new Date(start.getFullYear(), start.getMonth(), 0);
            prevStart = getLocalDateString(prevDate);
            prevEnd = getLocalDateString(prevMonthEnd);
            comparisonLabel = prevDate.toLocaleString('default', { month: 'long' });
        } else {
            const lengthDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);
            const prevEndDate = new Date(start.getFullYear(), start.getMonth(), start.getDate() - 1);
            const prevStartDate = new Date(prevEndDate.getFullYear(), prevEndDate.getMonth(), prevEndDate.getDate() - (lengthDays - 1));
            prevStart = getLocalDateString(prevStartDate);
            prevEnd = getLocalDateString(prevEndDate);
            comparisonLabel = `previous ${lengthDays} day${lengthDays === 1 ? '' : 's'}`;
        }

        const prevExpenses = transactions.filter(t => {
            if (t.type !== 'expense') return false;
            const d = dayPart(t.date);
            return d >= prevStart && d <= prevEnd;
        });
        const prevTotal = prevExpenses.reduce((s, t) => s + t.amount, 0);
        const totalDeltaPct = prevTotal > 0 ? ((totalExpenses - prevTotal) / prevTotal) * 100 : null;

        const byCat = (list: Transaction[]) =>
            list.reduce((acc: Record<string, number>, t) => {
                const key = t.categoryId || 'uncategorized';
                acc[key] = (acc[key] || 0) + t.amount;
                return acc;
            }, {});
        const curByCat = byCat(filtered.filter(t => t.type === 'expense'));
        const prevByCat = byCat(prevExpenses);
        let biggestChange: { name: string; delta: number } | null = null;
        for (const id of new Set([...Object.keys(curByCat), ...Object.keys(prevByCat)])) {
            const delta = (curByCat[id] || 0) - (prevByCat[id] || 0);
            if (!biggestChange || Math.abs(delta) > Math.abs(biggestChange.delta)) {
                biggestChange = { name: categories.find(c => c.id === id)?.name || 'Uncategorized', delta };
            }
        }

        const now = new Date();
        const isCurrentMonth = start.getMonth() === now.getMonth() && start.getFullYear() === now.getFullYear();
        let pace: { projected: number; totalBudget: number } | null = null;
        if (isCurrentMonth) {
            const monthStr = startDate.substring(0, 7);
            const monthlyBudgets = budgets.filter(b => b.month === monthStr);
            const repeatingBudgets = budgets.filter(b => !b.month && !monthlyBudgets.some(mb => mb.categoryId === b.categoryId));
            const totalBudget = [...monthlyBudgets, ...repeatingBudgets].reduce((s, b) => s + (b.effectiveAmount ?? b.amount), 0);
            if (totalBudget > 0 && now.getDate() > 0) {
                const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
                pace = { projected: (totalExpenses / now.getDate()) * daysInMonth, totalBudget };
            }
        }

        return { totalDeltaPct, prevTotal, comparisonLabel, biggestChange, pace };
    }, [startDate, endDate, viewMode, totalExpenses, transactions, filtered, categories, budgets]);

    const hasTextInsights =
        insights.totalDeltaPct !== null ||
        (insights.biggestChange && insights.biggestChange.delta !== 0) ||
        !!insights.pace;

    const exportCsv = async () => {
        if (filtered.length === 0) return;
        const headers = ['Date', 'Time', 'Note', 'Amount', 'Account', 'Type', 'Category', 'Transfer To'];
        const rows = filtered.map(t => {
            const cat = categories.find(c => c.id === t.categoryId);
            const acc = accounts.find(a => a.id === t.accountId);
            const dest = t.transferToAccountId ? accounts.find(a => a.id === t.transferToAccountId) : null;
            const time = t.date.includes('T') ? t.date.split('T')[1]?.slice(0, 5) : '';
            return [
                dayPart(t.date),
                time || '',
                t.note,
                t.amount.toFixed(2),
                acc?.name || '',
                t.type,
                cat?.name || (t.type === 'transfer' ? 'Transfer' : ''),
                dest?.name || '',
            ].map(csvField);
        });
        const csv = [headers.map(csvField).join(','), ...rows.map(r => r.join(','))].join('\n');
        try {
            await shareReportCsv(csv, `expensevision_${startDate}_to_${endDate}.csv`);
        } catch (err: any) {
            // expo-sharing resolves (rather than rejecting) when the user dismisses
            // the native share sheet, so any error caught here is a genuine failure
            // (e.g. sharing unavailable, file write failure) — surface it.
            Alert.alert('Export Failed', err?.message || 'Could not export the report as CSV.');
        }
    };

    const isEmptyPeriod = filtered.length === 0;

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={theme.colors.text} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: theme.colors.text }]}>Reports</Text>
                <TouchableOpacity
                    onPress={() => {
                        lightHaptic();
                        exportCsv();
                    }}
                    disabled={isEmptyPeriod}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    style={{ opacity: isEmptyPeriod ? 0.35 : 1 }}
                >
                    <MaterialCommunityIcons name="tray-arrow-down" size={22} color={theme.colors.primary} />
                </TouchableOpacity>
            </View>

            <ScrollView
                contentContainerStyle={{ padding: spacing.md }}
                refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refresh} tintColor={theme.colors.primary} />}
            >
                {/* View mode + period nav */}
                <ChipSelector
                    options={VIEW_MODES.map(m => ({ value: m, label: m }))}
                    value={viewMode}
                    onChange={v => changeViewMode(v as ViewMode)}
                />

                {viewMode === 'Custom' ? (
                    <View style={{ flexDirection: 'row', gap: spacing.md }}>
                        <View style={{ flex: 1 }}>
                            <DateField
                                label="From"
                                value={startDate}
                                onChange={iso => {
                                    setStartDate(iso);
                                    setViewMode('Custom');
                                }}
                            />
                        </View>
                        <View style={{ flex: 1 }}>
                            <DateField
                                label="To"
                                value={endDate}
                                onChange={iso => {
                                    setEndDate(iso);
                                    setViewMode('Custom');
                                }}
                            />
                        </View>
                    </View>
                ) : (
                    <View style={[styles.periodNav, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}>
                        <TouchableOpacity onPress={() => shift(-1)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                            <MaterialCommunityIcons name="chevron-left" size={26} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                        <Text style={{ color: theme.colors.text, fontWeight: '800', fontSize: 15 }}>
                            {periodLabel(viewMode, startDate, endDate)}
                        </Text>
                        <TouchableOpacity onPress={() => shift(1)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                            <MaterialCommunityIcons name="chevron-right" size={26} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                    </View>
                )}

                {/* Carry-over toggle */}
                <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => {
                        lightHaptic();
                        setCarryOver(c => !c);
                    }}
                    style={[styles.carryRow, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}
                >
                    <MaterialCommunityIcons
                        name={carryOver ? 'checkbox-marked' : 'checkbox-blank-outline'}
                        size={20}
                        color={carryOver ? theme.colors.primary : theme.colors.textTertiary}
                    />
                    <View style={{ marginLeft: spacing.sm, flex: 1 }}>
                        <Text style={{ color: theme.colors.text, fontSize: 13, fontWeight: '700' }}>Carry over balance</Text>
                        <Text style={{ color: theme.colors.textTertiary, fontSize: 11 }}>
                            Include savings from before this period in the balance
                        </Text>
                    </View>
                </TouchableOpacity>

                {/* Stat cards */}
                <View style={styles.statRow}>
                    <StatCard label="Expense" value={`−${formatCurrency(totalExpenses, currency)}`} icon="trending-down" rgb="244,63,94" color={theme.colors.danger} />
                    <StatCard label="Income" value={`+${formatCurrency(totalIncome, currency)}`} icon="trending-up" rgb="16,185,129" color={theme.colors.success} />
                    <StatCard
                        label={carryOver ? 'Balance' : 'Net'}
                        value={formatCurrency(displayBalance, currency)}
                        icon="wallet-outline"
                        rgb="59,130,246"
                        color="#3b82f6"
                    />
                </View>

                {isEmptyPeriod ? (
                    <Card style={{ marginBottom: spacing.md, alignItems: 'center', paddingVertical: spacing.lg }}>
                        <MaterialCommunityIcons name="calendar-blank-outline" size={40} color={theme.colors.textTertiary} />
                        <Text style={{ color: theme.colors.textSecondary, fontWeight: '700', marginTop: spacing.sm }}>
                            No transactions in this period
                        </Text>
                        <Text style={{ color: theme.colors.textTertiary, fontSize: 12, marginTop: 4, textAlign: 'center' }}>
                            Try a different range or add some transactions.
                        </Text>
                    </Card>
                ) : null}

                {/* Overview donuts */}
                <Section title="Overview" subtitle="Category breakdown">
                    <CategoryDonut
                        expense={expenseSlices}
                        income={incomeSlices}
                        expenseTotal={totalExpenses}
                        incomeTotal={totalIncome}
                        currency={currency}
                    />
                </Section>

                {/* Calendar heatmap */}
                <Section title="Money Calendar" subtitle="Daily activity intensity">
                    <MoneyCalendar
                        monthOffset={calendarMonthOffset}
                        onMonthOffsetChange={setCalendarMonthOffset}
                        baseStartDate={startDate}
                        expenseByDay={daySeries.expenseByDay}
                        incomeByDay={daySeries.incomeByDay}
                        currency={currency}
                        rangeStart={startDate}
                        rangeEnd={endDate}
                        key={`${startDate}-${endDate}`}
                    />
                </Section>

                {/* Flow chart */}
                <Section title="Transaction Flow" subtitle="Income vs expense over time">
                    <FlowChart start={startDate} end={endDate} series={daySeries} currency={currency} />
                </Section>

                {/* Accounts */}
                <Section title="Accounts Summary" subtitle="Per-account activity this period">
                    <AccountsSummary stats={accountStats} accounts={accounts} categories={categories} currency={currency} />
                </Section>

                {/* Insights */}
                <Section title="Insights" subtitle="Key metrics & trends">
                    <View style={styles.tileGrid}>
                        <InsightTile label="Daily Burn Rate" value={`${formatCurrency(metrics.dailyBurn, currency)}/day`} rgb="245,158,11" />
                        <InsightTile label="Top Category" value={metrics.topCategory} rgb="99,102,241" />
                        <InsightTile label="Savings Rate" value={`${metrics.savingsRate.toFixed(1)}%`} rgb="16,185,129" />
                        <InsightTile label="Unbudgeted Spent" value={formatCurrency(metrics.unbudgetedSpent, currency)} rgb="244,63,94" />
                    </View>

                    {hasTextInsights ? (
                        <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
                            {insights.totalDeltaPct !== null ? (
                                <InsightLine
                                    icon={insights.totalDeltaPct >= 0 ? 'trending-up' : 'trending-down'}
                                    color={insights.totalDeltaPct >= 0 ? theme.colors.danger : theme.colors.success}
                                    text={`Spending is ${Math.abs(insights.totalDeltaPct).toFixed(0)}% ${insights.totalDeltaPct >= 0 ? 'higher' : 'lower'} than ${insights.comparisonLabel} (${formatCurrency(insights.prevTotal, currency)})`}
                                />
                            ) : null}
                            {insights.biggestChange && insights.biggestChange.delta !== 0 ? (
                                <InsightLine
                                    icon="swap-horizontal"
                                    color={theme.colors.primary}
                                    text={`Biggest change: ${insights.biggestChange.name} (${insights.biggestChange.delta > 0 ? '+' : '−'}${formatCurrency(Math.abs(insights.biggestChange.delta), currency)} vs ${insights.comparisonLabel})`}
                                />
                            ) : null}
                            {insights.pace ? (
                                <InsightLine
                                    icon="speedometer"
                                    color={insights.pace.projected > insights.pace.totalBudget ? theme.colors.danger : theme.colors.success}
                                    text={`At this pace you'll spend ~${formatCurrency(insights.pace.projected, currency)} this month (${insights.pace.projected > insights.pace.totalBudget ? 'over' : 'within'} your ${formatCurrency(insights.pace.totalBudget, currency)} budget)`}
                                />
                            ) : null}
                        </View>
                    ) : (
                        <Text style={{ color: theme.colors.textTertiary, fontSize: 12, marginTop: spacing.md }}>
                            Not enough data yet — trend insights appear once you have activity across two periods.
                        </Text>
                    )}
                </Section>

                <View style={{ height: spacing.xl }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const InsightTile: React.FC<{ label: string; value: string; rgb: string }> = ({ label, value, rgb }) => {
    const { theme } = useTheme();
    return (
        <View style={[styles.tile, { borderColor: theme.colors.cardBorder }]}>
            <LinearGradient
                colors={[`rgba(${rgb},${theme.dark ? 0.2 : 0.1})`, `rgba(${rgb},0.02)`]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
            />
            <Text style={{ color: theme.colors.textTertiary, fontSize: 10, fontWeight: '700', letterSpacing: 0.3 }} numberOfLines={1}>
                {label.toUpperCase()}
            </Text>
            <Text style={{ color: theme.colors.text, fontSize: 16, fontWeight: '900', marginTop: 4 }} numberOfLines={1}>
                {value}
            </Text>
        </View>
    );
};

const InsightLine: React.FC<{ icon: keyof typeof MaterialCommunityIcons.glyphMap; color: string; text: string }> = ({ icon, color, text }) => {
    const { theme } = useTheme();
    return (
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }}>
            <MaterialCommunityIcons name={icon} size={18} color={color} style={{ marginTop: 1 }} />
            <Text style={{ color: theme.colors.textSecondary, fontSize: 13, lineHeight: 19, flex: 1 }}>{text}</Text>
        </View>
    );
};

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
    periodNav: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderRadius: radius.md,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        marginBottom: spacing.md,
    },
    carryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: radius.md,
        padding: spacing.md,
        marginBottom: spacing.md,
    },
    statRow: {
        flexDirection: 'row',
        gap: spacing.sm,
        marginBottom: spacing.md,
    },
    statCard: {
        flex: 1,
        borderWidth: 1,
        borderRadius: radius.md,
        padding: spacing.sm,
        overflow: 'hidden',
    },
    statIcon: {
        width: 30,
        height: 30,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.md,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '800',
    },
    tileGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    tile: {
        width: '47%',
        flexGrow: 1,
        borderWidth: 1,
        borderRadius: radius.md,
        padding: spacing.md,
        overflow: 'hidden',
    },
});
