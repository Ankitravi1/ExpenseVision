import React, { useState, useEffect } from 'react';
import { Alert, Text } from 'react-native';
import { SheetModal, Input, Button, ChipSelector, FieldLabel } from './ui';
import { useData } from '../context/DataContext';
import { Budget } from '../types';

interface Props {
    visible: boolean;
    onClose: () => void;
    editing?: Budget | null;
}

export const BudgetForm: React.FC<Props> = ({ visible, onClose, editing }) => {
    const { categories, setBudget } = useData();
    const [categoryId, setCategoryId] = useState<string | null>(null);
    const [amount, setAmount] = useState('');
    const [saving, setSaving] = useState(false);

    const expenseCategories = categories.filter(c => c.type === 'expense');

    useEffect(() => {
        if (visible) {
            setCategoryId(editing?.categoryId || null);
            setAmount(editing ? String(editing.amount) : '');
        }
    }, [visible, editing]);

    const handleSave = async () => {
        if (!categoryId) return Alert.alert('Missing category', 'Select a category.');
        const value = parseFloat(amount);
        if (!value || value <= 0) return Alert.alert('Invalid amount', 'Enter an amount greater than zero.');

        setSaving(true);
        try {
            await setBudget({ categoryId, amount: value });
            onClose();
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to save budget');
        } finally {
            setSaving(false);
        }
    };

    return (
        <SheetModal visible={visible} onClose={onClose} title={editing ? 'Edit Budget' : 'Set Budget'}>
            <FieldLabel>Category</FieldLabel>
            {expenseCategories.length === 0 ? (
                <Text style={{ marginBottom: 16, opacity: 0.6 }}>Create an expense category first.</Text>
            ) : (
                <ChipSelector
                    options={expenseCategories.map(c => ({ value: c.id, label: c.name }))}
                    value={categoryId}
                    onChange={setCategoryId}
                />
            )}
            <Input label="Monthly limit" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0.00" />
            <Button title="Save Budget" onPress={handleSave} loading={saving} />
        </SheetModal>
    );
};
