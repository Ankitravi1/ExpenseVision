import React, { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { SheetModal, Input, Button, ChipSelector, FieldLabel } from './ui';
import { useData } from '../context/DataContext';
import { Account } from '../types';

const ACCOUNT_TYPES = ['Checking', 'Savings', 'Cash', 'Credit Card', 'Asset', 'Liability'];

interface Props {
    visible: boolean;
    onClose: () => void;
    editing?: Account | null;
}

export const AccountForm: React.FC<Props> = ({ visible, onClose, editing }) => {
    const { addAccount, updateAccount } = useData();
    const [name, setName] = useState('');
    const [type, setType] = useState('Checking');
    const [balance, setBalance] = useState('0');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (visible) {
            setName(editing?.name || '');
            setType(editing?.type || 'Checking');
            setBalance(editing ? String(editing.balance) : '0');
        }
    }, [visible, editing]);

    const handleSave = async () => {
        if (!name.trim()) return Alert.alert('Missing name', 'Enter an account name.');
        const bal = parseFloat(balance);
        if (Number.isNaN(bal)) return Alert.alert('Invalid balance', 'Enter a valid number.');

        setSaving(true);
        try {
            if (editing) {
                await updateAccount(editing.id, { name: name.trim(), type, balance: bal });
            } else {
                await addAccount({ name: name.trim(), type, balance: bal });
            }
            onClose();
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to save account');
        } finally {
            setSaving(false);
        }
    };

    return (
        <SheetModal visible={visible} onClose={onClose} title={editing ? 'Edit Account' : 'New Account'}>
            <Input label="Name" value={name} onChangeText={setName} placeholder="e.g. HDFC Savings" />
            <FieldLabel>Type</FieldLabel>
            <ChipSelector
                options={ACCOUNT_TYPES.map(t => ({ value: t, label: t }))}
                value={type}
                onChange={setType}
            />
            <Input label={editing ? 'Balance' : 'Starting balance'} value={balance} onChangeText={setBalance} keyboardType="numbers-and-punctuation" />
            <Button title={editing ? 'Save Changes' : 'Add Account'} onPress={handleSave} loading={saving} />
        </SheetModal>
    );
};
