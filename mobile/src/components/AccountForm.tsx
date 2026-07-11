import React, { useState, useEffect } from 'react';
import { Alert, View, Text, TouchableOpacity } from 'react-native';
import { SheetModal, Input, Button, ChipSelector, FieldLabel } from './ui';
import { useData } from '../context/DataContext';
import { useTheme } from '../context/ThemeContext';
import { CategoryIcon } from './CategoryIcon';
import { Account } from '../types';
import { spacing } from '../theme';

// Predefined account types mirror web/components/AddAccountModal.tsx.
// `icon` values are lucide names understood by CategoryIcon's ICON_MAP.
export interface AccountTypeDef {
    type: string;
    label: string;
    icon: string;
}

export const PREDEFINED_ACCOUNT_TYPES: AccountTypeDef[] = [
    { type: 'Savings', label: 'Savings', icon: 'PiggyBank' },
    { type: 'Credit Card', label: 'Credit Card', icon: 'CreditCard' },
    { type: 'Cash', label: 'Cash', icon: 'Wallet' },
    { type: 'Investment', label: 'Investment', icon: 'TrendingUp' },
    { type: 'Loan', label: 'Loan / EMI', icon: 'TrendingDown' },
    { type: 'Other', label: 'Other', icon: 'Landmark' },
];

// Gradient palette (matching web parity spec): keep white text readable on all.
const STYLE_GRADIENTS = {
    teal: ['#0d9488', '#0f766e'] as [string, string],
    rose: ['#e11d48', '#be123c'] as [string, string],
    emerald: ['#059669', '#047857'] as [string, string],
    indigo: ['#4f46e5', '#4338ca'] as [string, string],
    amber: ['#d97706', '#b45309'] as [string, string],
    slate: ['#475569', '#334155'] as [string, string],
};

/**
 * Resolve gradient + icon for a stored account type. Handles web's predefined
 * types, legacy mobile types (Checking/Asset/Liability), and unknown/custom
 * types (slate/Other treatment). A custom `icon` on the account wins.
 */
export function getAccountVisual(
    type: string,
    customIcon?: string | null,
): { gradient: [string, string]; icon: string } {
    switch (type) {
        case 'Savings':
            return { gradient: STYLE_GRADIENTS.teal, icon: customIcon || 'PiggyBank' };
        case 'Credit Card':
            return { gradient: STYLE_GRADIENTS.rose, icon: customIcon || 'CreditCard' };
        case 'Cash':
            return { gradient: STYLE_GRADIENTS.emerald, icon: customIcon || 'Wallet' };
        case 'Investment':
            return { gradient: STYLE_GRADIENTS.indigo, icon: customIcon || 'TrendingUp' };
        case 'Loan':
            return { gradient: STYLE_GRADIENTS.amber, icon: customIcon || 'TrendingDown' };
        // Legacy mobile-created types → explicit sensible mapping.
        case 'Checking':
            return { gradient: STYLE_GRADIENTS.teal, icon: customIcon || 'Landmark' };
        case 'Asset':
            return { gradient: STYLE_GRADIENTS.indigo, icon: customIcon || 'TrendingUp' };
        case 'Liability':
            return { gradient: STYLE_GRADIENTS.amber, icon: customIcon || 'TrendingDown' };
        // 'Other' + any custom type.
        default:
            return { gradient: STYLE_GRADIENTS.slate, icon: customIcon || 'Landmark' };
    }
}

const AVAILABLE_ICONS = [
    'Wallet', 'Briefcase', 'TrendingUp', 'Home', 'ShoppingCart', 'Zap',
    'Coffee', 'Car', 'Film', 'Activity', 'ShoppingBag', 'Book',
    'Plane', 'PiggyBank', 'Tags', 'Gift', 'Music', 'Smartphone',
    'Wifi', 'Heart', 'DollarSign', 'CreditCard', 'Landmark', 'Banknote',
];

const isPredefined = (t: string) => PREDEFINED_ACCOUNT_TYPES.some(p => p.type === t);

interface Props {
    visible: boolean;
    onClose: () => void;
    editing?: Account | null;
}

export const AccountForm: React.FC<Props> = ({ visible, onClose, editing }) => {
    const { addAccount, updateAccount } = useData();
    const { theme } = useTheme();
    const [name, setName] = useState('');
    const [selectedType, setSelectedType] = useState('Savings');
    const [customTypeName, setCustomTypeName] = useState('');
    const [selectedIcon, setSelectedIcon] = useState('Wallet');
    const [initialBalance, setInitialBalance] = useState('0');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!visible) return;
        if (editing) {
            setName(editing.name || '');
            setInitialBalance(String(editing.initialBalance ?? editing.balance));
            if (isPredefined(editing.type)) {
                setSelectedType(editing.type);
                setCustomTypeName('');
                setSelectedIcon(PREDEFINED_ACCOUNT_TYPES.find(p => p.type === editing.type)?.icon || 'Wallet');
            } else {
                // Legacy or custom type → treat as Custom so the name/icon stay editable.
                setSelectedType('Custom');
                setCustomTypeName(editing.type);
                setSelectedIcon(editing.icon || 'Wallet');
            }
        } else {
            setName('');
            setSelectedType('Savings');
            setCustomTypeName('');
            setSelectedIcon('Wallet');
            setInitialBalance('0');
        }
    }, [visible, editing]);

    const isCustom = selectedType === 'Custom';

    const handleSave = async () => {
        if (!name.trim()) return Alert.alert('Missing name', 'Enter an account name.');
        const initBal = parseFloat(initialBalance);
        if (Number.isNaN(initBal)) return Alert.alert('Invalid initial amount', 'Enter a valid number.');

        const finalType = isCustom ? customTypeName.trim() : selectedType;
        if (isCustom && !finalType) return Alert.alert('Missing type', 'Enter a custom type name.');
        const finalIcon = isCustom
            ? selectedIcon
            : PREDEFINED_ACCOUNT_TYPES.find(p => p.type === selectedType)?.icon || 'Wallet';

        setSaving(true);
        try {
            if (editing) {
                await updateAccount(editing.id, {
                    name: name.trim(),
                    type: finalType,
                    initialBalance: initBal,
                    icon: finalIcon,
                });
            } else {
                await addAccount({
                    name: name.trim(),
                    type: finalType,
                    initialBalance: initBal,
                    balance: initBal,
                    icon: finalIcon,
                });
            }
            onClose();
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to save account');
        } finally {
            setSaving(false);
        }
    };

    const typeOptions = [
        ...PREDEFINED_ACCOUNT_TYPES.map(p => ({ value: p.type, label: p.label })),
        { value: 'Custom', label: 'Custom' },
    ];

    return (
        <SheetModal visible={visible} onClose={onClose} title={editing ? 'Edit Account' : 'New Account'}>
            <Input label="Name" value={name} onChangeText={setName} placeholder="e.g. HDFC Savings" />

            <FieldLabel>Type</FieldLabel>
            <ChipSelector options={typeOptions} value={selectedType} onChange={setSelectedType} />

            {isCustom && (
                <>
                    <Input
                        label="Custom Type Name"
                        value={customTypeName}
                        onChangeText={setCustomTypeName}
                        placeholder="e.g. Crypto Wallet"
                    />
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
                </>
            )}

            <Input
                label="Initial Amount"
                value={initialBalance}
                onChangeText={setInitialBalance}
                keyboardType="decimal-pad"
                placeholder="0.00"
            />

            <Button title={editing ? 'Save Changes' : 'Add Account'} onPress={handleSave} loading={saving} />
        </SheetModal>
    );
};
