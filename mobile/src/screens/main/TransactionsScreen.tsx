import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, RefreshControl, TextInput, LayoutAnimation, Platform, UIManager, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { EmptyState, ChipSelector, Card, DateField, lightHaptic, warningHaptic } from '../../components/ui';
import { CategoryIcon } from '../../components/CategoryIcon';
import { TransactionForm } from '../../components/TransactionForm';
import { ScreenHeader } from '../../components/ScreenHeader';
import { apiFetch } from '../../services/api';
import { formatCurrency } from '../../utils/currency';
import { isoDateToDisplay } from '../../utils/date';
import { spacing, radius } from '../../theme';
import { Transaction } from '../../types';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

type ViewMode = 'Daily' | 'Weekly' | 'Monthly' | '3 Month' | 'Yearly' | 'Custom';

const VIEW_MODE_OPTIONS = [
    { value: 'Daily', label: 'Daily' },
    { value: 'Weekly', label: 'Weekly' },
    { value: 'Monthly', label: 'Monthly' },
    { value: '3 Month', label: '3 Months' },
    { value: 'Yearly', label: 'Yearly' },
    { value: 'Custom', label: 'Custom' },
];

// Format a Date as YYYY-MM-DD in local time (never use toISOString — that shifts by TZ).
const formatIsoDate = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
};

