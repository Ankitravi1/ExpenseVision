import React, { useState, useEffect } from 'react';
import { Alert, View, TouchableOpacity } from 'react-native';
import { SheetModal, Input, Button, ChipSelector, FieldLabel } from './ui';
import { useData } from '../context/DataContext';
import { useTheme } from '../context/ThemeContext';
import { CategoryIcon } from './CategoryIcon';
import { Account } from '../types';
import { spacing } from '../theme';

const ACCOUNT_TYPES = ['Checking', 'Savings', 'Cash', 'Credit Card', 'Asset', 'Liability'];

const AVAILABLE_ICONS = [
    'Wallet', 'Briefcase', 'TrendingUp', 'Home', 'ShoppingCart', 'Zap', 
    'Coffee', 'Car', 'Film', 'Activity', 'ShoppingBag', 'Book', 
    'Plane', 'PiggyBank', 'Tags', 'Gift', 'Music', 'Smartphone', 
    'Wifi', 'Heart', 'DollarSign', 'CreditCard', 'Landmark', 'Banknote'
];

interface Props {
    visible: boolean;
    onClose: () => void;
    editing?: Account | null;
}

export const AccountForm: React.FC<Props> = ({ visible, onClose, editing }) => {
    const { addAccount, updateAccount } = useData();
    const { theme } = useTheme();
    const [name, setName] = useState('');
    const [type, setType] = useState('Checking');
    const [initialBalance, setInitialBalance] = useState('0');
    const [selectedIcon, setSelectedIcon] = useState('Wallet');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (visible) {
            setName(editing?.name || '');
            setType(editing?.type || 'Checking');
            setInitialBalance(editing ? String(editing.initialBalance ?? editing.balance) : '0');
            setSelectedIcon(editing?.icon || 'Wallet');
        }
    }, [visible, editing]);

    const handleSave = async () => {
        if (!name.trim()) return Alert.alert('Missing name', 'Enter an account name.');
        const initBal = parseFloat(initialBalance);
        if (Number.isNaN(initBal)) return Alert.alert('Invalid initial amount', 'Enter a valid number.');

        setSaving(true);
        try {
            if (editing) {
                await updateAccount(editing.id, { name: name.trim(), type, initialBalance: initBal, icon: selectedIcon });
            } else {
                await addAccount({ name: name.trim(), type, initialBalance: initBal, balance: initBal, icon: selectedIcon });
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
            <Input label="Initial Amount" value={initialBalance} onChangeText={setInitialBalance} keyboardType="decimal-pad" placeholder="0.00" />

            <FieldLabel>Icon</FieldLabel>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: spacing.md }}>
                {AVAILABLE_ICONS.map(ic => {
                    const isSelected = selectedIcon === ic;
                    return (
                        <TouchableOpacity
                            key={ic}
                            onPress={() => setSelectedIcon(ic)}
                            style={{
                                padding: 4,
                                borderRadius: 24,
                                borderWidth: 2,
                                borderColor: isSelected ? theme.colors.primary : 'transparent',
                            }}
                        >
                            <CategoryIcon name={ic} size={20} />
                        </TouchableOpacity>
                    );
                })}
            </View>

            <Button title={editing ? 'Save Changes' : 'Add Account'} onPress={handleSave} loading={saving} />
        </SheetModal>
    );
};
