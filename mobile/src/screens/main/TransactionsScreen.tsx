import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, RefreshControl, TextInput, LayoutAnimation, Platform, UIManager, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { EmptyState, ChipSelector, Card, lightHaptic, warningHaptic } from '../../components/ui';
import { CategoryIcon } from '../../components/CategoryIcon';
import { TransactionForm } from '../../components/TransactionForm';
import { ScreenHeader } from '../../components/ScreenHeader';
import { formatCurrency } from '../../utils/currency';
import { isoDateToDisplay } from '../../utils/date';
import { spacing, radius } from '../../theme';
import { Transaction } from '../../types';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

const VIEW_MODE_OPTIONS = [
    { value: 'Daily', label: 'Daily' },
    { value: 'Weekly', label: 'Weekly' },
    { value: 'Monthly', label: 'Monthly' },
    { value: '3 Month', label: '3 Months' },
    { value: 'Yearly', label: 'Yearly' },
];

export default function TransactionsScreen() {
    const navigation = useNavigation();
    const { transactions, categories, accounts, deleteTransaction, isLoading, refresh } = useData();
    const { user } = useAuth();
    const { theme } = useTheme();
    const route = useRoute();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');
    const [viewMode, setViewMode] = useState<'Daily' | 'Weekly' | 'Monthly' | '3 Month' | 'Yearly'>('Monthly');
    const [carryOver, setCarryOver] = useState(true);
    const [isFilterCollapsed, setIsFilterCollapsed] = useState(true);
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

    const shiftDate = (direction: -1 | 1) => {
        const next = new Date(currentDate);
        if (viewMode === 'Daily') {
            next.setDate(next.getDate() + direction);
        } else if (viewMode === 'Weekly') {
            next.setDate(next.getDate() + direction * 7);
        } else if (viewMode === 'Yearly') {
            next.setFullYear(next.getFullYear() + direction);
        } else {
            next.setMonth(next.getMonth() + direction);
        }
        setCurrentDate(next);
    };

    const getPeriodLabel = () => {
        if (viewMode === 'Daily') {
            return currentDate.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
        } else if (viewMode === 'Weekly') {
            const start = new Date(currentDate);
            start.setDate(currentDate.getDate() - currentDate.getDay());
            const end = new Date(start);
            end.setDate(start.getDate() + 6);
            return `${start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
        } else if (viewMode === 'Yearly') {
            return String(currentDate.getFullYear());
        } else {
            return currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
        }
    };

    const range = useMemo(() => {
        const formatDate = (d: Date) => {
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${y}-${m}-${day}`;
        };

        let start: Date;
        let end: Date;

        switch (viewMode) {
            case 'Daily':
                start = currentDate;
                end = currentDate;
                break;
            case 'Weekly':
                start = new Date(currentDate);
                start.setDate(currentDate.getDate() - currentDate.getDay());
                end = new Date(start);
                end.setDate(start.getDate() + 6);
                break;
            case 'Monthly':
                start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
                end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
                break;
            case '3 Month':
                start = new Date(currentDate.getFullYear(), currentDate.getMonth() - 2, 1);
                end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
                break;
            case 'Yearly':
                start = new Date(currentDate.getFullYear(), 0, 1);
                end = new Date(currentDate.getFullYear(), 11, 31);
                break;
            default:
                start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
                end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
        }

        return {
            start: formatDate(start),
            end: formatDate(end),
        };
    }, [viewMode, currentDate]);

    const preRangeBalance = useMemo(() => {
        const accountsInitialBalanceSum = accounts.reduce((sum, acc) => sum + (acc.initialBalance ?? acc.balance ?? 0), 0);
        const preTxs = transactions.filter(t => t.date < range.start);
        let incomeAndTransfersIn = 0;
        let expenseAndTransfersOut = 0;
        for (const t of preTxs) {
            if (t.type === 'income') {
                incomeAndTransfersIn += t.amount;
            } else if (t.type === 'expense') {
                expenseAndTransfersOut += t.amount;
            } else if (t.type === 'transfer') {
                incomeAndTransfersIn += t.amount;
                expenseAndTransfersOut += t.amount;
            }
        }
        return incomeAndTransfersIn - expenseAndTransfersOut + accountsInitialBalanceSum;
    }, [transactions, accounts, range.start]);

    const rangeStats = useMemo(() => {
        const rangeTxs = transactions.filter(t => t.date >= range.start && t.date <= range.end);
        const income = rangeTxs.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const expense = rangeTxs.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
        return { income, expense };
    }, [transactions, range]);

    const displayBalance = carryOver
        ? preRangeBalance + rangeStats.income - rangeStats.expense
        : rangeStats.income - rangeStats.expense;

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return transactions.filter(t => {
            if (typeFilter !== 'all' && t.type !== typeFilter) return false;
            if (t.date < range.start || t.date > range.end) return false;
            if (!q) return true;
            const cat = categories.find(c => c.id === t.categoryId);
            const acc = accounts.find(a => a.id === t.accountId);
            return (
                t.note.toLowerCase().includes(q) ||
                (cat?.name.toLowerCase().includes(q) ?? false) ||
                (acc?.name.toLowerCase().includes(q) ?? false)
            );
        });
    }, [transactions, categories, accounts, search, typeFilter, range]);

    const dataToRender = useMemo(() => {
        const sorted = [...filtered].sort((a, b) => b.date.localeCompare(a.date));
        const items: (Transaction | { isHeader: true; monthLabel: string; id: string })[] = [];
        let currentMonthLabel = '';

        for (const t of sorted) {
            const dateParts = t.date.split('-');
            if (dateParts.length === 3) {
                const y = parseInt(dateParts[0], 10);
                const m = parseInt(dateParts[1], 10);
                const d = parseInt(dateParts[2], 10);
                const dateObj = new Date(y, m - 1, d);
                const label = dateObj.toLocaleString('default', { month: 'long', year: 'numeric' });
                if (label !== currentMonthLabel) {
                    currentMonthLabel = label;
                    items.push({
                        isHeader: true,
                        monthLabel: label,
                        id: `header-${label}`
                    });
                }
            }
            items.push(t);
        }
        return items;
    }, [filtered]);

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

    const renderItem = ({ item }: { item: any }) => {
        if ('isHeader' in item) {
            return (
                <View style={styles.sectionHeaderContainer}>
                    <View style={[styles.sectionHeaderDivider, { backgroundColor: theme.colors.separator }]} />
                    <Text style={[styles.sectionHeaderText, { color: theme.colors.textSecondary }]}>
                        {item.monthLabel}
                    </Text>
                    <View style={[styles.sectionHeaderDivider, { backgroundColor: theme.colors.separator }]} />
                </View>
            );
        }
        const t = item as Transaction;
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
            <ScreenHeader title="Transactions" />

            {/* Month Swiper Navigator */}
            <View style={[styles.periodNavigator, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}>
                <TouchableOpacity onPress={() => shiftDate(-1)} style={styles.navButton}>
                    <MaterialCommunityIcons name="chevron-left" size={24} color={theme.colors.text} />
                </TouchableOpacity>
                <Text style={[styles.periodText, { color: theme.colors.text }]}>
                    {getPeriodLabel()}
                </Text>
                <TouchableOpacity onPress={() => shiftDate(1)} style={styles.navButton}>
                    <MaterialCommunityIcons name="chevron-right" size={24} color={theme.colors.text} />
                </TouchableOpacity>
            </View>

            {/* Summary Banner */}
            <View style={{ paddingHorizontal: spacing.md, marginBottom: spacing.sm }}>
                <Card style={{ padding: spacing.md }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View style={{ flex: 1 }}>
                            <Text style={{ color: theme.colors.textSecondary, fontSize: 11, fontWeight: '600' }}>Income</Text>
                            <Text style={{ color: theme.colors.success, fontSize: 15, fontWeight: '700', marginTop: 2 }} numberOfLines={1}>
                                {formatCurrency(rangeStats.income, currency)}
                            </Text>
                        </View>
                        <View style={{ flex: 1, borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: theme.colors.separator, paddingLeft: spacing.md }}>
                            <Text style={{ color: theme.colors.textSecondary, fontSize: 11, fontWeight: '600' }}>Expense</Text>
                            <Text style={{ color: theme.colors.danger, fontSize: 15, fontWeight: '700', marginTop: 2 }} numberOfLines={1}>
                                {formatCurrency(rangeStats.expense, currency)}
                            </Text>
                        </View>
                        <View style={{ flex: 1, borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: theme.colors.separator, paddingLeft: spacing.md }}>
                            <Text style={{ color: theme.colors.textSecondary, fontSize: 11, fontWeight: '600' }}>Balance</Text>
                            <Text style={{ color: displayBalance < 0 ? theme.colors.danger : theme.colors.text, fontSize: 15, fontWeight: '700', marginTop: 2 }} numberOfLines={1}>
                                {formatCurrency(displayBalance, currency)}
                            </Text>
                        </View>
                    </View>
                </Card>
            </View>

            <View style={{ paddingHorizontal: spacing.md, marginBottom: spacing.xs }}>
                {/* Type Filters Row */}
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

                {/* Collapsible Filter Button */}
                <TouchableOpacity
                    onPress={() => setIsFilterCollapsed(!isFilterCollapsed)}
                    style={[styles.collapseHeader, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}
                >
                    <MaterialCommunityIcons name="filter-variant" size={18} color={theme.colors.textSecondary} style={{ marginRight: 6 }} />
                    <Text style={{ flex: 1, color: theme.colors.text, fontSize: 13, fontWeight: '600' }}>
                        {isFilterCollapsed ? 'Show advanced filters' : 'Hide advanced filters'}
                    </Text>
                    <MaterialCommunityIcons name={isFilterCollapsed ? 'chevron-down' : 'chevron-up'} size={18} color={theme.colors.textTertiary} />
                </TouchableOpacity>

                {/* Collapsible Filter Card */}
                {!isFilterCollapsed && (
                    <Card style={{ padding: spacing.md, marginBottom: spacing.sm }}>
                        {/* Search Input */}
                        <View style={[styles.searchBox, { backgroundColor: theme.colors.inputBg, borderColor: theme.colors.inputBorder }]}>
                            <MaterialCommunityIcons name="magnify" size={20} color={theme.colors.textTertiary} />
                            <TextInput
                                value={search}
                                onChangeText={setSearch}
                                placeholder="Search note, category or account..."
                                placeholderTextColor={theme.colors.textTertiary}
                                style={[styles.searchInput, { color: theme.colors.text }]}
                            />
                            {search ? (
                                <TouchableOpacity onPress={() => setSearch('')}>
                                    <MaterialCommunityIcons name="close-circle" size={18} color={theme.colors.textTertiary} />
                                </TouchableOpacity>
                            ) : null}
                        </View>

                        {/* View Modes */}
                        <Text style={{ color: theme.colors.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: 4 }}>Date Range View</Text>
                        <View style={{ marginBottom: spacing.sm }}>
                            <ChipSelector
                                options={VIEW_MODE_OPTIONS}
                                value={viewMode}
                                onChange={(val) => setViewMode(val as any)}
                            />
                        </View>

                        {/* Carry Over */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 }}>
                            <View style={{ flex: 1, marginRight: spacing.sm }}>
                                <Text style={{ color: theme.colors.text, fontWeight: '600', fontSize: 13 }}>Carry Over Balance</Text>
                                <Text style={{ color: theme.colors.textTertiary, fontSize: 10 }}>Factor in previous transactions and initial balances</Text>
                            </View>
                            <Switch
                                value={carryOver}
                                onValueChange={setCarryOver}
                                trackColor={{ true: theme.colors.primary }}
                            />
                        </View>
                    </Card>
                )}
            </View>

            <FlatList
                data={dataToRender}
                keyExtractor={item => item.id}
                renderItem={renderItem}
                contentContainerStyle={{ padding: spacing.md, paddingTop: 0, gap: spacing.sm }}
                refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refresh} tintColor={theme.colors.primary} />}
                ListEmptyComponent={
                    <EmptyState
                        icon="swap-horizontal"
                        title={search || typeFilter !== 'all' ? 'No matching transactions' : 'No transactions yet'}
                        subtitle={search || typeFilter !== 'all' ? 'Try changing the search or filters' : 'Tap the + button at the bottom to add your first transaction. Tap to edit, swipe left to delete.'}
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
    periodNavigator: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: spacing.md,
        marginBottom: spacing.sm,
        borderRadius: radius.md,
        borderWidth: 1,
        paddingVertical: 8,
    },
    periodText: {
        fontSize: 15,
        fontWeight: 'bold',
        width: 160,
        textAlign: 'center',
    },
    navButton: {
        padding: 4,
    },
    collapseHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.md,
        borderRadius: radius.md,
        borderWidth: 1,
        marginTop: spacing.xs,
        marginBottom: spacing.sm,
    },
    sectionHeaderContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: spacing.sm,
        paddingHorizontal: spacing.xs,
    },
    sectionHeaderDivider: {
        flex: 1,
        height: StyleSheet.hairlineWidth,
    },
    sectionHeaderText: {
        fontSize: 11,
        fontWeight: '700',
        marginHorizontal: spacing.md,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
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
