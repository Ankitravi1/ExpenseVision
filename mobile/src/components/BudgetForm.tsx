import React, { useState, useEffect } from 'react';
import { Alert, Switch, Text, View } from 'react-native';
import { SheetModal, Input, Button, FieldLabel, OptionSheet, ChipSelector, successHaptic } from './ui';
import { useData } from '../context/DataContext';
import { useTheme } from '../context/ThemeContext';
import { spacing } from '../theme';
import { Budget } from '../types';

interface Props {
    visible: boolean;
    onClose: () => void;
    editing?: Budget | null;
    preSelectedCategoryId?: string | null;
    month?: string | null;
}

export const BudgetForm: React.FC<Props> = ({ visible, onClose, editing, preSelectedCategoryId, month }) => {
    const { categories, setBudget, budgets } = useData();
    const { theme } = useTheme();
    const [categoryId, setCategoryId] = useState<string | null>(null);
    const [amount, setAmount] = useState('');
    const [rollover, setRollover] = useState(false);
    const [threshold, setThreshold] = useState('80');
    const [isRecurring, setIsRecurring] = useState(true);
    const [saving, setSaving] = useState(false);

    const budgetedCategoryIds = new Set(budgets.map(b => b.categoryId));
    const expenseCategories = categories.filter(c => c.type === 'expense' && (editing || c.id === preSelectedCategoryId || !budgetedCategoryIds.has(c.id)));

    useEffect(() => {
        if (visible) {
            setCategoryId(editing?.categoryId || preSelectedCategoryId || null);
            setAmount(editing ? String(editing.amount) : '');
            setRollover(editing?.rollover ?? false);
            setThreshold(String(editing?.alertThreshold ?? 80));
            setIsRecurring(editing ? !editing.month : true);
        }
    }, [visible, editing, preSelectedCategoryId]);

    const handleSave = async () => {
        if (!categoryId) return Alert.alert('Missing category', 'Select a category.');
        const value = parseFloat(amount);
        if (!value || value <= 0) return Alert.alert('Invalid amount', 'Enter an amount greater than zero.');
        const thresholdValue = parseFloat(threshold);
        if (!thresholdValue || thresholdValue < 1 || thresholdValue > 500) {
            return Alert.alert('Invalid alert %', 'Enter a percentage between 1 and 500.');
        }

        setSaving(true);
        try {
            await setBudget({
                id: editing?.id || '',
                categoryId,
                amount: value,
                month: isRecurring ? null : (editing?.month || month || new Date().toISOString().substring(0, 7)),
                rollover,
                alertThreshold: thresholdValue,
                spent: editing?.spent ?? 0,
            });
            successHaptic();
            onClose();
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to save budget');
        } finally {
            setSaving(false);
        }
    };

    return (
        <SheetModal visible={visible} onClose={onClose} title={editing ? 'Edit Budget' : 'Set Budget'}>
            {expenseCategories.length === 0 ? (
                <Text style={{ marginBottom: 16, opacity: 0.6 }}>Create an expense category first.</Text>
            ) : (
                <OptionSheet
                    label="Category"
                    options={expenseCategories.map(c => ({ value: c.id, label: c.name, icon: c.icon }))}
                    value={categoryId}
                    onChange={setCategoryId}
                    disabled={!!editing}
                />
            )}
            <Input label="Monthly limit" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0.00" />
            
            <FieldLabel>Apply to</FieldLabel>
            <ChipSelector
                options={[
                    { value: 'recurring', label: 'All months (Recurring)' },
                    { value: 'this-month', label: 'This month only' },
                ]}
                value={isRecurring ? 'recurring' : 'this-month'}
                onChange={(v: string) => setIsRecurring(v === 'recurring')}
            />

            <Input
                label="Alert at % of budget"
                value={threshold}
                onChangeText={setThreshold}
                keyboardType="number-pad"
                placeholder="90"
            />
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg }}>
                <View style={{ flex: 1, marginRight: spacing.md }}>
                    <FieldLabel>Roll over unused budget</FieldLabel>
                    <Text style={{ color: theme.colors.textTertiary, fontSize: 12 }}>
                        Last month's leftover (or overspend) carries into this month's limit
                    </Text>
                </View>
                <Switch
                    value={rollover}
                    onValueChange={setRollover}
                    trackColor={{ true: theme.colors.primary }}
                />
            </View>
            <Button title="Save Budget" onPress={handleSave} loading={saving} />
        </SheetModal>
    );
};
