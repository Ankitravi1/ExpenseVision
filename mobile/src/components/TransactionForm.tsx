import React, { useState, useEffect } from 'react';
import { Alert, Text } from 'react-native';
import { SheetModal, Input, Button, ChipSelector, FieldLabel } from './ui';
import { useData } from '../context/DataContext';
import { Transaction, TransactionType } from '../types';

const todayStr = () => new Date().toISOString().split('T')[0];

interface Props {
    visible: boolean;
    onClose: () => void;
    editing?: Transaction | null;
}

export const TransactionForm: React.FC<Props> = ({ visible, onClose, editing }) => {
    const { accounts, categories, addTransaction, updateTransaction } = useData();
    const [type, setType] = useState<TransactionType>('expense');
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [date, setDate] = useState(todayStr());
    const [accountId, setAccountId] = useState<string | null>(null);
    const [transferToAccountId, setTransferToAccountId] = useState<string | null>(null);
    const [categoryId, setCategoryId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (visible) {
            if (editing) {
                setType(editing.type);
                setAmount(String(editing.amount));
                setDescription(editing.description);
                setDate(editing.date.split('T')[0]);
                setAccountId(editing.accountId);
                setTransferToAccountId(editing.transferToAccountId || null);
                setCategoryId(editing.categoryId || null);
            } else {
                setType('expense');
                setAmount('');
                setDescription('');
                setDate(todayStr());
                setAccountId(accounts[0]?.id || null);
                setTransferToAccountId(null);
                setCategoryId(null);
            }
        }
    }, [visible, editing, accounts]);

    const typeCategories = categories.filter(c => c.type === type);

    const handleSave = async () => {
        const value = parseFloat(amount);
        if (!value || value <= 0) return Alert.alert('Invalid amount', 'Enter an amount greater than zero.');
        if (!description.trim()) return Alert.alert('Missing description', 'Enter a description.');
        if (!accountId) return Alert.alert('Missing account', 'Select an account.');
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return Alert.alert('Invalid date', 'Use YYYY-MM-DD format.');
        if (type === 'transfer' && !transferToAccountId) return Alert.alert('Missing account', 'Select a destination account.');
        if (type === 'transfer' && transferToAccountId === accountId) return Alert.alert('Invalid transfer', 'Source and destination must differ.');

        setSaving(true);
        try {
            const payload = {
                type,
                amount: value,
                description: description.trim(),
                date,
                accountId,
                categoryId: type === 'transfer' ? null : categoryId,
                transferToAccountId: type === 'transfer' ? transferToAccountId : null,
            };
            if (editing) {
                await updateTransaction(editing.id, payload);
            } else {
                await addTransaction(payload as Omit<Transaction, 'id'>);
            }
            onClose();
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to save transaction');
        } finally {
            setSaving(false);
        }
    };

    return (
        <SheetModal visible={visible} onClose={onClose} title={editing ? 'Edit Transaction' : 'New Transaction'}>
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

            <Input label="Amount" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0.00" />
            <Input label="Description" value={description} onChangeText={setDescription} placeholder="e.g. Groceries" />
            <Input label="Date (YYYY-MM-DD)" value={date} onChangeText={setDate} placeholder={todayStr()} autoCapitalize="none" />

            <FieldLabel>{type === 'transfer' ? 'From account' : 'Account'}</FieldLabel>
            <ChipSelector
                options={accounts.map(a => ({ value: a.id, label: a.name }))}
                value={accountId}
                onChange={setAccountId}
            />

            {type === 'transfer' ? (
                <>
                    <FieldLabel>To account</FieldLabel>
                    <ChipSelector
                        options={accounts.filter(a => a.id !== accountId).map(a => ({ value: a.id, label: a.name }))}
                        value={transferToAccountId}
                        onChange={setTransferToAccountId}
                    />
                </>
            ) : (
                <>
                    <FieldLabel>Category</FieldLabel>
                    {typeCategories.length === 0 ? (
                        <Text style={{ marginBottom: 16, opacity: 0.6 }}>No {type} categories yet.</Text>
                    ) : (
                        <ChipSelector
                            options={typeCategories.map(c => ({ value: c.id, label: c.name }))}
                            value={categoryId}
                            onChange={setCategoryId}
                        />
                    )}
                </>
            )}

            <Button title={editing ? 'Save Changes' : 'Add Transaction'} onPress={handleSave} loading={saving} />
        </SheetModal>
    );
};
