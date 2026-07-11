import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useTheme } from '../../context/ThemeContext';
import { Button } from '../../components/ui';
import { ScreenHeader } from '../../components/ScreenHeader';
import { RecurringForm } from '../../components/RecurringForm';
import { apiFetch } from '../../services/api';
import { formatCurrency } from '../../utils/currency';
import { isoDateToDisplay } from '../../utils/date';
import { spacing, radius } from '../../theme';
import { RecurringRule, Transaction } from '../../types';

const frequencyLabels: Record<string, string> = {
    daily: 'Daily',
    weekly: 'Weekly',
    monthly: 'Monthly',
    yearly: 'Yearly',
};

const RuleCard: React.FC<{
    rule: RecurringRule;
    transactions: Transaction[];
    currency: string;
    onEdit: (r: RecurringRule) => void;
    onDelete: (r: RecurringRule) => void;
}> = ({ rule, transactions, currency, onEdit, onDelete }) => {
    const { theme } = useTheme();
    const { updateRecurring, refresh } = useData();
    const [showHistory, setShowHistory] = useState(false);
    const [busy, setBusy] = useState(false);

    // Mirror web: transactions this rule has produced follow the "<note>, recurring"
    // convention and match the rule's account + amount.
    const ruleTransactions = useMemo(() => {
        const expectedNote = rule.note ? `${rule.note}, recurring` : 'recurring';
        return transactions
            .filter(t =>
                t.accountId === rule.accountId &&
                t.amount === rule.amount &&
                (t.note === expectedNote || t.note === rule.note || t.note.startsWith(expectedNote))
            )
            .sort((a, b) => b.date.substring(0, 10).localeCompare(a.date.substring(0, 10)));
    }, [transactions, rule]);

    const toggleActive = async () => {
        setBusy(true);
        try {
            await updateRecurring(rule.id, { active: !rule.active });
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to update rule');
        } finally {
            setBusy(false);
        }
    };

    const runNow = () => {
        Alert.alert('Run now', `Create a "${rule.note}" transaction now?`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Run',
                onPress: async () => {
                    setBusy(true);
                    try {
                        const res = await apiFetch(`/recurring/${rule.id}/run`, { method: 'POST' });
                        if (!res.ok) {
                            const err = await res.json().catch(() => ({} as any));
                            throw new Error(err.error || 'Failed to run rule');
                        }
                        await refresh();
                    } catch (err: any) {
                        Alert.alert('Error', err.message || 'Failed to run rule');
                    } finally {
                        setBusy(false);
                    }
                },
            },
        ]);
    };

    const typeColor = rule.type === 'income' ? theme.colors.success : rule.type === 'expense' ? theme.colors.danger : theme.colors.textSecondary;

    return (
        <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, opacity: rule.active ? 1 : 0.7 }]}>
            <TouchableOpacity activeOpacity={0.7} onPress={() => onEdit(rule)}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <View style={{ flex: 1, paddingRight: spacing.sm }}>
                        <Text style={{ color: theme.colors.text, fontWeight: '700', fontSize: 15 }} numberOfLines={1}>{rule.note}</Text>
                        <Text style={{ color: theme.colors.textTertiary, fontSize: 11, marginTop: 3 }}>
                            {frequencyLabels[rule.frequency] || rule.frequency} · next {isoDateToDisplay(rule.nextRun)}
                            {rule.endDate ? ` · ends ${isoDateToDisplay(rule.endDate)}` : ''}
                        </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                        <Text style={{ fontWeight: '800', color: typeColor }}>
                            {rule.type === 'income' ? '+' : rule.type === 'expense' ? '-' : ''}{formatCurrency(rule.amount, currency)}
                        </Text>
                        <Text style={{ fontSize: 10, fontWeight: '700', color: rule.active ? theme.colors.success : theme.colors.textTertiary, marginTop: 2 }}>
                            {rule.active ? 'ACTIVE' : 'PAUSED'}
                        </Text>
                    </View>
                </View>
            </TouchableOpacity>

            {/* History expander */}
            {ruleTransactions.length > 0 ? (
                <TouchableOpacity
                    onPress={() => setShowHistory(v => !v)}
                    style={{ flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm }}
                >
                    <Text style={{ color: theme.colors.primary, fontSize: 12, fontWeight: '600' }}>
                        History ({ruleTransactions.length})
                    </Text>
                    <MaterialCommunityIcons name={showHistory ? 'chevron-up' : 'chevron-down'} size={16} color={theme.colors.primary} />
                </TouchableOpacity>
            ) : null}
            {showHistory && ruleTransactions.length > 0 ? (
                <View style={[styles.history, { backgroundColor: theme.colors.background, borderColor: theme.colors.separator }]}>
                    {ruleTransactions.map(t => (
                        <View key={t.id} style={styles.historyRow}>
                            <Text style={{ color: theme.colors.textSecondary, fontSize: 11, fontWeight: '600' }}>{isoDateToDisplay(t.date)}</Text>
                            <Text style={{ color: theme.colors.textTertiary, fontSize: 11, flex: 1, textAlign: 'right' }} numberOfLines={1}>{t.note}</Text>
                        </View>
                    ))}
                </View>
            ) : null}

            {/* Action row */}
            <View style={[styles.actions, { borderTopColor: theme.colors.separator }]}>
                <TouchableOpacity
                    onPress={toggleActive}
                    disabled={busy}
                    style={[styles.actionBtn, { borderColor: theme.colors.cardBorder }]}
                >
                    <MaterialCommunityIcons name={rule.active ? 'pause' : 'play'} size={14} color={rule.active ? theme.colors.textSecondary : theme.colors.success} />
                    <Text style={{ color: rule.active ? theme.colors.textSecondary : theme.colors.success, fontSize: 12, fontWeight: '700', marginLeft: 4 }}>
                        {rule.active ? 'Pause' : 'Resume'}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={runNow}
                    disabled={busy}
                    style={[styles.actionBtn, { borderColor: theme.colors.warning }]}
                >
                    {busy ? (
                        <ActivityIndicator size="small" color={theme.colors.warning} />
                    ) : (
                        <>
                            <MaterialCommunityIcons name="play-circle-outline" size={14} color={theme.colors.warning} />
                            <Text style={{ color: theme.colors.warning, fontSize: 12, fontWeight: '700', marginLeft: 4 }}>Run Now</Text>
                        </>
                    )}
                </TouchableOpacity>

                <View style={{ flex: 1 }} />

                <TouchableOpacity onPress={() => onEdit(rule)} style={styles.iconBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <MaterialCommunityIcons name="pencil-outline" size={18} color={theme.colors.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => onDelete(rule)} style={styles.iconBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <MaterialCommunityIcons name="trash-can-outline" size={18} color={theme.colors.danger} />
                </TouchableOpacity>
            </View>
        </View>
    );
};

