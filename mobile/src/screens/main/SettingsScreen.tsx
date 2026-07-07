import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useTheme } from '../../context/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { Card, SheetModal, ChipSelector, FieldLabel, Input, Button, OptionSheet, warningHaptic } from '../../components/ui';
import { CategoryIcon } from '../../components/CategoryIcon';
import { CategoryForm } from '../../components/CategoryForm';
import { RecurringForm } from '../../components/RecurringForm';
import { CURRENCIES, formatCurrency } from '../../utils/currency';
import { isoDateToDisplay } from '../../utils/date';
import { shareTransactionsCsv } from '../../utils/exportCsv';
import { spacing } from '../../theme';
import { Category, RecurringRule } from '../../types';

const COMMON_TIMEZONES = [
    'Asia/Kolkata', 'Asia/Dubai', 'Asia/Singapore', 'Asia/Tokyo', 'Asia/Shanghai',
    'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Moscow',
    'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
    'America/Sao_Paulo', 'Australia/Sydney', 'Pacific/Auckland', 'UTC',
];
import * as DocumentPicker from 'expo-document-picker';
import { AiProvider, AiSettings, defaultAiSettings, getAiSettings, providerModels, saveAiSettings } from '../../services/aiSettings';

export default function SettingsScreen() {
    const navigation = useNavigation();
    const { user, logout, updateProfile } = useAuth();
    const { categories, recurring, deleteCategory, deleteRecurring, clearAllTransactions, transactions, refresh } = useData();
    const { theme, mode, toggleTheme } = useTheme();
    const [showCurrency, setShowCurrency] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [importing, setImporting] = useState(false);
    const [showEditName, setShowEditName] = useState(false);
    const [showAiSettings, setShowAiSettings] = useState(false);
    const [name, setName] = useState(user?.name || '');
    const [savingName, setSavingName] = useState(false);
    const [aiSettings, setAiSettings] = useState<AiSettings>(defaultAiSettings);
    const [savingAiSettings, setSavingAiSettings] = useState(false);
    const [showClearAll, setShowClearAll] = useState(false);
    const [clearPhrase, setClearPhrase] = useState('');

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

    const handleTimezoneChange = async (tz: string) => {
        try {
            await updateProfile({ timezone: tz });
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to update timezone');
        }
    };

    const handleExport = async () => {
        setExporting(true);
        try {
            await shareTransactionsCsv();
        } catch (err: any) {
            Alert.alert('Export failed', err.message || 'Could not export transactions');
        } finally {
            setExporting(false);
        }
    };

    const handleImport = async () => {
        try {
            const res = await DocumentPicker.getDocumentAsync({
                type: ['text/csv', 'application/csv', 'text/comma-separated-values'],
                copyToCacheDirectory: true,
            });
            
            if (res.canceled || !res.assets || res.assets.length === 0) return;
            
            setImporting(true);
            const fileUri = res.assets[0].uri;
            
            const formData = new FormData();
            formData.append('file', {
                uri: fileUri,
                name: res.assets[0].name || 'import.csv',
                type: res.assets[0].mimeType || 'text/csv'
            } as any);

            const token = await require('../../services/storage').getToken();
            const response = await fetch(`${require('../../config').API_URL}/api/transactions/import`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Import failed');

            Alert.alert('Success', `Imported ${result.count} transactions successfully.`);
            refresh();
        } catch (err: any) {
            Alert.alert('Import failed', err.message || 'Could not import transactions');
        } finally {
            setImporting(false);
        }
    };

    const confirmClearAll = () => {
        warningHaptic();
        setShowClearAll(true);
        setClearPhrase('');
    };

    const handleClearAll = async () => {
        if (clearPhrase !== 'DELETE') {
            Alert.alert('Error', 'You must type DELETE to confirm.');
            return;
        }
        try {
            await clearAllTransactions(clearPhrase);
            setShowClearAll(false);
        } catch (err: any) {
            Alert.alert('Error', err.message);
        }
    };

    const confirmLogout = () => {
        Alert.alert('Log out', 'Are you sure you want to log out?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Log out', style: 'destructive', onPress: logout },
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
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <TouchableOpacity
                        onPress={() => (navigation as any).openDrawer?.()}
                        style={{ marginRight: 12, padding: 4 }}
                        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    >
                        <MaterialCommunityIcons name="menu" size={26} color={theme.colors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.title, { color: theme.colors.text }]}>Settings</Text>
                </View>

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
                    <Row icon="creation" label="AI transaction parsing" value={aiSettings.enabled ? aiSettings.model : 'Off'} onPress={() => setShowAiSettings(true)} />
                    <Row
                        icon="theme-light-dark"
                        label="Dark mode"
                        right={<Switch value={mode === 'dark'} onValueChange={toggleTheme} trackColor={{ true: theme.colors.primary }} />}
                    />
                </Card>

                <Card style={{ marginBottom: spacing.md, paddingVertical: 0 }}>
                    <View style={{ paddingVertical: spacing.sm }}>
                        <OptionSheet
                            label="Timezone"
                            options={[
                                ...(user?.timezone && !COMMON_TIMEZONES.includes(user.timezone)
                                    ? [{ value: user.timezone, label: user.timezone }]
                                    : []),
                                ...COMMON_TIMEZONES.map(tz => ({ value: tz, label: tz })),
                            ]}
                            value={user?.timezone || 'UTC'}
                            onChange={handleTimezoneChange}
                        />
                    </View>
                    <Row icon="file-import-outline" label={importing ? 'Importing…' : 'Import transactions (CSV)'} onPress={importing ? undefined : handleImport} />
                    <Row icon="export-variant" label={exporting ? 'Exporting…' : 'Export transactions (CSV)'} onPress={exporting ? undefined : handleExport} />
                    <Row icon="delete-sweep" label="Clear all transactions" onPress={confirmClearAll} danger />
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
                        { value: 'gemini', label: 'Google Gemini' },
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


            {/* Clear All */}
            <SheetModal visible={showClearAll} onClose={() => setShowClearAll(false)} title="Clear all transactions">
                <Text style={{ color: theme.colors.textTertiary, marginBottom: spacing.md, fontSize: 14 }}>
                    This deletes all {transactions.length} transactions and resets account balances. This cannot be undone. Type DELETE to confirm.
                </Text>
                <Input
                    value={clearPhrase}
                    onChangeText={setClearPhrase}
                    placeholder="Type DELETE"
                    autoCapitalize="none"
                />
                <Button 
                    title="Delete everything" 
                    onPress={handleClearAll} 
                    style={{ backgroundColor: theme.colors.danger, borderColor: theme.colors.danger }} 
                />
            </SheetModal>
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
