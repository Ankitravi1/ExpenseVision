import React, { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { SheetModal, Input, Button, ChipSelector, FieldLabel } from './ui';
import { useData } from '../context/DataContext';
import { Category } from '../types';

interface Props {
    visible: boolean;
    onClose: () => void;
    editing?: Category | null;
}

export const CategoryForm: React.FC<Props> = ({ visible, onClose, editing }) => {
    const { addCategory, updateCategory } = useData();
    const [name, setName] = useState('');
    const [type, setType] = useState<'income' | 'expense'>('expense');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (visible) {
            setName(editing?.name || '');
            setType(editing?.type === 'income' ? 'income' : 'expense');
        }
    }, [visible, editing]);

    const handleSave = async () => {
        if (!name.trim()) return Alert.alert('Missing name', 'Enter a category name.');
        setSaving(true);
        try {
            if (editing) {
                await updateCategory(editing.id, { name: name.trim(), type });
            } else {
                await addCategory({ name: name.trim(), type, icon: 'Tags' });
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
            <Button title={editing ? 'Save Changes' : 'Add Category'} onPress={handleSave} loading={saving} />
        </SheetModal>
    );
};
