import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, RefreshControl, TextInput, LayoutAnimation, Platform, UIManager } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { EmptyState, ChipSelector, lightHaptic, warningHaptic } from '../../components/ui';
import { CategoryIcon } from '../../components/CategoryIcon';
import { TransactionForm } from '../../components/TransactionForm';
import { formatCurrency } from '../../utils/currency';
import { isoDateToDisplay } from '../../utils/date';
import { spacing, radius } from '../../theme';
import { Transaction } from '../../types';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

const monthLabel = (key: string) => {
    const [y, m] = key.split('-').map(Number);
    return new Date(y, m - 1, 1).toLocaleString('default', { month: 'long', year: 'numeric' });
};

const shiftMonth = (key: string, delta: number) => {
    const [y, m] = key.split('-').map(Number);
    return monthKey(new Date(y, m - 1 + delta, 1));
};

export default function TransactionsScreen() {
    const navigation = useNavigation();
    const { transactions, categories, accounts, deleteTransaction, isLoading, refresh } = useData();
    const { user } = useAuth();
    const { theme } = useTheme();
    const route = useRoute();
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');
    const currentMonth = monthKey(new Date());
    const [month, setMonth] = useState<string | null>(currentMonth); // default to current month
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState<Transaction | null>(null);
    const currency = user?.currency || 'INR';

    // Open form when navigated with openForm param (from FAB press)
    useEffect(() => {
        if ((route.params as any)?.openForm) {
            setEditing(null);
            setShowForm(true);
            navigation.setParams({ openForm: undefined } as any);
        }
    }, [route.params, navigation]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return transactions.filter(t => {
            if (typeFilter !== 'all' && t.type !== typeFilter) return false;
            if (month && !t.date.startsWith(month)) return false;
            if (!q) return true;
            const cat = categories.find(c => c.id === t.categoryId);
            const acc = accounts.find(a => a.id === t.accountId);
            return (
                t.note.toLowerCase().includes(q) ||
                (cat?.name.toLowerCase().includes(q) ?? false) ||
                (acc?.name.toLowerCase().includes(q) ?? false)
            );
        });
    }, [transactions, categories, accounts, search, typeFilter, month]);

    const doDelete = (t: Transaction) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        deleteTransaction(t.id).catch(err => Alert.alert('Error', err.message));
    };

    const confirmDelete = (t: Transaction) => {
        warningHaptic();
        Alert.alert('Delete transaction', `Delete "${t.note}"? Account balances will be adjusted.`, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => doDelete(t) },
        ]);
    };

    const renderItem = ({ item: t }: { item: Transaction }) => {
        const cat = categories.find(c => c.id === t.categoryId);
        const acc = accounts.find(a => a.id === t.accountId);
        const isIncome = t.type === 'income';
        return (
            <Swipeable
                onSwipeableWillOpen={() => lightHaptic()}
                renderRightActions={() => (
                    <TouchableOpacity
                        onPress={() => confirmDelete(t)}
                        style={[styles.deleteAction, { backgroundColor: theme.colors.danger }]}
                    >
                        <MaterialCommunityIcons name="trash-can-outline" size={22} color="#fff" />
                        <Text style={{ color: '#fff', fontSize: 11, fontWeight: '600' }}>Delete</Text>
                    </TouchableOpacity>
                )}
                overshootRight={false}
            >
                <TouchableOpacity
                    onPress={() => {
                        setEditing(t);
                        setShowForm(true);
                    }}
                    onLongPress={() => confirmDelete(t)}
                    activeOpacity={0.7}
                    style={[styles.txRow, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}
                >
                    <CategoryIcon name={t.type === 'transfer' ? 'CreditCard' : cat?.icon} size={16} />
                    <View style={{ flex: 1, marginLeft: spacing.sm }}>
                        <Text style={{ color: theme.colors.text, fontWeight: '600' }} numberOfLines={1}>{t.note}</Text>
                        <Text style={{ color: theme.colors.textTertiary, fontSize: 12 }}>
                            {isoDateToDisplay(t.date)} · {acc?.name || '—'}{cat ? ` · ${cat.name}` : ''}
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
                </TouchableOpacity>
            </Swipeable>
        );
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['top']}>
            <View style={styles.header}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <TouchableOpacity
                        onPress={() => (navigation as any).openDrawer?.()}
                        style={{ marginRight: 12, padding: 4 }}
                        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    >
                        <MaterialCommunityIcons name="menu" size={26} color={theme.colors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.title, { color: theme.colors.text }]}>Transactions</Text>
                </View>
            </View>

            <View style={{ paddingHorizontal: spacing.md }}>
                <View style={[styles.searchBox, { backgroundColor: theme.colors.inputBg, borderColor: theme.colors.inputBorder }]}>
                    <MaterialCommunityIcons name="magnify" size={20} color={theme.colors.textTertiary} />
                    <TextInput
                        value={search}
                        onChangeText={setSearch}
                        placeholder="Search transactions..."
                        placeholderTextColor={theme.colors.textTertiary}
                        style={[styles.searchInput, { color: theme.colors.text }]}
                    />
                    {search ? (
                        <TouchableOpacity onPress={() => setSearch('')}>
                            <MaterialCommunityIcons name="close-circle" size={18} color={theme.colors.textTertiary} />
                        </TouchableOpacity>
                    ) : null}
                </View>
                <View style={styles.monthRow}>
                    <TouchableOpacity
                        onPress={() => {
                            lightHaptic();
                            setMonth(prev => shiftMonth(prev || currentMonth, -1));
                        }}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                        <MaterialCommunityIcons name="chevron-left" size={22} color={theme.colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => {
                            lightHaptic();
                            setMonth(prev => (prev ? null : currentMonth));
                        }}
                    >
                        <Text style={{ color: month ? theme.colors.primary : theme.colors.textSecondary, fontWeight: '600', fontSize: 13 }}>
                            {month ? monthLabel(month) : 'All time · tap for this month'}
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => {
                            if (!month || month >= currentMonth) return;
                            lightHaptic();
                            setMonth(shiftMonth(month, 1));
                        }}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        style={{ opacity: month && month < currentMonth ? 1 : 0.3 }}
                    >
                        <MaterialCommunityIcons name="chevron-right" size={22} color={theme.colors.textSecondary} />
                    </TouchableOpacity>
                </View>
                <ChipSelector
                    options={[
                        { value: 'all', label: 'All' },
                        { value: 'expense', label: 'Expenses' },
                        { value: 'income', label: 'Income' },
                        { value: 'transfer', label: 'Transfers' },
                    ]}
                    value={typeFilter}
                    onChange={setTypeFilter}
                />
            </View>

            <FlatList
                data={filtered}
                keyExtractor={t => t.id}
                renderItem={renderItem}
                contentContainerStyle={{ padding: spacing.md, paddingTop: 0, gap: spacing.sm }}
                refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refresh} tintColor={theme.colors.primary} />}
                ListEmptyComponent={
                    <EmptyState
                        icon="swap-horizontal"
                        title={search || typeFilter !== 'all' || month ? 'No matching transactions' : 'No transactions yet'}
                        subtitle={search || typeFilter !== 'all' || month ? 'Try changing the search or filters' : 'Tap the + button at the bottom to add your first transaction. Tap to edit, swipe left to delete.'}
                    />
                }
            />

            <TransactionForm
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
        paddingBottom: spacing.sm,
    },
    title: {
        fontSize: 26,
        fontWeight: '800',
    },
    iconButton: {
        width: 44,
        height: 44,
        borderRadius: radius.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    searchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: radius.md,
        paddingHorizontal: 12,
        marginBottom: spacing.sm,
    },
    searchInput: {
        flex: 1,
        paddingVertical: 10,
        paddingHorizontal: 8,
        fontSize: 15,
    },
    monthRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.xs,
        marginBottom: spacing.sm,
    },
    txRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.md,
        borderRadius: radius.md,
        borderWidth: 1,
    },
    deleteAction: {
        width: 72,
        borderRadius: radius.md,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: spacing.sm,
        gap: 2,
    },
});