export default function RecurringScreen() {
    const { user } = useAuth();
    const { recurring, transactions, deleteRecurring } = useData();
    const { theme } = useTheme();
    const [showRecurringForm, setShowRecurringForm] = useState(false);
    const [editingRule, setEditingRule] = useState<RecurringRule | null>(null);
    const currency = user?.currency || 'INR';

    const sortedRules = useMemo(
        () => [...recurring].sort((a, b) => a.note.localeCompare(b.note)),
        [recurring]
    );

    const confirmDeleteRule = (r: RecurringRule) => {
        Alert.alert('Delete recurring', `Delete "${r.note}"? Already-created transactions stay.`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: () => deleteRecurring(r.id).catch(err => Alert.alert('Error', err.message)),
            },
        ]);
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['top']}>
            <ScreenHeader title="Recurring" />
            <ScrollView contentContainerStyle={{ padding: spacing.md }}>
                <Button
                    title="+ New Recurring"
                    variant="secondary"
                    onPress={() => {
                        setEditingRule(null);
                        setShowRecurringForm(true);
                    }}
                    style={{ marginBottom: spacing.md }}
                />

                {sortedRules.length === 0 ? (
                    <Text style={{ color: theme.colors.textTertiary, textAlign: 'center', paddingVertical: spacing.md }}>
                        Set up rent, EMI, salary and other repeating transactions — they'll be added automatically when due.
                    </Text>
                ) : (
                    sortedRules.map(r => (
                        <RuleCard
                            key={r.id}
                            rule={r}
                            transactions={transactions}
                            currency={currency}
                            onEdit={rule => {
                                setEditingRule(rule);
                                setShowRecurringForm(true);
                            }}
                            onDelete={confirmDeleteRule}
                        />
                    ))
                )}
            </ScrollView>

            <RecurringForm
                visible={showRecurringForm}
                onClose={() => {
                    setShowRecurringForm(false);
                    setEditingRule(null);
                }}
                editing={editingRule}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    card: {
        borderWidth: 1,
        borderRadius: radius.lg,
        padding: spacing.md,
        marginBottom: spacing.md,
    },
    history: {
        marginTop: spacing.sm,
        borderWidth: 1,
        borderRadius: radius.md,
        padding: spacing.sm,
        maxHeight: 140,
    },
    historyRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: spacing.sm,
        paddingVertical: 3,
    },
    actions: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: spacing.md,
        paddingTop: spacing.sm,
        borderTopWidth: StyleSheet.hairlineWidth,
        gap: spacing.sm,
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: radius.sm,
        borderWidth: 1,
        minWidth: 78,
    },
    iconBtn: {
        padding: 6,
    },
});