export default function TransactionsScreen() {
    const navigation = useNavigation();
    const { transactions, categories, accounts, deleteTransaction, isLoading, refresh } = useData();
    const { user } = useAuth();
    const { theme } = useTheme();
    const route = useRoute();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');
    const [viewMode, setViewMode] = useState<ViewMode>('Monthly');
    const [carryOver, setCarryOver] = useState(true);
    const [applyFiltersToStats, setApplyFiltersToStats] = useState(false);
    const [isFilterCollapsed, setIsFilterCollapsed] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState<Transaction | null>(null);
    const currency = user?.currency || 'INR';

    // Custom range dates (YYYY-MM-DD). Mirror the derived range while not in Custom
    // mode so the From/To fields always show meaningful values; editing either one
    // switches the view to Custom.
    const [customStart, setCustomStart] = useState(() => formatIsoDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1)));
    const [customEnd, setCustomEnd] = useState(() => formatIsoDate(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)));

    // Amount range filter: limits rows of the selected type to <= limit; rows of
    // other types stay visible. Applied instantly.
    const [amountType, setAmountType] = useState<'expense' | 'income'>('expense');
    const [amountLimit, setAmountLimit] = useState('');

    // Bulk selection
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    // Open form when navigated with openForm param (from FAB press)
    useEffect(() => {
        if ((route.params as any)?.openForm) {
            setEditing(null);
            setShowForm(true);
            navigation.setParams({ openForm: undefined } as any);
        }
    }, [route.params, navigation]);

    const shiftDate = (direction: -1 | 1) => {
        if (viewMode === 'Custom') return;
        const next = new Date(currentDate);
        if (viewMode === 'Daily') {
            next.setDate(next.getDate() + direction);
        } else if (viewMode === 'Weekly') {
            next.setDate(next.getDate() + direction * 7);
        } else if (viewMode === 'Yearly') {
            next.setFullYear(next.getFullYear() + direction);
        } else if (viewMode === '3 Month') {
            // Anchor to day 1 before month arithmetic so we never overflow into the
            // wrong month, then jump 3 whole calendar months.
            next.setDate(1);
            next.setMonth(next.getMonth() + direction * 3);
        } else {
            // Monthly
            next.setDate(1);
            next.setMonth(next.getMonth() + direction);
        }
        setCurrentDate(next);
    };

    const getPeriodLabel = () => {
        if (viewMode === 'Custom') {
            return `${isoDateToDisplay(range.start)} – ${isoDateToDisplay(range.end)}`;
        } else if (viewMode === 'Daily') {
            return currentDate.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
        } else if (viewMode === 'Weekly') {
            const start = new Date(currentDate);
            start.setDate(currentDate.getDate() - currentDate.getDay());
            const end = new Date(start);
            end.setDate(start.getDate() + 6);
            return `${start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
        } else if (viewMode === '3 Month') {
            const startM = new Date(currentDate.getFullYear(), currentDate.getMonth() - 2, 1);
            const endM = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
            const startLabel = startM.toLocaleDateString(undefined, { month: 'short' });
            const endLabel = endM.toLocaleDateString(undefined, { month: 'short' });
            if (startM.getFullYear() === endM.getFullYear()) {
                return `${startLabel} – ${endLabel} ${endM.getFullYear()}`;
            }
            return `${startLabel} ${startM.getFullYear()} – ${endLabel} ${endM.getFullYear()}`;
        } else if (viewMode === 'Yearly') {
            return String(currentDate.getFullYear());
        } else {
            return currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
        }
    };

    const range = useMemo(() => {
        if (viewMode === 'Custom') {
            return { start: customStart, end: customEnd };
        }

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
                // Span exactly 3 calendar months: 1st of first month → last day of third.
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
            start: formatIsoDate(start),
            end: formatIsoDate(end),
        };
    }, [viewMode, currentDate, customStart, customEnd]);

    // Keep the From/To fields mirrored to the derived range whenever we are NOT in
    // Custom mode. (In Custom mode the fields are the source of truth for the range.)
    useEffect(() => {
        if (viewMode !== 'Custom') {
            setCustomStart(range.start);
            setCustomEnd(range.end);
        }
    }, [range.start, range.end, viewMode]);

    const preRangeBalance = useMemo(() => {
        // Frozen accounts are excluded from balance totals everywhere else
        // (header net worth, Accounts screen) — match that here too, or this
        // banner shows a different, unreconciled number for the same data.
        const frozenAccountIds = new Set(accounts.filter(a => a.frozen).map(a => a.id));
        const accountsInitialBalanceSum = accounts
            .filter(a => !a.frozen)
            .reduce((sum, acc) => sum + (acc.initialBalance ?? acc.balance ?? 0), 0);
        const preTxs = transactions.filter(t =>
            t.date.substring(0, 10) < range.start &&
            !frozenAccountIds.has(t.accountId) &&
            !(t.transferToAccountId && frozenAccountIds.has(t.transferToAccountId))
        );
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

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        const limit = amountLimit ? parseFloat(amountLimit) : NaN;
        return transactions.filter(t => {
            if (typeFilter !== 'all' && t.type !== typeFilter) return false;
            const d = t.date.substring(0, 10);
            if (d < range.start || d > range.end) return false;
            // Amount range filter: only constrain rows of the selected type.
            if (!isNaN(limit) && t.type === amountType && t.amount > limit) return false;
            if (!q) return true;
            const cat = categories.find(c => c.id === t.categoryId);
            const acc = accounts.find(a => a.id === t.accountId);
            return (
                t.note.toLowerCase().includes(q) ||
                (cat?.name.toLowerCase().includes(q) ?? false) ||
                (acc?.name.toLowerCase().includes(q) ?? false)
            );
        });
    }, [transactions, categories, accounts, search, typeFilter, range, amountType, amountLimit]);

    // Date-only list for the stats when "Apply filters to stats" is off.
    const dateRangeTxs = useMemo(() => {
        return transactions.filter(t => {
            const d = t.date.substring(0, 10);
            return d >= range.start && d <= range.end;
        });
    }, [transactions, range]);

    const rangeStats = useMemo(() => {
        const source = applyFiltersToStats ? filtered : dateRangeTxs;
        const income = source.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const expense = source.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
        return { income, expense };
    }, [applyFiltersToStats, filtered, dateRangeTxs]);

    const displayBalance = carryOver
        ? preRangeBalance + rangeStats.income - rangeStats.expense
        : rangeStats.income - rangeStats.expense;

    const dataToRender = useMemo(() => {
        const sorted = [...filtered].sort((a, b) => b.date.localeCompare(a.date));
        const items: (Transaction | { isHeader: true; monthLabel: string; id: string })[] = [];
        let currentMonthLabel = '';

        for (const t of sorted) {
            const dateParts = t.date.substring(0, 10).split('-');
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

    // Selection helpers -----------------------------------------------------
    const visibleIds = useMemo(() => filtered.map(t => t.id), [filtered]);
    const allSelected = visibleIds.length > 0 && visibleIds.every(id => selectedIds.includes(id));

    const applySelection = (ids: string[]) => {
        setSelectedIds(ids);
        if (ids.length === 0) setSelectionMode(false);
    };

    const toggleSelect = (id: string) => {
        applySelection(
            selectedIds.includes(id) ? selectedIds.filter(x => x !== id) : [...selectedIds, id]
        );
    };

    const toggleSelectAll = () => {
        if (allSelected) {
            applySelection([]);
        } else {
            setSelectedIds(visibleIds);
        }
    };

    // Clear any selection whenever the visible set can change (date range or
    // filters). Prevents deleting rows the user can no longer see.
    useEffect(() => {
        setSelectedIds([]);
        setSelectionMode(false);
    }, [range.start, range.end, typeFilter, search, amountType, amountLimit]);

    const doBulkDelete = () => {
        if (selectedIds.length === 0) return;
        const ids = [...selectedIds];
        warningHaptic();
        Alert.alert(
            'Delete transactions',
            `Delete ${ids.length} selected transaction${ids.length === 1 ? '' : 's'}? Account balances will be adjusted. This cannot be undone.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const res = await apiFetch('/transactions/bulk-delete', {
                                method: 'POST',
                                body: JSON.stringify({ ids }),
                            });
                            if (!res.ok) throw new Error('Failed to delete transactions');
                            setSelectedIds([]);
                            setSelectionMode(false);
                            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                            await refresh();
                        } catch (err: any) {
                            Alert.alert('Error', err?.message || 'Failed to delete transactions');
                        }
                    },
                },
            ]
        );
    };

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
        const isSelected = selectedIds.includes(t.id);

        const rowInner = (
            <TouchableOpacity
                onPress={() => {
                    if (selectionMode) {
                        lightHaptic();
                        toggleSelect(t.id);
                    } else {
                        setEditing(t);
                        setShowForm(true);
                    }
                }}
                onLongPress={() => {
                    if (!selectionMode) {
                        warningHaptic();
                        setSelectionMode(true);
                        setSelectedIds([t.id]);
                    }
                }}
                activeOpacity={0.7}
                style={[
                    styles.txRow,
                    {
                        backgroundColor: isSelected ? theme.colors.primaryLight : theme.colors.card,
                        borderColor: isSelected ? theme.colors.primary : theme.colors.cardBorder,
                    },
                ]}
            >
                {selectionMode && (
                    <MaterialCommunityIcons
                        name={isSelected ? 'checkbox-marked' : 'checkbox-blank-outline'}
                        size={22}
                        color={isSelected ? theme.colors.primary : theme.colors.textTertiary}
                        style={{ marginRight: spacing.sm }}
                    />
                )}
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
        );

        // In selection mode, drop the swipe-to-delete gesture so it can't fight the
        // tap-to-select interaction.
        if (selectionMode) return rowInner;

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
                {rowInner}
            </Swipeable>
        );
    };

    const filtersActive = !!(search || typeFilter !== 'all' || amountLimit);

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['top']}>
            <ScreenHeader title="Transactions" />

            {/* Period Swiper Navigator */}
            <View style={[styles.periodNavigator, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}>
                {viewMode !== 'Custom' ? (
                    <TouchableOpacity onPress={() => shiftDate(-1)} style={styles.navButton}>
                        <MaterialCommunityIcons name="chevron-left" size={24} color={theme.colors.text} />
                    </TouchableOpacity>
                ) : (
                    <View style={styles.navButton} />
                )}
                <Text style={[styles.periodText, { color: theme.colors.text }]} numberOfLines={1}>
                    {getPeriodLabel()}
                </Text>
                {viewMode !== 'Custom' ? (
                    <TouchableOpacity onPress={() => shiftDate(1)} style={styles.navButton}>
                        <MaterialCommunityIcons name="chevron-right" size={24} color={theme.colors.text} />
                    </TouchableOpacity>
                ) : (
                    <View style={styles.navButton} />
                )}
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
                                onChange={(val) => setViewMode(val as ViewMode)}
                            />
                        </View>

                        {/* From / To date fields. Editing either switches to Custom mode. */}
                        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                            <View style={{ flex: 1 }}>
                                <DateField
                                    label="From"
                                    value={customStart}
                                    onChange={(iso) => {
                                        setViewMode('Custom');
                                        setCustomStart(iso);
                                    }}
                                />
                            </View>
                            <View style={{ flex: 1 }}>
                                <DateField
                                    label="To"
                                    value={customEnd}
                                    onChange={(iso) => {
                                        setViewMode('Custom');
                                        setCustomEnd(iso);
                                    }}
                                />
                            </View>
                        </View>

                        {/* Amount range filter */}
                        <Text style={{ color: theme.colors.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: 4 }}>Amount Filter</Text>
                        <View style={{ marginBottom: spacing.sm }}>
                            <View style={[styles.segment, { borderColor: theme.colors.inputBorder, backgroundColor: theme.colors.inputBg }]}>
                                {(['expense', 'income'] as const).map(opt => {
                                    const active = amountType === opt;
                                    return (
                                        <TouchableOpacity
                                            key={opt}
                                            onPress={() => setAmountType(opt)}
                                            style={[
                                                styles.segmentItem,
                                                active && { backgroundColor: opt === 'expense' ? theme.colors.danger : theme.colors.success },
                                            ]}
                                        >
                                            <Text style={{ color: active ? '#fff' : theme.colors.textSecondary, fontWeight: '600', fontSize: 13 }}>
                                                {opt === 'expense' ? 'Expense' : 'Income'}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                            <View style={[styles.searchBox, { backgroundColor: theme.colors.inputBg, borderColor: theme.colors.inputBorder, marginBottom: 0, marginTop: spacing.sm }]}>
                                <MaterialCommunityIcons name="arrow-collapse-down" size={18} color={theme.colors.textTertiary} />
                                <TextInput
                                    value={amountLimit}
                                    onChangeText={(txt) => setAmountLimit(txt.replace(/[^0-9.]/g, ''))}
                                    placeholder={`Show ${amountType} up to limit...`}
                                    placeholderTextColor={theme.colors.textTertiary}
                                    keyboardType="numeric"
                                    style={[styles.searchInput, { color: theme.colors.text }]}
                                />
                                {amountLimit ? (
                                    <TouchableOpacity onPress={() => setAmountLimit('')}>
                                        <MaterialCommunityIcons name="close-circle" size={18} color={theme.colors.textTertiary} />
                                    </TouchableOpacity>
                                ) : null}
                            </View>
                        </View>

                        {/* Apply filters to stats */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 }}>
                            <View style={{ flex: 1, marginRight: spacing.sm }}>
                                <Text style={{ color: theme.colors.text, fontWeight: '600', fontSize: 13 }}>Apply filters to stats</Text>
                                <Text style={{ color: theme.colors.textTertiary, fontSize: 10 }}>Reflect the active filters in the summary cards</Text>
                            </View>
                            <Switch
                                value={applyFiltersToStats}
                                onValueChange={setApplyFiltersToStats}
                                trackColor={{ true: theme.colors.primary }}
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
                extraData={{ selectionMode, selectedIds }}
                contentContainerStyle={{ padding: spacing.md, paddingTop: 0, paddingBottom: selectionMode ? 96 : spacing.md, gap: spacing.sm }}
                refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refresh} tintColor={theme.colors.primary} />}
                ListEmptyComponent={
                    <EmptyState
                        icon="swap-horizontal"
                        title={filtersActive ? 'No matching transactions' : 'No transactions yet'}
                        subtitle={filtersActive ? 'Try changing the search or filters' : 'Tap the + button at the bottom to add your first transaction. Tap to edit, swipe left to delete, long-press to select.'}
                    />
                }
            />

            {/* Bulk selection action bar */}
            {selectionMode && (
                <View style={[styles.selectionBar, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}>
                    <TouchableOpacity onPress={toggleSelectAll} style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }} activeOpacity={0.7}>
                        <MaterialCommunityIcons
                            name={allSelected ? 'checkbox-marked' : 'checkbox-blank-outline'}
                            size={22}
                            color={allSelected ? theme.colors.primary : theme.colors.textTertiary}
                        />
                        <Text style={{ color: theme.colors.text, fontWeight: '700', marginLeft: spacing.sm }}>
                            {selectedIds.length} selected
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => {
                            setSelectionMode(false);
                            setSelectedIds([]);
                        }}
                        style={[styles.selectionActionBtn, { borderColor: theme.colors.cardBorder, borderWidth: 1 }]}
                        activeOpacity={0.7}
                    >
                        <Text style={{ color: theme.colors.textSecondary, fontWeight: '600' }}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={doBulkDelete}
                        disabled={selectedIds.length === 0}
                        style={[styles.selectionActionBtn, { backgroundColor: theme.colors.danger, opacity: selectedIds.length === 0 ? 0.5 : 1 }]}
                        activeOpacity={0.7}
                    >
                        <MaterialCommunityIcons name="trash-can-outline" size={16} color="#fff" />
                        <Text style={{ color: '#fff', fontWeight: '700', marginLeft: 4 }}>Delete</Text>
                    </TouchableOpacity>
                </View>
            )}

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
        flex: 1,
        textAlign: 'center',
    },
    navButton: {
        padding: 4,
        width: 32,
        alignItems: 'center',
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
    segment: {
        flexDirection: 'row',
        borderWidth: 1,
        borderRadius: radius.md,
        padding: 3,
        gap: 3,
    },
    segmentItem: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        borderRadius: radius.sm,
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
    selectionBar: {
        position: 'absolute',
        left: spacing.md,
        right: spacing.md,
        bottom: spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: radius.lg,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 6,
    },
    selectionActionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: 8,
        borderRadius: radius.md,
    },
});
