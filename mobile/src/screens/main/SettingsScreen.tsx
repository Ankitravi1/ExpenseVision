import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useTheme } from '../../context/ThemeContext';
import { Card, SheetModal, ChipSelector, FieldLabel, Input, Button } from '../../components/ui';
import { CategoryIcon } from '../../components/CategoryIcon';
import { CategoryForm } from '../../components/CategoryForm';
import { CURRENCIES } from '../../utils/currency';
import { spacing } from '../../theme';
import { Category } from '../../types';

export default function SettingsScreen() {
    const { user, logout, updateProfile } = useAuth();
    const { categories, deleteCategory } = useData();
    const { theme, mode, toggleTheme } = useTheme();
    const [showCurrency, setShowCurrency] = useState(false);
    const [showCategories, setShowCategories] = useState(false);
    const [showCategoryForm, setShowCategoryForm] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [showEditName, setShowEditName] = useState(false);
    const [name, setName] = useState(user?.name || '');
    const [savingName, setSavingName] = useState(false);

    const handleCurrencyChange = async (code: string) => {
        try {
            await updateProfile({ currency: code });
            setShowCurrency(false);
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to update currency');
        }
    };

    const handleSaveName = async () => {
        if (!name.trim()) return;
        setSavingName(true);
        try {
            await updateProfile({ name: name.trim() });
            setShowEditName(false);
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to update name');
        } finally {
            setSavingName(false);
        }
    };

    const confirmLogout = () => {
        Alert.alert('Log out', 'Are you sure you want to log out?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Log out', style: 'destructive', onPress: logout },
        ]);
    };

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

    const Row: React.FC<{ icon: keyof typeof MaterialCommunityIcons.glyphMap; label: string; value?: string; onPress?: () => void; right?: React.ReactNode; danger?: boolean }> = ({ icon, label, value, onPress, right, danger }) => (
        <TouchableOpacity
            onPress={onPress}
            disabled={!onPress}
            style={[styles.row, { borderBottomColor: theme.colors.separator }]}
        >
            <MaterialCommunityIcons name={icon} size={22} color={danger ? theme.colors.danger : theme.colors.textSecondary} />
            <Text style={[styles.rowLabel, { color: danger ? theme.colors.danger : theme.colors.text }]}>{label}</Text>
            {right || (
                <>
                    {value ? <Text style={{ color: theme.colors.textTertiary, marginRight: 6 }}>{value}</Text> : null}
                    {onPress ? <MaterialCommunityIcons name="chevron-right" size={20} color={theme.colors.textTertiary} /> : null}
                </>
            )}
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['top']}>
            <ScrollView contentContainerStyle={{ padding: spacing.md }}>
                <Text style={[styles.title, { color: theme.colors.text }]}>Settings</Text>

                {/* Profile */}
                <Card style={{ marginBottom: spacing.md, alignItems: 'center', paddingVertical: spacing.lg }}>
                    <View style={[styles.avatar, { backgroundColor: theme.colors.primary }]}>
                        <Text style={styles.avatarText}>{(user?.name || 'U').trim().charAt(0).toUpperCase()}</Text>
                    </View>
                    <Text style={{ color: theme.colors.text, fontWeight: '700', fontSize: 18, marginTop: spacing.sm }}>{user?.name}</Text>
                    <Text style={{ color: theme.colors.textTertiary, fontSize: 13 }}>{user?.email}</Text>
                </Card>

                <Card style={{ marginBottom: spacing.md, paddingVertical: 0 }}>
                    <Row icon="account-edit" label="Edit name" onPress={() => { setName(user?.name || ''); setShowEditName(true); }} />
                    <Row icon="currency-usd" label="Currency" value={user?.currency || 'INR'} onPress={() => setShowCurrency(true)} />
                    <Row icon="tag-multiple" label="Manage categories" value={`${categories.length}`} onPress={() => setShowCategories(true)} />
                    <Row
                        icon="theme-light-dark"
                        label="Dark mode"
                        right={<Switch value={mode === 'dark'} onValueChange={toggleTheme} trackColor={{ true: theme.colors.primary }} />}
                    />
                </Card>

                <Card style={{ paddingVertical: 0 }}>
                    <Row icon="logout" label="Log out" onPress={confirmLogout} danger />
                </Card>

                <Text style={{ color: theme.colors.textTertiary, textAlign: 'center', marginTop: spacing.lg, fontSize: 12 }}>
                    ExpenseVision · synced with your web account
                </Text>
            </ScrollView>

            {/* Currency picker */}
            <SheetModal visible={showCurrency} onClose={() => setShowCurrency(false)} title="Currency">
                <FieldLabel>Choose your currency</FieldLabel>
                <ChipSelector
                    options={CURRENCIES.map(c => ({ value: c.code, label: `${c.symbol} ${c.code}` }))}
                    value={user?.currency || 'INR'}
                    onChange={handleCurrencyChange}
                />
            </SheetModal>

            {/* Edit name */}
            <SheetModal visible={showEditName} onClose={() => setShowEditName(false)} title="Edit name">
                <Input label="Name" value={name} onChangeText={setName} />
                <Button title="Save" onPress={handleSaveName} loading={savingName} />
            </SheetModal>

            {/* Categories manager */}
            <SheetModal visible={showCategories} onClose={() => setShowCategories(false)} title="Categories">
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
            </SheetModal>

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
    title: {
        fontSize: 26,
        fontWeight: '800',
        marginBottom: spacing.md,
    },
    avatar: {
        width: 64,
        height: 64,
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        color: '#fff',
        fontSize: 26,
        fontWeight: '800',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        borderBottomWidth: StyleSheet.hairlineWidth,
        gap: 12,
    },
    rowLabel: {
        flex: 1,
        fontSize: 15,
        fontWeight: '500',
    },
    categoryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
});
