import React, { useState, useEffect } from 'react';
import { Alert, Switch, Text, View } from 'react-native';
import { SheetModal, Input, Button, FieldLabel, OptionSheet, successHaptic } from './ui';
import { useData } from '../context/DataContext';
import { useTheme } from '../context/ThemeContext';
import { spacing } from '../theme';
import { Budget } from '../types';

interface Props {
    visible: boolean;
    onClose: () => void;
    editing?: Budget | null;
}

export const BudgetForm: React.FC<Props> = ({ visible, onClose, editing }) => {
    const { categories, setBudget } = useData();
    const { theme } = useTheme();
    const [categoryId, setCategoryId] = useState<string | null>(null);
    const [amount, setAmount] = useState('');
    const [rollover, setRollover] = useState(false);
    const [threshold, setThreshold] = useState('100');
    const [saving, setSaving] = useState(false);

    const expenseCategories = categories.filter(c => c.type === 'expense');

    useEffect(() => {
        if (visible) {
            setCategoryId(editing?.categoryId || null);
            setAmount(editing ? String(editing.amount) : '');
            setRollover(editing?.rollover ?? false);
            setThreshold(String(editing?.alertThreshold ?? 100));
        }
    }, [visible, editing]);

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
            await setBudget({ categoryId, amount: value, rollover, alertThreshold: thresholdValue });
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
                />
            )}
            <Input label="Monthly limit" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0.00" />
            <Input
                label="Alert at % of budget"
                value={threshold}
                onChangeText={setThreshold}
                keyboardType="number-pad"
                placeholder="100"
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
