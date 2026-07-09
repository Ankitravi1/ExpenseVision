import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useTheme } from '../../context/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { Button } from '../../components/ui';
import { ScreenHeader } from '../../components/ScreenHeader';
import { RecurringForm } from '../../components/RecurringForm';
import { formatCurrency } from '../../utils/currency';
import { isoDateToDisplay } from '../../utils/date';
import { spacing } from '../../theme';
import { RecurringRule } from '../../types';

export default function RecurringScreen() {
    const navigation = useNavigation();
    const { user } = useAuth();
    const { recurring, deleteRecurring } = useData();
    const { theme } = useTheme();
    const [showRecurringForm, setShowRecurringForm] = useState(false);
    const [editingRule, setEditingRule] = useState<RecurringRule | null>(null);
    const currency = user?.currency || 'INR';

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

                {recurring.length === 0 ? (
                    <Text style={{ color: theme.colors.textTertiary, textAlign: 'center', paddingVertical: spacing.md }}>
                        Set up rent, EMI, salary and other repeating transactions — they'll be added automatically when due.
                    </Text>
                ) : (
                    recurring.map(r => (
                        <TouchableOpacity
                            key={r.id}
                            onPress={() => {
                                setEditingRule(r);
                                setShowRecurringForm(true);
                            }}
                            onLongPress={() => confirmDeleteRule(r)}
                            style={[styles.ruleRow, { borderBottomColor: theme.colors.separator, opacity: r.active ? 1 : 0.5 }]}
                        >
                            <View style={{ flex: 1 }}>
                                <Text style={{ color: theme.colors.text, fontWeight: '600' }}>{r.note}</Text>
                                <Text style={{ color: theme.colors.textTertiary, fontSize: 12 }}>
                                    {r.frequency} · next {isoDateToDisplay(r.nextRun)}{r.active ? '' : ' · paused'}
                                </Text>
                            </View>
                            <Text
                                style={{
                                    fontWeight: '700',
                                    color: r.type === 'income' ? theme.colors.success : r.type === 'expense' ? theme.colors.danger : theme.colors.textSecondary,
                                }}
                            >
                                {r.type === 'income' ? '+' : r.type === 'expense' ? '-' : ''}{formatCurrency(r.amount, currency)}
                            </Text>
                        </TouchableOpacity>
                    ))
                )}

                {recurring.length > 0 ? (
                    <Text style={{ color: theme.colors.textTertiary, fontSize: 12, marginTop: spacing.sm, textAlign: 'center' }}>
                        Tap to edit · long-press to delete
                    </Text>
                ) : null}
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
    ruleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
});
