import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useData } from '../../context/DataContext';
import { useTheme } from '../../context/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { Button } from '../../components/ui';
import { ScreenHeader } from '../../components/ScreenHeader';
import { CategoryIcon } from '../../components/CategoryIcon';
import { CategoryForm } from '../../components/CategoryForm';
import { spacing } from '../../theme';
import { Category } from '../../types';

export default function CategoriesScreen() {
    const navigation = useNavigation();
    const { categories, deleteCategory } = useData();
    const { theme } = useTheme();
    const [showCategoryForm, setShowCategoryForm] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);

    const confirmDeleteCategory = (c: Category) => {
        Alert.alert('Delete category', `Delete "${c.name}"? Categories in use cannot be deleted.`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: () => deleteCategory(c.id).catch(err => Alert.alert('Cannot delete', err.message)),
            },
        ]);
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['top']}>
            <ScreenHeader title="Categories" />
            <ScrollView contentContainerStyle={{ padding: spacing.md }}>
                <Button
                    title="+ New Category"
                    variant="secondary"
                    onPress={() => {
                        setEditingCategory(null);
                        setShowCategoryForm(true);
                    }}
                    style={{ marginBottom: spacing.md }}
                />

                {categories.map(c => (
                    <TouchableOpacity
                        key={c.id}
                        onPress={() => {
                            setEditingCategory(c);
                            setShowCategoryForm(true);
                        }}
                        onLongPress={() => confirmDeleteCategory(c)}
                        style={[styles.categoryRow, { borderBottomColor: theme.colors.separator }]}
                    >
                        <CategoryIcon name={c.icon} size={14} />
                        <Text style={{ color: theme.colors.text, flex: 1, marginLeft: spacing.sm, fontWeight: '500' }}>{c.name}</Text>
                        <Text style={{ color: c.type === 'income' ? theme.colors.success : theme.colors.danger, fontSize: 12 }}>
                            {c.type}
                        </Text>
                    </TouchableOpacity>
                ))}

                <Text style={{ color: theme.colors.textTertiary, fontSize: 12, marginTop: spacing.sm, textAlign: 'center' }}>
                    Tap to edit · long-press to delete
                </Text>
            </ScrollView>

            <CategoryForm
                visible={showCategoryForm}
                onClose={() => {
                    setShowCategoryForm(false);
                    setEditingCategory(null);
                }}
                editing={editingCategory}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    categoryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
});
