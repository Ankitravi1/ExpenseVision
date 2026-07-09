import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { EmptyState } from '../../components/ui';
import { CategoryIcon } from '../../components/CategoryIcon';
import { BudgetForm } from '../../components/BudgetForm';
import { ScreenHeader } from '../../components/ScreenHeader';
import { formatCurrency } from '../../utils/currency';
import { spacing, radius } from '../../theme';
import { Budget } from '../../types';

export default function BudgetsScreen() {
    const navigation = useNavigation();
    const { budgets, categories, transactions, deleteBudget, isLoading, refresh } = useData();
    const { user } = useAuth();
    const { theme } = useTheme();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState<Budget | null>(null);
    const [preSelectedCategoryId, setPreSelectedCategoryId] = useState<string | null>(null);
    const currency = user?.currency || 'INR';

    const activeMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

    const repeatingBudgets = budgets
        .filter(b => !b.month)
        .map(b => {
            const spent = transactions
                .filter(t => t.type === 'expense' && t.categoryId === b.categoryId && t.date.startsWith(activeMonth))
                .reduce((sum, t) => sum + t.amount, 0);
            return { ...b, spent, carryover: 0, effectiveAmount: b.amount };
        });
    const monthlyBudgets = budgets.filter(b => b.month === activeMonth);
    const filteredRepeating = repeatingBudgets.filter(rb => !monthlyBudgets.some(mb => mb.categoryId === rb.categoryId));
    const filteredBudgets = [...monthlyBudgets, ...filteredRepeating];

    const budgetedCategoryIds = new Set(filteredBudgets.map(b => b.categoryId));
    const unbudgetedCategories = categories.filter(
        c => c.type === 'expense' && !budgetedCategoryIds.has(c.id)
    );

    const confirmDelete = (b: Budget) => {
        const cat = categories.find(c => c.id === b.categoryId);
        Alert.alert('Delete budget', `Remove the budget for "${cat?.name || 'this category'}"?`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: () => deleteBudget(b.id).catch(err => Alert.alert('Error', err.message)),
            },
        ]);
    };

    const renderFooter = () => {
        if (unbudgetedCategories.length === 0) return <View style={{ height: spacing.lg }} />;
        return (
            <View style={styles.unbudgetedSection}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Unbudgeted Categories</Text>
                <View style={{ gap: spacing.sm }}>
                    {unbudgetedCategories.map(cat => (
                        <View key={cat.id} style={[styles.unbudgetedRow, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                <CategoryIcon name={cat.icon} size={15} />
                                <Text style={{ color: theme.colors.text, fontWeight: '600', marginLeft: spacing.sm, fontSize: 14 }}>
                                    {cat.name}
                                </Text>
                            </View>
                            <TouchableOpacity
                                onPress={() => {
                                    setPreSelectedCategoryId(cat.id);
                                    setEditing(null);
                                    setShowForm(true);
                                }}
                                style={[styles.quickAddButton, { backgroundColor: theme.colors.primary }]}
                            >
                                <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>Set Budget</Text>
                            </TouchableOpacity>
                        </View>
                    ))}
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['top']}>
            <ScreenHeader title="Budgets" />

            {/* Month Swiper Navigator */}
            <View style={[styles.periodNavigator, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}>
                <TouchableOpacity
                    onPress={() => {
                        const prev = new Date(currentDate);
                        prev.setMonth(prev.getMonth() - 1);
                        setCurrentDate(prev);
                    }}
                    style={styles.navButton}
                >
                    <MaterialCommunityIcons name="chevron-left" size={24} color={theme.colors.text} />
                </TouchableOpacity>
                <Text style={[styles.periodText, { color: theme.colors.text }]}>
                    {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                </Text>
                <TouchableOpacity
                    onPress={() => {
                        const next = new Date(currentDate);
                        next.setMonth(next.getMonth() + 1);
                        setCurrentDate(next);
                    }}
                    style={styles.navButton}
                >
                    <MaterialCommunityIcons name="chevron-right" size={24} color={theme.colors.text} />
                </TouchableOpacity>
            </View>

            <FlatList
                data={filteredBudgets}
                keyExtractor={b => b.id}
                contentContainerStyle={{ padding: spacing.md, paddingTop: 0, gap: spacing.sm }}
                refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refresh} tintColor={theme.colors.primary} />}
                extraData={{ filteredBudgets, categories }}
                renderItem={({ item: b }) => {
                    const cat = categories.find(c => c.id === b.categoryId);
                    const limit = b.effectiveAmount ?? b.amount;
                    const ratio = limit > 0 ? Math.min(1, b.spent / limit) : 1;
                    const over = b.spent > limit;
                    const warnRatio = (b.alertThreshold ?? 100) / 100;
                    const barColor = over ? theme.colors.danger : ratio >= warnRatio ? theme.colors.warning : theme.colors.success;
                    return (
                        <TouchableOpacity
                            onPress={() => {
                                setEditing(b);
                                setPreSelectedCategoryId(null);
                                setShowForm(true);
                            }}
                            onLongPress={() => confirmDelete(b)}
                            style={[styles.budgetRow, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}
                        >
                            <View style={styles.budgetHeader}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                    <CategoryIcon name={cat?.icon} size={15} />
                                    <Text style={{ color: theme.colors.text, fontWeight: '700', marginLeft: spacing.sm }} numberOfLines={1}>
                                        {cat?.name || 'Unknown'}
                                    </Text>
                                </View>
                                <Text style={{ color: over ? theme.colors.danger : theme.colors.textSecondary, fontSize: 13 }}>
                                    {formatCurrency(b.spent, currency)} / {formatCurrency(limit, currency)}
                                </Text>
                            </View>
                            <View style={[styles.track, { backgroundColor: theme.colors.separator }]}>
                                <View style={[styles.fill, { width: `${ratio * 100}%`, backgroundColor: barColor }]} />
                            </View>

                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xs }}>
                                <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
                                    {(ratio * 100).toFixed(1)}% used
                                </Text>
                                <Text style={{ color: limit - b.spent >= 0 ? theme.colors.success : theme.colors.danger, fontSize: 12, fontWeight: '500' }}>
                                    {formatCurrency(Math.abs(limit - b.spent), currency)} {limit - b.spent >= 0 ? 'left' : 'over'}
                                </Text>
                            </View>

                            {b.rollover && (b.carryover ?? 0) !== 0 && (
                                <Text style={{ color: theme.colors.textTertiary, fontSize: 12, marginTop: 4 }}>
                                    {(b.carryover ?? 0) > 0
                                        ? `Includes ${formatCurrency(b.carryover ?? 0, currency)} rolled over from last month`
                                        : `Reduced by ${formatCurrency(Math.abs(b.carryover ?? 0), currency)} overspent last month`}
                                </Text>
                            )}
                        </TouchableOpacity>
                    );
                }}
                ListEmptyComponent={
                    <EmptyState icon="target" title="No budgets yet" subtitle="Tap + to set a monthly limit for a category." />
                }
                ListFooterComponent={renderFooter}
            />

            <BudgetForm
                visible={showForm}
                onClose={() => {
                    setShowForm(false);
                    setEditing(null);
                    setPreSelectedCategoryId(null);
                }}
                editing={editing}
                preSelectedCategoryId={preSelectedCategoryId}
                month={activeMonth}
            />

            <TouchableOpacity
                onPress={() => {
                    setEditing(null);
                    setPreSelectedCategoryId(null);
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
    periodNavigator: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: spacing.md,
        marginBottom: spacing.md,
        borderRadius: radius.md,
        borderWidth: 1,
        paddingVertical: 10,
    },
    periodText: {
        fontSize: 16,
        fontWeight: 'bold',
        width: 160,
        textAlign: 'center',
    },
    navButton: {
        padding: 4,
    },
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
    budgetRow: {
        padding: spacing.md,
        borderRadius: radius.md,
        borderWidth: 1,
    },
    budgetHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.sm,
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
    unbudgetedSection: {
        marginTop: spacing.lg,
        marginBottom: spacing.xl,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: spacing.sm,
    },
    unbudgetedRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.md,
        borderRadius: radius.md,
        borderWidth: 1,
        justifyContent: 'space-between',
    },
    quickAddButton: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: radius.sm,
    },
});
