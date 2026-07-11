import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { useTheme } from '../../context/ThemeContext';
import { CategoryIcon } from '../../components/CategoryIcon';
import { EmptyState } from '../../components/ui';
import { formatCurrency } from '../../utils/currency';
import { spacing, radius } from '../../theme';
import { EXPENSE_COLORS, INCOME_COLORS } from './helpers';

export type DonutSlice = { name: string; value: number; icon?: string };

// A donut drawn with SVG stroked circles (chart-kit's PieChart is not a donut).
// Each slice is a segment of the ring rendered via strokeDasharray/offset.
const Donut: React.FC<{ data: DonutSlice[]; total: number; colors: string[]; size: number }> = ({
    data,
    total,
    colors,
    size,
}) => {
    const { theme } = useTheme();
    const strokeWidth = size * 0.16;
    const r = (size - strokeWidth) / 2;
    const cx = size / 2;
    const cy = size / 2;
    const circumference = 2 * Math.PI * r;

    let offsetAcc = 0;
    return (
        <Svg width={size} height={size}>
            {/* Track */}
            <Circle cx={cx} cy={cy} r={r} stroke={theme.colors.separator} strokeWidth={strokeWidth} fill="none" />
            {/* Rotate so slices start at 12 o'clock */}
            <G rotation={-90} origin={`${cx}, ${cy}`}>
                {data.map((slice, i) => {
                    if (total <= 0 || slice.value <= 0) return null;
                    const frac = slice.value / total;
                    const dash = frac * circumference;
                    // Small gap between segments for readability
                    const gap = data.length > 1 ? Math.min(dash * 0.5, 3) : 0;
                    const dashArray = `${Math.max(0, dash - gap)} ${circumference}`;
                    const circle = (
                        <Circle
                            key={slice.name}
                            cx={cx}
                            cy={cy}
                            r={r}
                            stroke={colors[i % colors.length]}
                            strokeWidth={strokeWidth}
                            strokeDasharray={dashArray}
                            strokeDashoffset={-offsetAcc}
                            strokeLinecap="butt"
                            fill="none"
                        />
                    );
                    offsetAcc += dash;
                    return circle;
                })}
            </G>
        </Svg>
    );
};

export const CategoryDonut: React.FC<{
    expense: DonutSlice[];
    income: DonutSlice[];
    expenseTotal: number;
    incomeTotal: number;
    currency: string;
}> = ({ expense, income, expenseTotal, incomeTotal, currency }) => {
    const { theme } = useTheme();
    const [tab, setTab] = useState<'expense' | 'income'>('expense');

    const isExpense = tab === 'expense';
    const data = isExpense ? expense : income;
    const total = isExpense ? expenseTotal : incomeTotal;
    const colors = isExpense ? EXPENSE_COLORS : INCOME_COLORS;
    const accent = isExpense ? theme.colors.danger : theme.colors.success;
    const sign = isExpense ? '−' : '+';
    const donutSize = 190;

    return (
        <View>
            <View style={styles.tabRow}>
                {(['expense', 'income'] as const).map(t => {
                    const active = tab === t;
                    const tabAccent = t === 'expense' ? theme.colors.danger : theme.colors.success;
                    return (
                        <TouchableOpacity
                            key={t}
                            onPress={() => setTab(t)}
                            activeOpacity={0.8}
                            style={[
                                styles.tab,
                                {
                                    backgroundColor: active ? theme.colors.card : 'transparent',
                                    borderColor: active ? tabAccent : 'transparent',
                                },
                            ]}
                        >
                            <Text style={{ color: active ? tabAccent : theme.colors.textSecondary, fontWeight: '700', fontSize: 13 }}>
                                {t === 'expense' ? 'Expense' : 'Income'}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {data.length === 0 ? (
                <EmptyState icon="chart-donut" title={isExpense ? 'No expenses this period' : 'No income this period'} />
            ) : (
                <>
                    <View style={styles.donutWrap}>
                        <Donut data={data} total={total} colors={colors} size={donutSize} />
                        <View style={styles.donutCenter} pointerEvents="none">
                            <Text style={[styles.centerAmount, { color: theme.colors.text }]} numberOfLines={1}>
                                {formatCurrency(total, currency)}
                            </Text>
                            <Text style={[styles.centerLabel, { color: theme.colors.textTertiary }]}>TOTAL</Text>
                        </View>
                    </View>

                    <View style={{ marginTop: spacing.md, maxHeight: 260 }}>
                        <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false}>
                            {data.map((cat, i) => {
                                const pct = total > 0 ? (cat.value / total) * 100 : 0;
                                const color = colors[i % colors.length];
                                return (
                                    <View key={cat.name} style={styles.legendRow}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 0 }}>
                                            <View style={[styles.dot, { backgroundColor: color }]} />
                                            <CategoryIcon name={cat.icon} size={12} />
                                            <Text style={{ color: theme.colors.text, fontWeight: '600', marginLeft: spacing.sm, flexShrink: 1 }} numberOfLines={1}>
                                                {cat.name}
                                            </Text>
                                        </View>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                                            <View style={[styles.pctPill, { backgroundColor: theme.colors.separator }]}>
                                                <Text style={{ color: theme.colors.textSecondary, fontSize: 10, fontWeight: '700' }}>
                                                    {pct.toFixed(1)}%
                                                </Text>
                                            </View>
                                            <Text style={{ color: accent, fontWeight: '700', fontSize: 13 }}>
                                                {sign}{formatCurrency(cat.value, currency)}
                                            </Text>
                                        </View>
                                    </View>
                                );
                            })}
                        </ScrollView>
                    </View>
                </>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    tabRow: {
        flexDirection: 'row',
        gap: spacing.xs,
        marginBottom: spacing.md,
        alignSelf: 'flex-start',
    },
    tab: {
        paddingVertical: 6,
        paddingHorizontal: 14,
        borderRadius: radius.sm,
        borderWidth: 1.5,
    },
    donutWrap: {
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    donutCenter: {
        position: 'absolute',
        alignItems: 'center',
        justifyContent: 'center',
    },
    centerAmount: {
        fontSize: 18,
        fontWeight: '900',
    },
    centerLabel: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1,
        marginTop: 2,
    },
    legendRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 7,
    },
    dot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginRight: spacing.sm,
    },
    pctPill: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: radius.sm,
    },
});
