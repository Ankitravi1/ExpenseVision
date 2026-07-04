import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { EmptyState } from '../../components/ui';
import { CategoryIcon } from '../../components/CategoryIcon';
import { BudgetForm } from '../../components/BudgetForm';
import { formatCurrency } from '../../utils/currency';
import { spacing, radius } from '../../theme';
import { Budget } from '../../types';

export default function BudgetsScreen() {
    const { budgets, categories, deleteBudget, isLoading, refresh } = useData();
    const { user } = useAuth();
    const { theme } = useTheme();
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState<Budget | null>(null);
    const currency = user?.currency || 'INR';

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

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['top']}>
            <View style={styles.header}>
                <Text style={[styles.title, { color: theme.colors.text }]}>Budgets</Text>
                <TouchableOpacity
                    onPress={() => {
                        setEditing(null);
                        setShowForm(true);
                    }}
                    style={[styles.addButton, { backgroundColor: theme.colors.primary }]}
                >
                    <MaterialCommunityIcons name="plus" size={24} color="#fff" />
                </TouchableOpacity>
            </View>

            <FlatList
                data={budgets}
                keyExtractor={b => b.id}
                contentContainerStyle={{ padding: spacing.md, paddingTop: 0, gap: spacing.sm }}
                refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refresh} tintColor={theme.colors.primary} />}
                renderItem={({ item: b }) => {
                    const cat = categories.find(c => c.id === b.categoryId);
                    const ratio = b.amount > 0 ? Math.min(1, b.spent / b.amount) : 0;
                    const over = b.spent > b.amount;
                    const barColor = over ? theme.colors.danger : ratio > 0.8 ? theme.colors.warning : theme.colors.success;
                    return (
                        <TouchableOpacity
                            onPress={() => {
                                setEditing(b);
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
                                    {formatCurrency(b.spent, currency)} / {formatCurrency(b.amount, currency)}
                                </Text>
                            </View>
                            <View style={[styles.track, { backgroundColor: theme.colors.separator }]}>
                                <View style={[styles.fill, { width: `${ratio * 100}%`, backgroundColor: barColor }]} />
                            </View>
                            {over && (
                                <Text style={{ color: theme.colors.danger, fontSize: 12, marginTop: 4 }}>
                                    Over budget by {formatCurrency(b.spent - b.amount, currency)}
                                </Text>
                            )}
                        </TouchableOpacity>
                    );
                }}
                ListEmptyComponent={
                    <EmptyState icon="target" title="No budgets yet" subtitle="Tap + to set a monthly limit for a category." />
                }
            />

            <BudgetForm
                visible={showForm}
                onClose={() => {
                    setShowForm(false);
                    setEditing(null);
                }}
                editing={editing}
            />
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
});
