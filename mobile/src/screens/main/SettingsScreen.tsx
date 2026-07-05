import React, { useEffect, useState } from 'react';
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
import { AiProvider, AiSettings, defaultAiSettings, getAiSettings, providerModels, saveAiSettings } from '../../services/aiSettings';

export default function SettingsScreen() {
    const { user, logout, updateProfile } = useAuth();
    const { categories, deleteCategory } = useData();
    const { theme, mode, toggleTheme } = useTheme();
    const [showCurrency, setShowCurrency] = useState(false);
    const [showCategories, setShowCategories] = useState(false);
    const [showCategoryForm, setShowCategoryForm] = useState(false);
    const [showAiSettings, setShowAiSettings] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [showEditName, setShowEditName] = useState(false);
    const [name, setName] = useState(user?.name || '');
    const [savingName, setSavingName] = useState(false);
    const [aiSettings, setAiSettings] = useState<AiSettings>(defaultAiSettings);
    const [savingAiSettings, setSavingAiSettings] = useState(false);

    useEffect(() => {
        getAiSettings().then(setAiSettings).catch(() => setAiSettings(defaultAiSettings));
    }, []);

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

    const handleAiProviderChange = (provider: AiProvider) => {
        setAiSettings(prev => ({
            ...prev,
            provider,
            model: providerModels[provider][0] || '',
        }));
    };

    const handleSaveAiSettings = async () => {
        setSavingAiSettings(true);
        try {
            await saveAiSettings(aiSettings);
            Alert.alert('Saved', 'AI settings updated.');
            setShowAiSettings(false);
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to save AI settings');
        } finally {
            setSavingAiSettings(false);
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
                    <Row icon="creation" label="AI transaction parsing" value={aiSettings.enabled ? aiSettings.model : 'Off'} onPress={() => setShowAiSettings(true)} />
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

            {/* AI settings */}
            <SheetModal visible={showAiSettings} onClose={() => setShowAiSettings(false)} title="AI transaction parsing">
                <View style={[styles.aiToggleRow, { borderBottomColor: theme.colors.separator }]}>
                    <View style={{ flex: 1 }}>
                        <Text style={{ color: theme.colors.text, fontWeight: '700' }}>Enable AI parsing</Text>
                        <Text style={{ color: theme.colors.textTertiary, fontSize: 12, marginTop: 3 }}>
                            Use typed or voice-dictated notes to fill transaction drafts.
                        </Text>
                    </View>
                    <Switch
                        value={aiSettings.enabled}
                        onValueChange={enabled => setAiSettings(prev => ({ ...prev, enabled }))}
                        trackColor={{ true: theme.colors.primary }}
                    />
                </View>

                <FieldLabel>Provider</FieldLabel>
                <ChipSelector
                    options={[
                        { value: 'deepseek', label: 'DeepSeek' },
                        { value: 'openai', label: 'OpenAI' },
                        { value: 'openrouter', label: 'OpenRouter' },
                        { value: 'custom', label: 'Custom' },
                    ]}
                    value={aiSettings.provider}
                    onChange={value => handleAiProviderChange(value as AiProvider)}
                />

                <FieldLabel>Model</FieldLabel>
                {providerModels[aiSettings.provider].filter(Boolean).length > 0 ? (
                    <ChipSelector
                        options={providerModels[aiSettings.provider].filter(Boolean).map(model => ({ value: model, label: model }))}
                        value={aiSettings.model}
                        onChange={model => setAiSettings(prev => ({ ...prev, model }))}
                    />
                ) : null}
                <Input
                    value={aiSettings.model}
                    onChangeText={model => setAiSettings(prev => ({ ...prev, model }))}
                    placeholder="deepseek-v4-flash"
                    autoCapitalize="none"
                />

                {aiSettings.provider === 'custom' ? (
                    <Input
                        label="Base URL"
                        value={aiSettings.baseUrl || ''}
                        onChangeText={baseUrl => setAiSettings(prev => ({ ...prev, baseUrl }))}
                        placeholder="https://your-provider.example/v1"
                        autoCapitalize="none"
                    />
                ) : null}

                <Input
                    label="API Key"
                    value={aiSettings.apiKey}
                    onChangeText={apiKey => setAiSettings(prev => ({ ...prev, apiKey }))}
                    placeholder="sk-..."
                    autoCapitalize="none"
                    secureTextEntry
                />

                <Button title="Save AI Settings" onPress={handleSaveAiSettings} loading={savingAiSettings} />
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
    aiToggleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingBottom: spacing.md,
        marginBottom: spacing.md,
        borderBottomWidth: StyleSheet.hairlineWidth,
        gap: spacing.md,
    },
});
