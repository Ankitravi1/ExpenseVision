import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { lightHaptic } from '../../components/ui';
import { formatCurrency } from '../../utils/currency';
import { isoDateToDisplay } from '../../utils/date';
import { spacing, radius } from '../../theme';
import { formatCompact } from './helpers';

const WEEK_DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

// A month heatmap grid: each day cell is tinted by spend/income intensity.
// Has its own month prev/next nav clamped to the selected report period.
export const MoneyCalendar: React.FC<{
    monthOffset: number;
    onMonthOffsetChange: (offset: number) => void;
    baseStartDate: string; // anchor (report period start), YYYY-MM-DD
    expenseByDay: Record<string, number>;
    incomeByDay: Record<string, number>;
    currency: string;
    rangeStart: string;
    rangeEnd: string;
}> = ({ monthOffset, onMonthOffsetChange, baseStartDate, expenseByDay, incomeByDay, currency, rangeStart, rangeEnd }) => {
    const { theme } = useTheme();
    const [tab, setTab] = useState<'expense' | 'income'>('expense');
    const [selected, setSelected] = useState<string | null>(null);
    const isExpense = tab === 'expense';
    const dayTotals = isExpense ? expenseByDay : incomeByDay;

    const anchor = useMemo(() => {
        const [y, m, d] = baseStartDate.split('-').map(Number);
        return new Date(y, (m || 1) - 1, d || 1);
    }, [baseStartDate]);

    const activeDate = useMemo(
        () => new Date(anchor.getFullYear(), anchor.getMonth() + monthOffset, 1),
        [anchor, monthOffset],
    );
    const activeYear = activeDate.getFullYear();
    const activeMonth = activeDate.getMonth() + 1;
    const activeKey = `${activeYear}-${String(activeMonth).padStart(2, '0')}`;
    const daysInMonth = new Date(activeYear, activeMonth, 0).getDate();
    const startPad = (new Date(activeYear, activeMonth - 1, 1).getDay() + 6) % 7; // Monday-first

    const cells: (null | { day: number; iso: string })[] = [];
    for (let i = 0; i < startPad; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
        cells.push({ day: d, iso: `${activeKey}-${String(d).padStart(2, '0')}` });
    }

    const max = Math.max(1, ...Object.values(dayTotals));

    // Clamp month navigation so the grid never leaves the selected period.
    const monthEndIso = `${activeKey}-${String(daysInMonth).padStart(2, '0')}`;
    const monthStartIso = `${activeKey}-01`;
    const canGoPrev = monthStartIso > rangeStart.substring(0, 7) + '-01';
    const canGoNext = monthEndIso < rangeEnd;

    const cellColors = (amount: number): { bg: string; fg: string } => {
        if (amount <= 0) {
            return { bg: theme.colors.separator, fg: theme.colors.textTertiary };
        }
        const ratio = amount / max;
        // Base hue by tab; opacity ramps with intensity. High ratios use solid
        // color with white text so cells stay readable in dark mode.
        const base = isExpense ? '244,63,94' : '16,185,129'; // rose / emerald
        if (ratio > 0.66) return { bg: `rgb(${base})`, fg: '#ffffff' };
        if (ratio > 0.33) return { bg: `rgba(${base},0.55)`, fg: '#ffffff' };
        return { bg: `rgba(${base},0.22)`, fg: theme.colors.text };
    };

    const selectedTotal = selected ? dayTotals[selected] || 0 : 0;

    return (
        <View>
            <View style={styles.headerRow}>
                <View style={styles.tabRow}>
                    {(['expense', 'income'] as const).map(t => {
                        const active = tab === t;
                        const acc = t === 'expense' ? theme.colors.danger : theme.colors.success;
                        return (
                            <TouchableOpacity
                                key={t}
                                onPress={() => {
                                    setTab(t);
                                    setSelected(null);
                                }}
                                style={[styles.tab, { backgroundColor: active ? acc : theme.colors.separator }]}
                            >
                                <Text style={{ color: active ? '#fff' : theme.colors.textSecondary, fontSize: 11, fontWeight: '700' }}>
                                    {t === 'expense' ? 'Expense' : 'Income'}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>

            <View style={styles.navRow}>
                <TouchableOpacity
                    disabled={!canGoPrev}
                    onPress={() => {
                        lightHaptic();
                        onMonthOffsetChange(monthOffset - 1);
                        setSelected(null);
                    }}
                    style={{ opacity: canGoPrev ? 1 : 0.25, padding: 4 }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                    <MaterialCommunityIcons name="chevron-left" size={22} color={theme.colors.textSecondary} />
                </TouchableOpacity>
                <Text style={{ color: theme.colors.text, fontWeight: '800', fontSize: 13, letterSpacing: 0.5 }}>
                    {activeDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                </Text>
                <TouchableOpacity
                    disabled={!canGoNext}
                    onPress={() => {
                        lightHaptic();
                        onMonthOffsetChange(monthOffset + 1);
                        setSelected(null);
                    }}
                    style={{ opacity: canGoNext ? 1 : 0.25, padding: 4 }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                    <MaterialCommunityIcons name="chevron-right" size={22} color={theme.colors.textSecondary} />
                </TouchableOpacity>
            </View>

            <View style={styles.weekRow}>
                {WEEK_DAYS.map((w, i) => (
                    <View key={i} style={styles.weekCell}>
                        <Text style={{ color: theme.colors.textTertiary, fontSize: 10, fontWeight: '700' }}>{w}</Text>
                    </View>
                ))}
            </View>

            <View style={styles.grid}>
                {cells.map((cell, idx) => {
                    if (!cell) return <View key={`e-${idx}`} style={styles.dayCell} />;
                    const inRange = cell.iso >= rangeStart && cell.iso <= rangeEnd;
                    const amount = dayTotals[cell.iso] || 0;
                    const { bg, fg } = inRange ? cellColors(amount) : { bg: 'transparent', fg: theme.colors.textTertiary };
                    const isSel = selected === cell.iso;
                    return (
                        <TouchableOpacity
                            key={cell.iso}
                            activeOpacity={inRange ? 0.7 : 1}
                            disabled={!inRange}
                            onPress={() => {
                                if (!inRange) return;
                                lightHaptic();
                                setSelected(isSel ? null : cell.iso);
                            }}
                            style={styles.dayCell}
                        >
                            <View
                                style={[
                                    styles.dayInner,
                                    {
                                        backgroundColor: inRange ? bg : 'transparent',
                                        borderWidth: isSel ? 2 : 0,
                                        borderColor: theme.colors.primary,
                                        opacity: inRange ? 1 : 0.35,
                                    },
                                ]}
                            >
                                <Text style={{ color: fg, fontSize: 11, fontWeight: '700' }}>{cell.day}</Text>
                                {inRange && amount > 0 ? (
                                    <Text style={{ color: fg, fontSize: 8, fontWeight: '800' }} numberOfLines={1}>
                                        {formatCompact(amount, currency)}
                                    </Text>
                                ) : null}
                            </View>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {selected ? (
                <View style={[styles.selectedBanner, { backgroundColor: theme.colors.separator }]}>
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 12, fontWeight: '600' }}>
                        {isoDateToDisplay(selected)}
                    </Text>
                    <Text style={{ color: isExpense ? theme.colors.danger : theme.colors.success, fontSize: 13, fontWeight: '800' }}>
                        {selectedTotal > 0 ? `${isExpense ? '−' : '+'}${formatCurrency(selectedTotal, currency)}` : 'No activity'}
                    </Text>
                </View>
            ) : null}
        </View>
    );
};

const styles = StyleSheet.create({
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'flex-start',
        marginBottom: spacing.sm,
    },
    tabRow: {
        flexDirection: 'row',
        gap: spacing.xs,
    },
    tab: {
        paddingVertical: 5,
        paddingHorizontal: 12,
        borderRadius: radius.sm,
    },
    navRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.sm,
    },
    weekRow: {
        flexDirection: 'row',
        marginBottom: 4,
    },
    weekCell: {
        flex: 1,
        alignItems: 'center',
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    dayCell: {
        width: `${100 / 7}%`,
        aspectRatio: 1,
        padding: 2,
    },
    dayInner: {
        flex: 1,
        borderRadius: radius.sm,
        alignItems: 'center',
        justifyContent: 'center',
    },
    selectedBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: spacing.md,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: radius.md,
    },
});
