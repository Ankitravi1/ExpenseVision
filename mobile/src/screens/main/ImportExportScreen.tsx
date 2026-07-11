import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Card, Input, Button, ChipSelector, FieldLabel, OptionSheet, DateField, successHaptic } from '../../components/ui';
import { ScreenHeader } from '../../components/ScreenHeader';
import { apiFetch } from '../../services/api';
import { getAiSettings } from '../../services/aiSettings';
import { csvField, shareReportCsv } from '../../utils/exportCsv';
import { formatCurrency } from '../../utils/currency';
import { isoDateToDisplay } from '../../utils/date';
import { spacing, radius } from '../../theme';
import { TransactionType } from '../../types';

const genId = () => `row-${Date.now()}-${Math.random().toString(36).slice(2)}`;

interface DraftRow {
    localId: string;
    date: string; // YYYY-MM-DD
    time: string; // HH:mm
    note: string;
    amount: number;
    type: TransactionType;
    accountId: string;
    categoryId: string;
    transferToAccountId: string;
    included: boolean;
    isDuplicate: boolean;
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

// Format a Date as YYYY-MM-DD in local time (never toISOString — that shifts by TZ).
const formatIsoDate = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
};

export default function ImportExportScreen() {
    const { accounts, categories, transactions, refresh } = useData();
    const { user } = useAuth();
    const { theme } = useTheme();
    const currency = user?.currency || 'INR';
    const [tab, setTab] = useState<'import' | 'export'>('import');

    // ---------------- Import tab state ----------------
    const [pastedText, setPastedText] = useState('');
    const [bankName, setBankName] = useState('');
    const [aiSettings, setAiSettings] = useState<any>(null);
    const [aiSettingsLoading, setAiSettingsLoading] = useState(true);
    const [parsing, setParsing] = useState(false);
    const [importError, setImportError] = useState('');
    const [drafts, setDrafts] = useState<DraftRow[]>([]);
    const [detectDuplicates, setDetectDuplicates] = useState(true);
    const [importing, setImporting] = useState(false);
    const [importedCount, setImportedCount] = useState<number | null>(null);

    const loadAiSettings = useCallback(() => {
        getAiSettings()
            .then(setAiSettings)
            .catch(() => setAiSettings(null))
            .finally(() => setAiSettingsLoading(false));
    }, []);
    useFocusEffect(loadAiSettings);

    const isAiImportEnabled = !!aiSettings?.enabled &&
        aiSettings?.importEnabled !== false &&
        !!(aiSettings?.keys && aiSettings.keys[aiSettings.provider]?.length > 0);

    const checkIsDuplicate = useCallback((row: { date: string; amount: number }) => {
        const rowDate = row.date.substring(0, 10);
        return transactions.some(t => t.date.substring(0, 10) === rowDate && Math.abs(t.amount - row.amount) < 0.01);
    }, [transactions]);

    const resetImportState = () => {
        setPastedText('');
        setBankName('');
        setDrafts([]);
        setImportError('');
        setDetectDuplicates(true);
    };

    const handleParse = async () => {
        setImportError('');
        if (!aiSettingsLoading && !isAiImportEnabled) {
            setImportError('AI Statement Import is disabled or has no API key configured. Enable it in Settings → AI Settings first.');
            return;
        }
        if (!pastedText.trim() || pastedText.trim().length < 10) {
            setImportError('Paste some statement text first.');
            return;
        }

        setParsing(true);
        try {
            const textForAi = bankName.trim() ? `Bank / card issuer: ${bankName.trim()}\n\n${pastedText}` : pastedText;
            const res = await apiFetch('/transactions/parse-statement', {
                method: 'POST',
                body: JSON.stringify({ text: textForAi }),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || 'Failed to parse statement text');
            }
            const result = await res.json();
            const rawDrafts: any[] = result.drafts || [];

            const mapped: DraftRow[] = rawDrafts.map((d: any) => {
                const type: TransactionType = ['income', 'expense', 'transfer'].includes(d.type) ? d.type : 'expense';
                const base = {
                    localId: genId(),
                    date: d.date || formatIsoDate(new Date()),
                    time: '12:00',
                    note: d.note || '',
                    amount: Number(d.amount) || 0,
                    type,
                    accountId: d.accountId || accounts.find(a => !a.frozen)?.id || '',
                    categoryId: type === 'transfer' ? '' : (d.categoryId || categories.find(c => c.type === type)?.id || ''),
                    transferToAccountId: type === 'transfer' ? (d.transferToAccountId || '') : '',
                };
                const dup = detectDuplicates && checkIsDuplicate(base);
                return { ...base, isDuplicate: dup, included: !dup };
            });

            if (mapped.length === 0) {
                setImportError('AI did not find any transactions in this statement.');
                return;
            }

            setDrafts(mapped);
        } catch (err: any) {
            setImportError(err.message || 'Failed to parse statement');
        } finally {
            setParsing(false);
        }
    };

    const updateRow = (localId: string, patch: Partial<DraftRow>) => {
        setDrafts(prev => prev.map(r => (r.localId === localId ? { ...r, ...patch } : r)));
    };

    const toggleIncluded = (localId: string) => {
        setDrafts(prev => prev.map(r => (r.localId === localId ? { ...r, included: !r.included } : r)));
    };

    const allSelected = drafts.length > 0 && drafts.every(r => r.included);
    const toggleSelectAll = () => {
        setDrafts(prev => prev.map(r => ({ ...r, included: !allSelected })));
    };

    const applyDuplicateDetection = (enabled: boolean) => {
        setDetectDuplicates(enabled);
        setDrafts(prev => prev.map(r => {
            const dup = enabled && checkIsDuplicate(r);
            return { ...r, isDuplicate: dup, included: dup ? false : r.included };
        }));
    };

    const removeChecked = () => {
        const toRemove = drafts.filter(r => r.included).length;
        if (toRemove === 0) {
            Alert.alert('Nothing selected', 'Check the rows you want to remove from this preview first.');
            return;
        }
        Alert.alert(
            'Remove selected rows',
            `Remove ${toRemove} row(s) from this preview? This only affects the preview — nothing has been imported yet.`,
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Remove', style: 'destructive', onPress: () => setDrafts(prev => prev.filter(r => !r.included)) },
            ]
        );
    };

    const includedCount = drafts.filter(r => r.included).length;

    const handleCommit = async () => {
        const rows = drafts.filter(r => r.included);
        if (rows.length === 0) {
            Alert.alert('Nothing selected', 'Select at least one transaction to import.');
            return;
        }
        if (rows.length > 500) {
            Alert.alert('Too many rows', 'Bulk import is limited to 500 transactions per batch. Deselect some rows and import in smaller batches.');
            return;
        }

        setImporting(true);
        try {
            const payload = rows.map(r => ({
                type: r.type,
                date: `${r.date}T${r.time || '12:00'}`,
                amount: r.amount,
                note: r.note,
                accountId: r.accountId || accounts.find(a => !a.frozen)?.id || '',
                categoryId: r.type === 'transfer' ? undefined : (r.categoryId || undefined),
                transferToAccountId: r.type === 'transfer' ? (r.transferToAccountId || undefined) : undefined,
            }));

            const res = await apiFetch('/transactions/bulk', {
                method: 'POST',
                body: JSON.stringify({ transactions: payload }),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || 'Failed to import transactions');
            }

            await refresh();
            successHaptic();
            const count = payload.length;
            // Fully reset local state so the same batch can't be re-imported by accident.
            resetImportState();
            setImportedCount(count);
        } catch (err: any) {
            Alert.alert('Import failed', err.message || 'Failed to import transactions');
        } finally {
            setImporting(false);
        }
    };

    const renderDraftRow = (row: DraftRow) => {
        const rowAccounts = accounts.filter(a => !a.frozen || a.id === row.accountId);
        const rowTransferAccounts = accounts.filter(a => a.id !== row.accountId && (!a.frozen || a.id === row.transferToAccountId));
        const rowCategories = categories.filter(c => c.type === row.type);

        return (
            <Card key={row.localId} style={{ marginBottom: spacing.sm, opacity: row.included ? 1 : 0.55 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm }}>
                    <TouchableOpacity
                        onPress={() => toggleIncluded(row.localId)}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                        <MaterialCommunityIcons
                            name={row.included ? 'checkbox-marked' : 'checkbox-blank-outline'}
                            size={20}
                            color={row.included ? theme.colors.primary : theme.colors.textTertiary}
                        />
                        <Text style={{ color: theme.colors.text, fontWeight: '700', fontSize: 13 }}>
                            {formatCurrency(row.amount, currency)}
                        </Text>
                    </TouchableOpacity>
                    {row.isDuplicate ? (
                        <View style={{ backgroundColor: theme.colors.warning, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 }}>
                            <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>Possible duplicate</Text>
                        </View>
                    ) : null}
                </View>

                <ChipSelector
                    options={[
                        { value: 'expense', label: 'Expense' },
                        { value: 'income', label: 'Income' },
                        { value: 'transfer', label: 'Transfer' },
                    ]}
                    value={row.type}
                    onChange={v => updateRow(row.localId, {
                        type: v as TransactionType,
                        categoryId: v === 'transfer' ? '' : (categories.find(c => c.type === v)?.id || ''),
                        transferToAccountId: v === 'transfer' ? row.transferToAccountId : '',
                    })}
                />

                <Input label="Note" value={row.note} onChangeText={v => updateRow(row.localId, { note: v })} placeholder="Transaction detail" />

                <View style={{ flexDirection: 'row', gap: spacing.md }}>
                    <View style={{ flex: 1 }}>
                        <Input
                            label="Amount"
                            value={String(row.amount)}
                            keyboardType="decimal-pad"
                            onChangeText={v => updateRow(row.localId, { amount: parseFloat(v) || 0 })}
                        />
                    </View>
                    <View style={{ flex: 1 }}>
                        <DateField label="Date" value={row.date} onChange={v => updateRow(row.localId, { date: v })} />
                    </View>
                </View>

                <OptionSheet
                    label={row.type === 'transfer' ? 'From account' : 'Account'}
                    options={rowAccounts.map(a => ({ value: a.id, label: a.frozen ? `${a.name} (frozen)` : a.name, sublabel: a.type }))}
                    value={row.accountId || null}
                    onChange={v => updateRow(row.localId, { accountId: v })}
                />

                {row.type === 'transfer' ? (
                    <OptionSheet
                        label="To account"
                        options={rowTransferAccounts.map(a => ({ value: a.id, label: a.frozen ? `${a.name} (frozen)` : a.name, sublabel: a.type }))}
                        value={row.transferToAccountId || null}
                        onChange={v => updateRow(row.localId, { transferToAccountId: v })}
                    />
                ) : (
                    <OptionSheet
                        label="Category"
                        options={rowCategories.map(c => ({ value: c.id, label: c.name, icon: c.icon }))}
                        value={row.categoryId || null}
                        onChange={v => updateRow(row.localId, { categoryId: v })}
                    />
                )}
            </Card>
        );
    };

    // ---------------- Export tab state ----------------
    const [viewMode, setViewMode] = useState<ViewMode>('Monthly');
    const [exportDate, setExportDate] = useState(new Date());
    const [customStart, setCustomStart] = useState(() => formatIsoDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1)));
    const [customEnd, setCustomEnd] = useState(() => formatIsoDate(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)));
    const [carryOver, setCarryOver] = useState(true);
    const [exporting, setExporting] = useState(false);

    const shiftExportDate = (direction: -1 | 1) => {
        if (viewMode === 'Custom') return;
        const next = new Date(exportDate);
        if (viewMode === 'Daily') {
            next.setDate(next.getDate() + direction);
        } else if (viewMode === 'Weekly') {
            next.setDate(next.getDate() + direction * 7);
        } else if (viewMode === 'Yearly') {
            next.setFullYear(next.getFullYear() + direction);
        } else if (viewMode === '3 Month') {
            // Anchor to day 1 before month arithmetic, then jump 3 whole calendar months.
            next.setDate(1);
            next.setMonth(next.getMonth() + direction * 3);
        } else {
            next.setDate(1);
            next.setMonth(next.getMonth() + direction);
        }
        setExportDate(next);
    };

    const exportRange = useMemo(() => {
        if (viewMode === 'Custom') {
            return { start: customStart, end: customEnd };
        }
        let start: Date;
        let end: Date;
        switch (viewMode) {
            case 'Daily':
                start = exportDate; end = exportDate; break;
            case 'Weekly':
                start = new Date(exportDate);
                start.setDate(exportDate.getDate() - exportDate.getDay());
                end = new Date(start);
                end.setDate(start.getDate() + 6);
                break;
            case '3 Month':
                start = new Date(exportDate.getFullYear(), exportDate.getMonth() - 2, 1);
                end = new Date(exportDate.getFullYear(), exportDate.getMonth() + 1, 0);
                break;
            case 'Yearly':
                start = new Date(exportDate.getFullYear(), 0, 1);
                end = new Date(exportDate.getFullYear(), 11, 31);
                break;
            default:
                start = new Date(exportDate.getFullYear(), exportDate.getMonth(), 1);
                end = new Date(exportDate.getFullYear(), exportDate.getMonth() + 1, 0);
        }
        return { start: formatIsoDate(start), end: formatIsoDate(end) };
    }, [viewMode, exportDate, customStart, customEnd]);

    const getExportPeriodLabel = () => {
        if (viewMode === 'Custom') return `${isoDateToDisplay(exportRange.start)} - ${isoDateToDisplay(exportRange.end)}`;
        if (viewMode === 'Daily') return exportDate.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
        if (viewMode === 'Weekly') {
            const start = new Date(exportDate);
            start.setDate(exportDate.getDate() - exportDate.getDay());
            const end = new Date(start);
            end.setDate(start.getDate() + 6);
            return `${start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
        }
        if (viewMode === '3 Month') {
            const startM = new Date(exportDate.getFullYear(), exportDate.getMonth() - 2, 1);
            const endM = new Date(exportDate.getFullYear(), exportDate.getMonth(), 1);
            const startLabel = startM.toLocaleDateString(undefined, { month: 'short' });
            const endLabel = endM.toLocaleDateString(undefined, { month: 'short' });
            return startM.getFullYear() === endM.getFullYear()
                ? `${startLabel} - ${endLabel} ${endM.getFullYear()}`
                : `${startLabel} ${startM.getFullYear()} - ${endLabel} ${endM.getFullYear()}`;
        }
        if (viewMode === 'Yearly') return String(exportDate.getFullYear());
        return exportDate.toLocaleString('default', { month: 'long', year: 'numeric' });
    };

    const exportFiltered = useMemo(() => {
        return [...transactions]
            .filter(t => {
                const d = t.date.substring(0, 10);
                return d >= exportRange.start && d <= exportRange.end;
            })
            .sort((a, b) => b.date.localeCompare(a.date));
    }, [transactions, exportRange]);

    const preRangeBalance = useMemo(() => {
        const accountsInitialBalanceSum = accounts.reduce((sum, acc) => sum + (acc.initialBalance ?? acc.balance ?? 0), 0);
        const preTxs = transactions.filter(t => t.date.substring(0, 10) < exportRange.start);
        let incomeAndTransfersIn = 0;
        let expenseAndTransfersOut = 0;
        for (const t of preTxs) {
            if (t.type === 'income') incomeAndTransfersIn += t.amount;
            else if (t.type === 'expense') expenseAndTransfersOut += t.amount;
            else if (t.type === 'transfer') { incomeAndTransfersIn += t.amount; expenseAndTransfersOut += t.amount; }
        }
        return incomeAndTransfersIn - expenseAndTransfersOut + accountsInitialBalanceSum;
    }, [transactions, accounts, exportRange.start]);

    const exportStats = useMemo(() => {
        const income = exportFiltered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
        const expense = exportFiltered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
        return { income, expense };
    }, [exportFiltered]);

    const displayBalance = carryOver
        ? preRangeBalance + exportStats.income - exportStats.expense
        : exportStats.income - exportStats.expense;

    const handleExportCsv = async () => {
        if (exportFiltered.length === 0) {
            Alert.alert('Nothing to export', 'No transactions in this period to export.');
            return;
        }
        setExporting(true);
        try {
            const headers = ['Date', 'Time', 'Note', 'Amount', 'Account', 'Type', 'Category', 'Transfer To'];
            const rows = exportFiltered.map(t => {
                const category = categories.find(c => c.id === t.categoryId);
                const account = accounts.find(a => a.id === t.accountId);
                const transferAccount = t.transferToAccountId ? accounts.find(a => a.id === t.transferToAccountId) : null;
                const timePart = t.date.includes('T') ? t.date.split('T')[1]?.slice(0, 5) : '';
                return [
                    isoDateToDisplay(t.date),
                    timePart || '',
                    t.note,
                    t.amount.toFixed(2),
                    account?.name || '',
                    t.type,
                    category?.name || (t.type === 'transfer' ? 'Transfer' : ''),
                    transferAccount?.name || '',
                ].map(csvField).join(',');
            });
            const csv = [headers.map(csvField).join(','), ...rows].join('\n');
            const fileName = `transactions_${exportRange.start}_to_${exportRange.end}.csv`;
            await shareReportCsv(csv, fileName);
        } catch (err: any) {
            Alert.alert('Export failed', err.message || 'Could not export transactions');
        } finally {
            setExporting(false);
        }
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['top']}>
            <ScreenHeader title="Import / Export" />
            <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl }} keyboardShouldPersistTaps="handled">
                <ChipSelector
                    options={[
                        { value: 'import', label: 'Import' },
                        { value: 'export', label: 'Export' },
                    ]}
                    value={tab}
                    onChange={v => setTab(v as 'import' | 'export')}
                />

                {tab === 'import' ? (
                    importedCount !== null ? (
                        <Card style={{ alignItems: 'center', paddingVertical: spacing.xl }}>
                            <MaterialCommunityIcons name="check-circle" size={48} color={theme.colors.success} />
                            <Text style={{ color: theme.colors.text, fontWeight: '800', fontSize: 16, marginTop: spacing.md }}>
                                Imported {importedCount} transaction{importedCount === 1 ? '' : 's'}
                            </Text>
                            <Text style={{ color: theme.colors.textTertiary, fontSize: 13, marginTop: 4 }}>
                                Your transactions have been added.
                            </Text>
                            <Button
                                title="Import another statement"
                                onPress={() => setImportedCount(null)}
                                style={{ marginTop: spacing.md, alignSelf: 'stretch' }}
                            />
                        </Card>
                    ) : drafts.length > 0 ? (
                        <>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.md, marginBottom: spacing.sm }}>
                                <Text style={{ color: theme.colors.text, fontWeight: '800', fontSize: 15 }}>
                                    Review ({drafts.length})
                                </Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                    <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>Detect duplicates</Text>
                                    <Switch value={detectDuplicates} onValueChange={applyDuplicateDetection} trackColor={{ true: theme.colors.primary }} />
                                </View>
                            </View>

                            <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm }}>
                                <TouchableOpacity onPress={toggleSelectAll} style={[styles.smallBtn, { borderColor: theme.colors.cardBorder }]}>
                                    <Text style={{ color: theme.colors.text, fontWeight: '700', fontSize: 12 }}>
                                        {allSelected ? 'Unselect all' : 'Select all'}
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={removeChecked} style={[styles.smallBtn, { borderColor: theme.colors.danger }]}>
                                    <Text style={{ color: theme.colors.danger, fontWeight: '700', fontSize: 12 }}>Remove checked</Text>
                                </TouchableOpacity>
                            </View>

                            {drafts.map(renderDraftRow)}

                            <Text style={{ color: theme.colors.textTertiary, fontSize: 12, marginBottom: spacing.sm }}>
                                {includedCount} of {drafts.length} selected for import
                            </Text>

                            <Button
                                title={importing ? 'Importing...' : `Import ${includedCount} transaction${includedCount === 1 ? '' : 's'}`}
                                onPress={handleCommit}
                                loading={importing}
                                disabled={includedCount === 0}
                            />
                            <TouchableOpacity onPress={resetImportState} style={{ alignItems: 'center', marginTop: spacing.md }}>
                                <Text style={{ color: theme.colors.textSecondary, fontWeight: '600', fontSize: 13 }}>Start over</Text>
                            </TouchableOpacity>
                        </>
                    ) : (
                        <>
                            <Card style={{ marginTop: spacing.md, marginBottom: spacing.md }}>
                                <Text style={{ color: theme.colors.text, fontWeight: '700', fontSize: 14, marginBottom: 6 }}>
                                    How the AI maps fields
                                </Text>
                                <Text style={{ color: theme.colors.textSecondary, fontSize: 12, lineHeight: 19 }}>
                                    Expense = Debit entries{'\n'}
                                    Income = Credit entries{'\n'}
                                    Category = decided by AI from your existing categories{'\n'}
                                    Note = transaction detail / summary line{'\n'}
                                    Date = transaction date{'\n'}
                                    Time = AI-extracted if present, otherwise defaults to 12:00
                                </Text>
                            </Card>

                            {!aiSettingsLoading && !isAiImportEnabled ? (
                                <Card style={{ marginBottom: spacing.md, backgroundColor: theme.colors.dangerBg, borderColor: theme.colors.danger }}>
                                    <Text style={{ color: theme.colors.danger, fontSize: 12, fontWeight: '600', lineHeight: 18 }}>
                                        AI Statement Import is disabled or has no API key configured. Enable it and add an API key in Settings → AI Settings before parsing a statement.
                                    </Text>
                                </Card>
                            ) : null}

                            <Input
                                label="Bank name (optional)"
                                value={bankName}
                                onChangeText={setBankName}
                                placeholder="e.g. HDFC Bank, Chase, American Express..."
                            />
                            <FieldLabel>Statement text</FieldLabel>
                            <Input
                                value={pastedText}
                                onChangeText={setPastedText}
                                placeholder="Paste your bank/card statement text here"
                                multiline
                                numberOfLines={8}
                                textAlignVertical="top"
                                style={{ minHeight: 160 }}
                            />

                            {importError ? (
                                <Text style={{ color: theme.colors.danger, fontSize: 12, marginBottom: spacing.md }}>{importError}</Text>
                            ) : null}

                            <Button title={parsing ? 'Parsing...' : 'Parse with AI'} onPress={handleParse} loading={parsing} />
                        </>
                    )
                ) : (
                    <>
                        <View style={{ marginTop: spacing.md }}>
                            <ChipSelector
                                options={VIEW_MODE_OPTIONS}
                                value={viewMode}
                                onChange={v => setViewMode(v as ViewMode)}
                            />
                        </View>

                        <View style={[styles.periodNavigator, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}>
                            {viewMode !== 'Custom' ? (
                                <TouchableOpacity onPress={() => shiftExportDate(-1)} style={styles.navButton}>
                                    <MaterialCommunityIcons name="chevron-left" size={24} color={theme.colors.text} />
                                </TouchableOpacity>
                            ) : (
                                <View style={styles.navButton} />
                            )}
                            <Text style={[styles.periodText, { color: theme.colors.text }]} numberOfLines={1}>
                                {getExportPeriodLabel()}
                            </Text>
                            {viewMode !== 'Custom' ? (
                                <TouchableOpacity onPress={() => shiftExportDate(1)} style={styles.navButton}>
                                    <MaterialCommunityIcons name="chevron-right" size={24} color={theme.colors.text} />
                                </TouchableOpacity>
                            ) : (
                                <View style={styles.navButton} />
                            )}
                        </View>

                        {viewMode === 'Custom' ? (
                            <View style={{ flexDirection: 'row', gap: spacing.md }}>
                                <View style={{ flex: 1 }}>
                                    <DateField label="From" value={customStart} onChange={setCustomStart} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <DateField label="To" value={customEnd} onChange={setCustomEnd} />
                                </View>
                            </View>
                        ) : null}

                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4, marginBottom: spacing.sm }}>
                            <View style={{ flex: 1, marginRight: spacing.sm }}>
                                <Text style={{ color: theme.colors.text, fontWeight: '600', fontSize: 13 }}>Carry Over Balance</Text>
                                <Text style={{ color: theme.colors.textTertiary, fontSize: 10 }}>Factor in previous transactions and initial balances</Text>
                            </View>
                            <Switch value={carryOver} onValueChange={setCarryOver} trackColor={{ true: theme.colors.primary }} />
                        </View>

                        <Card style={{ padding: spacing.md, marginBottom: spacing.md }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ color: theme.colors.textSecondary, fontSize: 11, fontWeight: '600' }}>Income</Text>
                                    <Text style={{ color: theme.colors.success, fontSize: 15, fontWeight: '700', marginTop: 2 }} numberOfLines={1}>
                                        {formatCurrency(exportStats.income, currency)}
                                    </Text>
                                </View>
                                <View style={{ flex: 1, borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: theme.colors.separator, paddingLeft: spacing.md }}>
                                    <Text style={{ color: theme.colors.textSecondary, fontSize: 11, fontWeight: '600' }}>Expense</Text>
                                    <Text style={{ color: theme.colors.danger, fontSize: 15, fontWeight: '700', marginTop: 2 }} numberOfLines={1}>
                                        {formatCurrency(exportStats.expense, currency)}
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

                        <Text style={{ color: theme.colors.textSecondary, fontSize: 12, fontWeight: '700', marginBottom: spacing.sm }}>
                            {exportFiltered.length} transaction{exportFiltered.length === 1 ? '' : 's'} in this period
                        </Text>

                        {exportFiltered.length === 0 ? (
                            <Card style={{ alignItems: 'center', paddingVertical: spacing.lg, marginBottom: spacing.md }}>
                                <MaterialCommunityIcons name="swap-horizontal" size={36} color={theme.colors.textTertiary} />
                                <Text style={{ color: theme.colors.textSecondary, marginTop: spacing.sm }}>No transactions in this period</Text>
                            </Card>
                        ) : (
                            exportFiltered.map(t => {
                                const cat = categories.find(c => c.id === t.categoryId);
                                const acc = accounts.find(a => a.id === t.accountId);
                                const isIncome = t.type === 'income';
                                return (
                                    <View key={t.id} style={[styles.txRow, { borderColor: theme.colors.cardBorder, backgroundColor: theme.colors.card }]}>
                                        <View style={{ flex: 1, marginRight: spacing.sm }}>
                                            <Text style={{ color: theme.colors.text, fontWeight: '600' }} numberOfLines={1}>{t.note}</Text>
                                            <Text style={{ color: theme.colors.textTertiary, fontSize: 11 }} numberOfLines={1}>
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
                                    </View>
                                );
                            })
                        )}

                        <Button
                            title={exporting ? 'Exporting...' : 'Export CSV'}
                            onPress={handleExportCsv}
                            loading={exporting}
                            style={{ marginTop: spacing.sm }}
                        />
                    </>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    smallBtn: {
        paddingHorizontal: spacing.md,
        paddingVertical: 8,
        borderRadius: radius.md,
        borderWidth: 1,
    },
    periodNavigator: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
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
    txRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: spacing.md,
        borderRadius: radius.md,
        borderWidth: 1,
        marginBottom: spacing.sm,
    },
});
