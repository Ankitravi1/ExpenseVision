import React, { useState, useEffect } from 'react';
import { Alert, View, TouchableOpacity } from 'react-native';
import { SheetModal, Input, Button, ChipSelector, FieldLabel } from './ui';
import { useData } from '../context/DataContext';
import { useTheme } from '../context/ThemeContext';
import { CategoryIcon } from './CategoryIcon';
import { Category } from '../types';
import { spacing } from '../theme';

const AVAILABLE_ICONS = [
    'Wallet', 'Briefcase', 'TrendingUp', 'Home', 'ShoppingCart', 'Zap', 
    'Coffee', 'Car', 'Film', 'Activity', 'ShoppingBag', 'Book', 
    'Plane', 'PiggyBank', 'Tags', 'Gift', 'Music', 'Smartphone', 
    'Wifi', 'Heart', 'DollarSign', 'CreditCard', 'Landmark', 'Banknote'
];

interface Props {
    visible: boolean;
    onClose: () => void;
    editing?: Category | null;
}

export const CategoryForm: React.FC<Props> = ({ visible, onClose, editing }) => {
    const { addCategory, updateCategory } = useData();
    const { theme } = useTheme();
    const [name, setName] = useState('');
    const [type, setType] = useState<'income' | 'expense'>('expense');
    const [selectedIcon, setSelectedIcon] = useState('Tags');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (visible) {
            setName(editing?.name || '');
            setType(editing?.type === 'income' ? 'income' : 'expense');
            setSelectedIcon(editing?.icon || 'Tags');
        }
    }, [visible, editing]);

    const handleSave = async () => {
        if (!name.trim()) return Alert.alert('Missing name', 'Enter a category name.');
        setSaving(true);
        try {
            if (editing) {
                await updateCategory(editing.id, { name: name.trim(), type, icon: selectedIcon });
            } else {
                await addCategory({ name: name.trim(), type, icon: selectedIcon });
            }
            onClose();
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to save category');
        } finally {
            setSaving(false);
        }
    };

    return (
        <SheetModal visible={visible} onClose={onClose} title={editing ? 'Edit Category' : 'New Category'}>
            <Input label="Name" value={name} onChangeText={setName} placeholder="e.g. Subscriptions" />
            <FieldLabel>Type</FieldLabel>
            <ChipSelector
                options={[
                    { value: 'expense', label: 'Expense' },
                    { value: 'income', label: 'Income' },
                ]}
                value={type}
                onChange={v => setType(v as 'income' | 'expense')}
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

            <Button title={editing ? 'Save Changes' : 'Add Category'} onPress={handleSave} loading={saving} />
        </SheetModal>
    );
};
