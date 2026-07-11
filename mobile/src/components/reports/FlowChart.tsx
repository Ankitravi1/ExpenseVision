import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { useTheme } from '../../context/ThemeContext';
import { EmptyState } from '../../components/ui';
import { spacing } from '../../theme';
import { eachDayInRange, parseLocalDate, formatAxis } from './helpers';

type DaySeries = { expenseByDay: Record<string, number>; incomeByDay: Record<string, number> };

// Daily income vs expense over the period. For long periods the data is
// bucketed by week or month so the x-axis labels stay legible.
export const FlowChart: React.FC<{
    start: string;
    end: string;
    series: DaySeries;
    currency: string;
}> = ({ start, end, series, currency }) => {
    const { theme } = useTheme();

    const chart = useMemo(() => {
        const days = eachDayInRange(start, end);
        if (days.length === 0) return null;

        type Bucket = { key: string; label: string; income: number; expense: number };
        const buckets: Bucket[] = [];
        const byKey = new Map<string, Bucket>();

        const bucketMode: 'day' | 'week' | 'month' = days.length > 92 ? 'month' : days.length > 31 ? 'week' : 'day';

        const keyFor = (iso: string): { key: string; label: string } => {
            const d = parseLocalDate(iso);
            if (bucketMode === 'month') {
                const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                return { key, label: d.toLocaleString('default', { month: 'short' }) };
            }
            if (bucketMode === 'week') {
                // Anchor week to its Monday
                const day = d.getDay();
                const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((day + 6) % 7));
                const key = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
                return { key, label: `${monday.getDate()}/${monday.getMonth() + 1}` };
            }
            const [, m, dd] = iso.split('-');
            return { key: iso, label: `${dd}/${m}` };
        };

        for (const iso of days) {
            const { key, label } = keyFor(iso);
            let b = byKey.get(key);
            if (!b) {
                b = { key, label, income: 0, expense: 0 };
                byKey.set(key, b);
                buckets.push(b);
            }
            b.income += series.incomeByDay[iso] || 0;
            b.expense += series.expenseByDay[iso] || 0;
        }

        // Thin x-axis labels so at most ~7 are shown.
        const labelStep = Math.max(1, Math.ceil(buckets.length / 7));
        const labels = buckets.map((b, i) => (i % labelStep === 0 ? b.label : ''));

        return {
            labels,
            income: buckets.map(b => b.income),
            expense: buckets.map(b => b.expense),
            hasData: buckets.some(b => b.income > 0 || b.expense > 0),
        };
    }, [start, end, series]);

    if (!chart || !chart.hasData) {
        return <EmptyState icon="chart-line" title="No activity to chart" />;
    }

    const width = Dimensions.get('window').width - spacing.md * 2 - spacing.md * 2;

    return (
        <View>
            <View style={styles.legend}>
                <View style={styles.legendItem}>
                    <View style={[styles.swatch, { backgroundColor: theme.colors.success }]} />
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>Income</Text>
                </View>
                <View style={styles.legendItem}>
                    <View style={[styles.swatch, { backgroundColor: theme.colors.danger }]} />
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>Expense</Text>
                </View>
            </View>
            <LineChart
                data={{
                    labels: chart.labels,
                    datasets: [
                        { data: chart.income, color: () => theme.colors.success, strokeWidth: 2 },
                        { data: chart.expense, color: () => theme.colors.danger, strokeWidth: 2 },
                    ],
                }}
                width={width}
                height={200}
                withDots={chart.income.length <= 14}
                {...(chart.income.length >= 2 ? { bezier: true } : {})}
                withInnerLines={false}
                withShadow={false}
                formatYLabel={(v) => formatAxis(Number(v))}
                chartConfig={{
                    backgroundGradientFrom: theme.colors.card,
                    backgroundGradientTo: theme.colors.card,
                    decimalPlaces: 0,
                    color: () => theme.colors.textTertiary,
                    labelColor: () => theme.colors.textTertiary,
                    propsForDots: { r: '2.5' },
                    propsForBackgroundLines: { stroke: theme.colors.separator },
                }}
                style={{ borderRadius: 12, marginLeft: -spacing.sm }}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    legend: {
        flexDirection: 'row',
        gap: spacing.md,
        marginBottom: spacing.sm,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    swatch: {
        width: 12,
        height: 12,
        borderRadius: 3,
    },
});
