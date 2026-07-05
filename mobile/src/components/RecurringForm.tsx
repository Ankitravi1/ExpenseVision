import React, { useEffect, useState } from 'react';
import { Alert, Switch, Text, View } from 'react-native';
import { SheetModal, Input, Button, ChipSelector, FieldLabel, OptionSheet, DateField, successHaptic } from './ui';
import { useData } from '../context/DataContext';
import { useTheme } from '../context/ThemeContext';
import { RecurringRule, TransactionType } from '../types';
import { todayIsoDate } from '../utils/date';
import { spacing } from '../theme';

interface Props {
    visible: boolean;
    onClose: () => void;
    editing?: RecurringRule | null;
}

export const RecurringForm: React.FC<Props> = ({ visible, onClose, editing }) => {
    const { accounts, categories, addRecurring, updateRecurring } = useData();
    const { theme } = useTheme();
    const [type, setType] = useState<TransactionType>('expense');
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [accountId, setAccountId] = useState<string | null>(null);
    const [transferToAccountId, setTransferToAccountId] = useState<string | null>(null);
    const [categoryId, setCategoryId] = useState<string | null>(null);
    const [frequency, setFrequency] = useState<RecurringRule['frequency']>('monthly');
    const [startDate, setStartDate] = useState(todayIsoDate());
    const [hasEndDate, setHasEndDate] = useState(false);
    const [endDate, setEndDate] = useState(todayIsoDate());
    const [notes, setNotes] = useState('');
    const [active, setActive] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (visible) {
            if (editing) {
                setType(editing.type);
                setDescription(editing.description);
                setAmount(String(editing.amount));
                setAccountId(editing.accountId);
                setTransferToAccountId(editing.transferToAccountId || null);
                setCategoryId(editing.categoryId || null);
                setFrequency(editing.frequency);
                setStartDate(editing.nextRun);
                setHasEndDate(Boolean(editing.endDate));
                setEndDate(editing.endDate || todayIsoDate());
                setNotes(editing.notes || '');
                setActive(editing.active);
            } else {
                setType('expense');
                setDescription('');
                setAmount('');
                setAccountId(accounts[0]?.id || null);
                setTransferToAccountId(null);
                setCategoryId(null);
                setFrequency('monthly');
                setStartDate(todayIsoDate());
                setHasEndDate(false);
                setEndDate(todayIsoDate());
                setNotes('');
                setActive(true);
            }
        }
    }, [visible, editing, accounts]);

    const typeCategories = categories.filter(c => c.type === type);

    const handleSave = async () => {
        const value = parseFloat(amount);
        if (!value || value <= 0) return Alert.alert('Invalid amount', 'Enter an amount greater than zero.');
        if (!description.trim()) return Alert.alert('Missing description', 'Enter a description (e.g. Rent, EMI, Salary).');
        if (!accountId) return Alert.alert('Missing account', 'Select an account.');
        if (type === 'transfer' && !transferToAccountId) return Alert.alert('Missing account', 'Select a destination account.');
        if (type === 'transfer' && transferToAccountId === accountId) return Alert.alert('Invalid transfer', 'Source and destination must differ.');
        if (hasEndDate && endDate < startDate) return Alert.alert('Invalid end date', 'End date must be after the start date.');

        setSaving(true);
        try {
            const payload = {
                description: description.trim(),
                amount: value,
                type,
                accountId,
                transferToAccountId: type === 'transfer' ? transferToAccountId : null,
                categoryId: type === 'transfer' ? null : categoryId,
                frequency,
                startDate,
                endDate: hasEndDate ? endDate : null,
                notes: notes.trim() || null,
                active,
            };
            if (editing) {
                await updateRecurring(editing.id, payload);
            } else {
                await addRecurring(payload);
            }
            successHaptic();
            onClose();
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to save recurring rule');
        } finally {
            setSaving(false);
        }
    };

    return (
        <SheetModal visible={visible} onClose={onClose} title={editing ? 'Edit Recurring' : 'New Recurring'}>
            <FieldLabel>Type</FieldLabel>
            <ChipSelector
                options={[
                    { value: 'expense', label: 'Expense' },
                    { value: 'income', label: 'Income' },
                    { value: 'transfer', label: 'Transfer' },
                ]}
                value={type}
                onChange={v => {
                    setType(v as TransactionType);
                    setCategoryId(null);
                }}
            />

            <Input label="Description" value={description} onChangeText={setDescription} placeholder="e.g. Rent, EMI, Salary" />
            <Input label="Amount" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0.00" />

            <FieldLabel>Repeats</FieldLabel>
            <ChipSelector
                options={[
                    { value: 'daily', label: 'Daily' },
                    { value: 'weekly', label: 'Weekly' },
                    { value: 'monthly', label: 'Monthly' },
                    { value: 'yearly', label: 'Yearly' },
                ]}
                value={frequency}
                onChange={v => setFrequency(v as RecurringRule['frequency'])}
            />

            <DateField label={editing ? 'Next occurrence' : 'First occurrence'} value={startDate} onChange={setStartDate} />

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md }}>
                <FieldLabel>Ends on a date</FieldLabel>
                <Switch value={hasEndDate} onValueChange={setHasEndDate} trackColor={{ true: theme.colors.primary }} />
            </View>
            {hasEndDate ? <DateField label="End date" value={endDate} onChange={setEndDate} /> : null}

            <OptionSheet
                label={type === 'transfer' ? 'From account' : 'Account'}
                options={accounts.map(a => ({ value: a.id, label: a.name, sublabel: a.type }))}
                value={accountId}
                onChange={setAccountId}
            />

            {type === 'transfer' ? (
                <OptionSheet
                    label="To account"
                    options={accounts.filter(a => a.id !== accountId).map(a => ({ value: a.id, label: a.name, sublabel: a.type }))}
                    value={transferToAccountId}
                    onChange={setTransferToAccountId}
                />
            ) : typeCategories.length === 0 ? (
                <Text style={{ marginBottom: 16, opacity: 0.6 }}>No {type} categories yet.</Text>
            ) : (
                <OptionSheet
                    label="Category"
                    options={typeCategories.map(c => ({ value: c.id, label: c.name, icon: c.icon }))}
                    value={categoryId}
                    onChange={setCategoryId}
                />
            )}

            <Input label="Notes (optional)" value={notes} onChangeText={setNotes} placeholder="e.g. flat 402" />

            {editing ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md }}>
                    <FieldLabel>Active</FieldLabel>
                    <Switch value={active} onValueChange={setActive} trackColor={{ true: theme.colors.primary }} />
                </View>
            ) : null}

            <Button title={editing ? 'Save Changes' : 'Add Recurring'} onPress={handleSave} loading={saving} />
        </SheetModal>
    );
};
