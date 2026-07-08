import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useTheme } from '../../context/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { Card, SheetModal, ChipSelector, FieldLabel, Input, Button, warningHaptic, successHaptic } from '../../components/ui';
import { CategoryIcon } from '../../components/CategoryIcon';
import { CategoryForm } from '../../components/CategoryForm';
import { RecurringForm } from '../../components/RecurringForm';
import { formatCurrency } from '../../utils/currency';
import { isoDateToDisplay } from '../../utils/date';
import { shareTransactionsCsv } from '../../utils/exportCsv';
import { spacing } from '../../theme';
import { Category, RecurringRule } from '../../types';
import { apiFetch } from '../../services/api';

import * as DocumentPicker from 'expo-document-picker';
import * as LegacyFS from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AiProvider, AiSettings, defaultAiSettings, getAiSettings, saveAiSettings } from '../../services/aiSettings';

export default function SettingsScreen() {
    const navigation = useNavigation();
    const { user } = useAuth();
    const { categories, recurring, deleteCategory, deleteRecurring, clearAllTransactions, transactions, refresh } = useData();
    const { theme } = useTheme();
    const [exporting, setExporting] = useState(false);
    const [importing, setImporting] = useState(false);
    const [showAiSettings, setShowAiSettings] = useState(false);
    const [aiSettings, setAiSettings] = useState<AiSettings>(defaultAiSettings);
    const [savingAiSettings, setSavingAiSettings] = useState(false);
    const [aiSaved, setAiSaved] = useState(false);
    const [showClearAll, setShowClearAll] = useState(false);
    const [clearPhrase, setClearPhrase] = useState('');
    const [notificationsEnabled, setNotificationsEnabled] = useState(!!user?.expoPushToken);
    const [budgetAlertsEnabled, setBudgetAlertsEnabled] = useState(true);
    const [emailReportsEnabled, setEmailReportsEnabled] = useState(false);
    const [dirty, setDirty] = useState(false);
    const [testingConnection, setTestingConnection] = useState(false);

    // AI settings state
    const [newModelInput, setNewModelInput] = useState('');
    const [newKeyInput, setNewKeyInput] = useState('');
    const [revealedKeys, setRevealedKeys] = useState<Record<string, boolean>>({});

    useEffect(() => {
        getAiSettings().then(setAiSettings).catch(() => setAiSettings(defaultAiSettings));
        setNotificationsEnabled(!!user?.expoPushToken);

        AsyncStorage.getItem('budget_alerts_enabled').then(val => {
            if (val !== null) {
                setBudgetAlertsEnabled(val === 'true');
            } else {
                setBudgetAlertsEnabled(true);
            }
        });

        AsyncStorage.getItem('email_reports_enabled').then(val => {
            if (val !== null) {
                setEmailReportsEnabled(val === 'true');
            } else {
                setEmailReportsEnabled(false);
            }
        });
    }, [user]);

    const handleToggleNotifications = async (enabled: boolean) => {
        setNotificationsEnabled(enabled);
        try {
            if (enabled) {
                if (Device.isDevice && Constants.appOwnership !== 'expo') {
                    const settings = await Notifications.getPermissionsAsync() as any;
                    let granted = settings.status === 'granted' || settings.granted;
                    if (!granted && settings.canAskAgain) {
                        const newSettings = await Notifications.requestPermissionsAsync() as any;
                        granted = newSettings.status === 'granted' || newSettings.granted;
                    }
                    if (!granted) {
                        Alert.alert('Permission Denied', 'Please enable notifications in Android Settings.');
                        setNotificationsEnabled(false);
                        return;
                    }
                    
                    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId ?? 'dev';
                    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
                    await apiFetch('/profile/expo-token', {
                        method: 'POST',
                        body: JSON.stringify({ token: tokenData.data }),
                    });
                    Alert.alert('Success', 'Push notifications enabled!');
                } else {
                    Alert.alert('Expo Go/Simulator Limitation', 'System push notifications only work on real devices with standalone development builds. In-app notifications will still function.');
                    // Still set to true locally for simulation
                }
            } else {
                await apiFetch('/profile/expo-token', {
                    method: 'POST',
                    body: JSON.stringify({ token: null }),
                });
                Alert.alert('Success', 'Push notifications disabled.');
            }
            refresh();
        } catch (error) {
            console.error('Failed to toggle notifications:', error);
            setNotificationsEnabled(!enabled);
            Alert.alert('Error', 'Failed to update notification settings.');
        }
    };

    const handleToggleBudgetAlerts = async (enabled: boolean) => {
        setBudgetAlertsEnabled(enabled);
        try {
            await AsyncStorage.setItem('budget_alerts_enabled', String(enabled));
        } catch (error) {
            console.error('Failed to save budget alerts setting:', error);
        }
    };

    const handleToggleEmailReports = async (enabled: boolean) => {
        setEmailReportsEnabled(enabled);
        try {
            await AsyncStorage.setItem('email_reports_enabled', String(enabled));
        } catch (error) {
            console.error('Failed to save email reports setting:', error);
        }
    };

    const handleAiProviderChange = async (provider: AiProvider) => {
        setRevealedKeys({});
        setNewModelInput('');
        setNewKeyInput('');
        const updated = {
            ...aiSettings,
            provider,
            model: (aiSettings.customModels[provider] || [])[0] || '',
        };
        setAiSettings(updated);

        if (provider !== 'custom') {
            try {
                const saved = await saveAiSettings(updated);
                setAiSettings(saved);
                successHaptic();
                setAiSaved(true);
                setDirty(false);
            } catch (err: any) {
                Alert.alert('Error', err.message || 'Failed to save AI settings');
            }
        } else {
            setAiSaved(false);
            setDirty(true);
        }
    };

    const addModel = () => {
        const val = newModelInput.trim();
        if (!val) return;
        setAiSaved(false);
        setDirty(true);
        setAiSettings(prev => {
            const existing = prev.customModels[prev.provider] || [];
            if (existing.includes(val)) return prev;
            return {
                ...prev,
                model: val,
                customModels: { ...prev.customModels, [prev.provider]: [...existing, val] },
            };
        });
        setNewModelInput('');
    };

    const removeModel = (model: string) => {
        setAiSaved(false);
        setDirty(true);
        setAiSettings(prev => {
            const updated = (prev.customModels[prev.provider] || []).filter(m => m !== model);
            return {
                ...prev,
                model: prev.model === model ? (updated[0] || '') : prev.model,
                customModels: { ...prev.customModels, [prev.provider]: updated },
            };
        });
    };

    const addKey = () => {
        const val = newKeyInput.trim();
        if (!val) return;
        setAiSaved(false);
        setDirty(true);
        setAiSettings(prev => ({
            ...prev,
            keys: { ...prev.keys, [prev.provider]: [...(prev.keys[prev.provider] || []), val] },
        }));
        setNewKeyInput('');
    };

    const removeKey = (idx: number) => {
        setAiSaved(false);
        setDirty(true);
        setAiSettings(prev => {
            const newKeys = [...(prev.keys[prev.provider] || [])];
            newKeys.splice(idx, 1);
            return { ...prev, keys: { ...prev.keys, [prev.provider]: newKeys } };
        });
    };

    const handleSaveAiSettings = async () => {
        setSavingAiSettings(true);
        try {
            const saved = await saveAiSettings(aiSettings);
            setAiSettings(saved);
            successHaptic();
            setAiSaved(true);
            setDirty(false);
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to save AI settings');
        } finally {
            setSavingAiSettings(false);
        }
    };

    const handleTestConnection = async () => {
        setTestingConnection(true);
        try {
            const res = await apiFetch('/ai-settings/test', {
                method: 'POST',
                body: JSON.stringify({
                    provider: aiSettings.provider,
                    model: aiSettings.model,
                    apiKey: aiSettings.keys[aiSettings.provider]?.[0] || '',
                    baseUrl: aiSettings.baseUrl,
                }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(data.error || 'Connection test failed');
            }
            Alert.alert('Success', data.message || 'Connection test successful!');
        } catch (err: any) {
            Alert.alert('Connection Test Failed', err.message || 'Unknown error occurred.');
        } finally {
            setTestingConnection(false);
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

    const handleDownloadTemplate = async () => {
        try {
            const csvContent = 'Date,Note,Amount,Type,Category,Account,Transfer to Account\n' +
                '2025-01-01,Groceries at Whole Foods,125.50,expense,Groceries,Checking Account,\n' +
                '02-01-2025,Salary January,4500.00,income,Salary,Savings Account,\n' +
                '03-01-2025,Credit card bill payment,1000.00,transfer,,Checking Account,Credit Card\n';

            const fileUri = (LegacyFS.documentDirectory || '') + 'transaction_import_template.csv';
            await LegacyFS.writeAsStringAsync(fileUri, csvContent, {
                encoding: LegacyFS.EncodingType.UTF8,
            });
            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(fileUri, { mimeType: 'text/csv', dialogTitle: 'Download CSV Template' });
            } else {
                Alert.alert('Error', 'Sharing is not available on this device');
            }
        } catch (err: any) {
            Alert.alert('Error', 'Could not create template file');
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

    const defaults = ['deepseek', 'openai', 'gemini', 'openrouter'];
    const extraProvidersSet = new Set<string>();
    if (aiSettings.keys) {
        Object.keys(aiSettings.keys).forEach(k => {
            if (!defaults.includes(k) && k !== 'custom') {
                extraProvidersSet.add(k);
            }
        });
    }
    if (aiSettings.customModels) {
        Object.keys(aiSettings.customModels).forEach(k => {
            if (!defaults.includes(k) && k !== 'custom') {
                extraProvidersSet.add(k);
            }
        });
    }
    const extraProviders = Array.from(extraProvidersSet).sort();

    const capitalize = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;

    const providerOptions = [
        { value: 'deepseek', label: 'DeepSeek' },
        { value: 'openai', label: 'OpenAI' },
        { value: 'gemini', label: 'Gemini' },
        { value: 'openrouter', label: 'OpenRouter' },
        ...extraProviders.map(p => ({ value: p, label: capitalize(p) })),
        { value: 'custom', label: 'Custom' },
    ];

    const isCustomOrUnknown = !defaults.includes(aiSettings.provider) && !extraProviders.includes(aiSettings.provider);
    const chipSelectorValue = isCustomOrUnknown ? 'custom' : aiSettings.provider;

    const currentModels = aiSettings.customModels[aiSettings.provider] || [];
    const currentKeys = aiSettings.keys[aiSettings.provider] || [];

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


                <Card style={{ marginBottom: spacing.md, paddingVertical: 0 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.separator }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                            <MaterialCommunityIcons name="bell-outline" size={22} color={theme.colors.textSecondary} style={{ marginRight: 12 }} />
                            <View>
                                <Text style={{ color: theme.colors.text, fontWeight: '600', fontSize: 15 }}>Enable Notifications</Text>
                                <Text style={{ color: theme.colors.textTertiary, fontSize: 11, marginTop: 2 }}>Allow alerts on this device</Text>
                            </View>
                        </View>
                        <Switch
                            value={notificationsEnabled}
                            onValueChange={handleToggleNotifications}
                            trackColor={{ true: theme.colors.primary }}
                        />
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.separator }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                            <MaterialCommunityIcons name="alert-circle-outline" size={22} color={theme.colors.textSecondary} style={{ marginRight: 12 }} />
                            <View>
                                <Text style={{ color: theme.colors.text, fontWeight: '600', fontSize: 15 }}>Budget Alerts</Text>
                                <Text style={{ color: theme.colors.textTertiary, fontSize: 11, marginTop: 2 }}>Get notified when approaching budgets</Text>
                            </View>
                        </View>
                        <Switch
                            value={budgetAlertsEnabled}
                            onValueChange={handleToggleBudgetAlerts}
                            trackColor={{ true: theme.colors.primary }}
                        />
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 16 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                            <MaterialCommunityIcons name="email-outline" size={22} color={theme.colors.textSecondary} style={{ marginRight: 12 }} />
                            <View>
                                <Text style={{ color: theme.colors.text, fontWeight: '600', fontSize: 15 }}>Email Reports</Text>
                                <Text style={{ color: theme.colors.textTertiary, fontSize: 11, marginTop: 2 }}>Receive weekly and monthly summary reports</Text>
                            </View>
                        </View>
                        <Switch
                            value={emailReportsEnabled}
                            onValueChange={handleToggleEmailReports}
                            trackColor={{ true: theme.colors.primary }}
                        />
                    </View>
                </Card>

                <Card style={{ marginBottom: spacing.md, paddingVertical: 0 }}>
                    <Row icon="creation" label="AI transaction parsing" value={aiSettings.enabled ? (aiSettings.model || aiSettings.provider) : 'Off'} onPress={() => setShowAiSettings(true)} />
                </Card>

                <Card style={{ marginBottom: spacing.md, paddingVertical: 0 }}>
                    <Row icon="file-download-outline" label="Download CSV template" onPress={handleDownloadTemplate} />
                    <Row icon="file-import-outline" label={importing ? 'Importing…' : 'Import transactions (CSV)'} onPress={importing ? undefined : handleImport} />
                    <Row icon="export-variant" label={exporting ? 'Exporting…' : 'Export transactions (CSV)'} onPress={exporting ? undefined : handleExport} />
                    <Row icon="delete-sweep" label="Clear all transactions" onPress={confirmClearAll} danger />
                </Card>

                <Text style={{ color: theme.colors.textTertiary, textAlign: 'center', marginTop: spacing.lg, fontSize: 12 }}>
                    ExpenseVision · synced with your web account
                </Text>
            </ScrollView>

            {/* AI settings */}
            <SheetModal visible={showAiSettings} onClose={() => setShowAiSettings(false)} title="AI transaction parsing">
                {/* 1. Enable AI toggle */}
                <View style={[styles.aiToggleRow, { borderBottomColor: theme.colors.separator }]}>
                    <View style={{ flex: 1 }}>
                        <Text style={{ color: theme.colors.text, fontWeight: '700' }}>Enable AI parsing</Text>
                        <Text style={{ color: theme.colors.textTertiary, fontSize: 12, marginTop: 3 }}>
                            Use typed or voice-dictated notes to fill transaction drafts.
                        </Text>
                    </View>
                    <Switch
                        value={aiSettings.enabled}
                        onValueChange={(enabled: boolean) => { setAiSaved(false); setDirty(true); setAiSettings(prev => ({ ...prev, enabled })); }}
                        trackColor={{ true: theme.colors.primary }}
                    />
                </View>

                {/* 2. Provider */}
                <FieldLabel>Provider</FieldLabel>
                <ChipSelector
                    options={providerOptions}
                    value={chipSelectorValue}
                    onChange={handleAiProviderChange}
                />
                <Text style={{ color: theme.colors.textTertiary, fontSize: 11, fontStyle: 'italic', marginTop: 4, marginBottom: spacing.sm }}>
                    {aiSettings.provider === 'deepseek' && "Uses DeepSeek base URL: https://api.deepseek.com"}
                    {aiSettings.provider === 'openai' && "Uses OpenAI base URL: https://api.openai.com/v1"}
                    {aiSettings.provider === 'gemini' && "Uses Gemini base URL: https://generativelanguage.googleapis.com"}
                    {aiSettings.provider === 'openrouter' && "Uses OpenRouter base URL: https://openrouter.ai/api/v1"}
                </Text>

                {/* 3. Custom provider name / details — shown when not a default provider or when custom is selected */}
                {!defaults.includes(aiSettings.provider) ? (
                    <View style={{ gap: spacing.sm, marginBottom: spacing.sm }}>
                        <Input
                            label="Custom Provider Name"
                            value={aiSettings.provider === 'custom' ? '' : aiSettings.provider}
                            onChangeText={val => {
                                const providerVal = val.trim();
                                setAiSaved(false);
                                setDirty(true);
                                setAiSettings(prev => ({
                                    ...prev,
                                    provider: providerVal,
                                    model: (prev.customModels[providerVal] || [])[0] || ''
                                }));
                            }}
                            placeholder="e.g. groq"
                            autoCapitalize="none"
                        />
                        <Input
                            label="Base URL"
                            value={aiSettings.baseUrl || ''}
                            onChangeText={baseUrl => {
                                setAiSaved(false);
                                setDirty(true);
                                setAiSettings(prev => ({ ...prev, baseUrl }));
                            }}
                            placeholder="https://api.groq.com/openai/v1"
                            autoCapitalize="none"
                        />
                    </View>
                ) : null}

                {/* 4. Models for {provider} */}
                <FieldLabel>Models for {aiSettings.provider}</FieldLabel>
                {currentModels.length === 0 ? (
                    <Text style={{ color: theme.colors.textTertiary, fontSize: 13, marginBottom: spacing.sm, fontStyle: 'italic' }}>
                        No models added yet
                    </Text>
                ) : (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: spacing.sm }}>
                        {currentModels.map(m => {
                            const isSelected = aiSettings.model === m;
                            return (
                                <TouchableOpacity
                                    key={m}
                                    onPress={() => {
                                        setAiSaved(false);
                                        setDirty(true);
                                        setAiSettings(prev => ({ ...prev, model: m }));
                                    }}
                                    style={[
                                        styles.modelChip,
                                        {
                                            backgroundColor: isSelected ? theme.colors.primary : theme.colors.card,
                                            borderColor: isSelected ? theme.colors.primary : theme.colors.separator,
                                        },
                                    ]}
                                >
                                    <Text style={{ color: isSelected ? '#fff' : theme.colors.text, fontSize: 13, fontWeight: isSelected ? '700' : '400' }}>
                                        {m}
                                    </Text>
                                    <TouchableOpacity
                                        onPress={() => removeModel(m)}
                                        hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                                        style={{ marginLeft: 4 }}
                                    >
                                        <Text style={{ color: isSelected ? 'rgba(255,255,255,0.8)' : theme.colors.danger, fontWeight: '700', fontSize: 13 }}>✕</Text>
                                    </TouchableOpacity>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                )}
                {/* Add model row */}
                <View style={styles.addRow}>
                    <Input
                        style={{ flex: 1 }}
                        placeholder="Add model..."
                        value={newModelInput}
                        onChangeText={setNewModelInput}
                        autoCapitalize="none"
                        returnKeyType="done"
                        onSubmitEditing={addModel}
                    />
                    <TouchableOpacity
                        onPress={addModel}
                        style={[styles.addButton, { backgroundColor: theme.colors.primary }]}
                    >
                        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 18 }}>+</Text>
                    </TouchableOpacity>
                </View>

                {/* 5. API Keys for {provider} */}
                <FieldLabel>API Keys for {aiSettings.provider}</FieldLabel>
                {currentKeys.map((keyStr, idx) => (
                    <View key={idx} style={[styles.keyRow, { marginBottom: spacing.sm }]}>
                        <TouchableOpacity
                            onPress={() => {
                                if (idx === 0) return;
                                setAiSaved(false);
                                setDirty(true);
                                setAiSettings(prev => {
                                    const newKeys = [...(prev.keys[prev.provider] || [])];
                                    const temp = newKeys[idx];
                                    newKeys[idx] = newKeys[0];
                                    newKeys[0] = temp;
                                    return { ...prev, keys: { ...prev.keys, [prev.provider]: newKeys } };
                                });
                            }}
                            style={styles.keyAction}
                        >
                            <MaterialCommunityIcons
                                name={idx === 0 ? 'radiobox-marked' : 'radiobox-blank'}
                                size={22}
                                color={idx === 0 ? theme.colors.primary : theme.colors.textTertiary}
                            />
                        </TouchableOpacity>
                        <Input
                            style={{ flex: 1 }}
                            value={keyStr}
                            onChangeText={val => {
                                setAiSaved(false);
                                setDirty(true);
                                setAiSettings(prev => {
                                    const newKeys = [...(prev.keys[prev.provider] || [])];
                                    newKeys[idx] = val;
                                    return { ...prev, keys: { ...prev.keys, [prev.provider]: newKeys } };
                                });
                            }}
                            secureTextEntry={!revealedKeys[`${aiSettings.provider}-${idx}`]}
                            placeholder="sk-..."
                            autoCapitalize="none"
                        />
                        <TouchableOpacity
                            onPress={() => setRevealedKeys(prev => ({ ...prev, [`${aiSettings.provider}-${idx}`]: !prev[`${aiSettings.provider}-${idx}`] }))}
                            style={styles.keyAction}
                        >
                            <MaterialCommunityIcons
                                name={revealedKeys[`${aiSettings.provider}-${idx}`] ? 'eye-off' : 'eye'}
                                size={22}
                                color={theme.colors.textSecondary}
                            />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => removeKey(idx)} style={styles.keyAction}>
                            <MaterialCommunityIcons name="trash-can-outline" size={22} color={theme.colors.danger} />
                        </TouchableOpacity>
                    </View>
                ))}
                {/* Add key row */}
                <View style={[styles.addRow, { marginBottom: spacing.md }]}>
                    <Input
                        style={{ flex: 1 }}
                        placeholder="Add new key sk-..."
                        value={newKeyInput}
                        onChangeText={setNewKeyInput}
                        autoCapitalize="none"
                        secureTextEntry
                        returnKeyType="done"
                        onSubmitEditing={addKey}
                    />
                    <TouchableOpacity
                        onPress={addKey}
                        style={[styles.addButton, { backgroundColor: theme.colors.primary }]}
                    >
                        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 18 }}>+</Text>
                    </TouchableOpacity>
                </View>

                {/* 6. Test & Save Buttons */}
                <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
                    <Button
                        title={testingConnection ? 'Testing...' : 'Test Connection'}
                        onPress={handleTestConnection}
                        loading={testingConnection}
                        variant="secondary"
                        style={{ flex: 1 }}
                    />
                    <Button
                        title={aiSaved && !dirty ? 'Saved ✓' : 'Save AI Settings'}
                        onPress={handleSaveAiSettings}
                        loading={savingAiSettings}
                        style={[
                            { flex: 1 },
                            aiSaved && !dirty ? { backgroundColor: theme.colors.success, borderColor: theme.colors.success } : undefined
                        ]}
                    />
                </View>
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
    modelChip: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 20,
        borderWidth: 1,
        paddingVertical: 5,
        paddingHorizontal: 12,
        gap: 4,
    },
    addRow: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 4,
        marginBottom: spacing.sm,
        alignItems: 'center',
    },
    addButton: {
        width: 40,
        height: 40,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    keyRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    keyAction: {
        padding: 6,
    },
});
