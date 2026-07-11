import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/Card';
import { Icon } from '../components/Icon';
import { AppContext } from '../App';
import { useToast } from '../context/ToastContext';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { pushService } from '../services/push';
import { AiProvider, AiSettings, defaultAiSettings, getAiSettings, saveAiSettings } from '../services/aiSettings';
import { api } from '../services/api';

interface ClearDataModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (options: { transactions: boolean; budgets: boolean; accounts: boolean }) => Promise<void>;
}

const ClearDataModal: React.FC<ClearDataModalProps> = ({ isOpen, onClose, onConfirm }) => {
    const [delTransactions, setDelTransactions] = useState(false);
    const [delBudgets, setDelBudgets] = useState(false);
    const [delAccounts, setDelAccounts] = useState(false);
    const [phrase, setPhrase] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { showToast } = useToast();

    if (!isOpen) return null;

    const isValid = phrase === 'delete my data' && (delTransactions || delBudgets || delAccounts);

    const handleConfirm = async () => {
        if (!isValid) return;
        setIsSubmitting(true);
        try {
            await onConfirm({
                transactions: delTransactions,
                budgets: delBudgets,
                accounts: delAccounts,
            });
            onClose();
        } catch (error: any) {
            showToast(error.message || 'Failed to clear data', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300"
                onClick={onClose}
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md pointer-events-auto transform transition-all flex flex-col overflow-hidden border border-gray-200 dark:border-gray-700">
                    <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
                        <h3 className="text-xl font-bold text-gray-darkest dark:text-gray-50 flex items-center gap-2">
                            <Icon name="AlertTriangle" className="text-danger" size={22} />
                            Clear / Reset Data
                        </h3>
                        <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                            <Icon name="X" size={20} />
                        </button>
                    </div>

                    <div className="p-6 space-y-4">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            Select the types of data you wish to permanently delete. This action cannot be undone.
                        </p>

                        <div className="space-y-3">
                            <label className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/35 border border-gray-100 dark:border-gray-700/50 rounded-lg cursor-pointer hover:border-gray-200 dark:hover:border-gray-600 select-none">
                                <input
                                    type="checkbox"
                                    checked={delTransactions}
                                    onChange={(e) => setDelTransactions(e.target.checked)}
                                    className="w-4 h-4 rounded text-primary focus:ring-primary border-gray-300 dark:border-gray-600 dark:bg-gray-700"
                                />
                                <div>
                                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Transactions</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Permanently clears all transactions.</p>
                                </div>
                            </label>

                            <label className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/35 border border-gray-100 dark:border-gray-700/50 rounded-lg cursor-pointer hover:border-gray-200 dark:hover:border-gray-600 select-none">
                                <input
                                    type="checkbox"
                                    checked={delBudgets}
                                    onChange={(e) => setDelBudgets(e.target.checked)}
                                    className="w-4 h-4 rounded text-primary focus:ring-primary border-gray-300 dark:border-gray-600 dark:bg-gray-700"
                                />
                                <div>
                                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Budgets</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Permanently clears all budgets.</p>
                                </div>
                            </label>

                            <label className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/35 border border-gray-100 dark:border-gray-700/50 rounded-lg cursor-pointer hover:border-gray-200 dark:hover:border-gray-600 select-none">
                                <input
                                    type="checkbox"
                                    checked={delAccounts}
                                    onChange={(e) => setDelAccounts(e.target.checked)}
                                    className="w-4 h-4 rounded text-primary focus:ring-primary border-gray-300 dark:border-gray-600 dark:bg-gray-700"
                                />
                                <div>
                                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Accounts</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Permanently clears all accounts (and dependent transactions).</p>
                                </div>
                            </label>
                        </div>

                        <div className="pt-2">
                            <label htmlFor="confirm-phrase" className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                                To confirm, type <span className="font-mono text-danger lowercase font-bold">"delete my data"</span> below:
                            </label>
                            <input
                                id="confirm-phrase"
                                type="text"
                                value={phrase}
                                onChange={(e) => setPhrase(e.target.value)}
                                placeholder="delete my data"
                                className="block w-full bg-gray-100 border border-gray-200 dark:border-gray-700 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-gray-100 outline-none"
                            />
                        </div>
                    </div>

                    <div className="p-6 bg-gray-50/50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="btn btn-secondary py-2 px-4 text-sm"
                            disabled={isSubmitting}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleConfirm}
                            disabled={!isValid || isSubmitting}
                            className="btn btn-danger py-2 px-4 text-sm flex items-center gap-2"
                        >
                            {isSubmitting && <Icon name="Loader2" size={16} className="animate-spin" />}
                            Confirm Data Deletion
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};

export const Settings: React.FC = () => {
    const context = useContext(AppContext);
    const { showToast } = useToast();
    const navigate = useNavigate();

    const [notifications, setNotifications] = useState(false); // Default to false until checked
    const [budgetAlerts, setBudgetAlerts] = useState(false);
    const [isClearDataOpen, setIsClearDataOpen] = useState(false);
    const [aiSettings, setAiSettings] = useState<AiSettings>(defaultAiSettings);
    const [aiSaved, setAiSaved] = useState(false);
    const [aiError, setAiError] = useState('');
    const [vapidConfigured, setVapidConfigured] = useState(true);
    const [revealedKeys, setRevealedKeys] = useState<Record<string, boolean>>({});
    const [newModelInput, setNewModelInput] = useState('');
    const [newKeyInput, setNewKeyInput] = useState('');
    const [isTestingConnection, setIsTestingConnection] = useState(false);

    const defaultProviders = ['deepseek', 'openai', 'gemini', 'openrouter'];
    const customConfiguredProviders = Array.from(new Set([
        ...Object.keys(aiSettings.keys || {}),
        ...Object.keys(aiSettings.customModels || {}),
        // Only take non-flag keys from baseUrl for provider detection
        ...Object.keys(aiSettings.baseUrl || {}).filter(k => k !== 'importEnabled' && k !== 'autoParseEnabled')
    ])).filter(p => !defaultProviders.includes(p) && p !== 'custom' && p.trim() !== '');

    useEffect(() => {
        // Check if push is supported and subscribed
        if (pushService.isSupported()) {
            navigator.serviceWorker.ready.then(reg => {
                reg.pushManager.getSubscription().then(sub => {
                    setNotifications(!!sub);
                    setBudgetAlerts(!!sub);
                });
            });
        }
        getAiSettings()
            .then(setAiSettings)
            .catch(err => setAiError(err.message || 'Failed to load AI settings'));

        api.getVapidKey()
            .catch(() => setVapidConfigured(false));
    }, []);

    if (!context) return null;
    const { theme, setTheme, refreshData } = context;

    const handleThemeChange = (newTheme: 'light' | 'dark') => {
        setTheme(newTheme);
    };

    const handleNotificationToggle = async (checked: boolean) => {
        // Optimistic update
        setNotifications(checked);

        try {
            if (checked) {
                const permission = await Notification.requestPermission();
                if (permission !== 'granted') {
                    throw new Error('Permission denied');
                }
                await pushService.subscribeUser();
                setBudgetAlerts(true);
            } else {
                await pushService.unsubscribeUser();
                setBudgetAlerts(false);
            }
        } catch (error: any) {
            console.error('Notification toggle failed:', error);
            // Revert UI on failure
            setNotifications(!checked);

            let message = 'Failed to update notification settings.';
            if (error.message === 'Permission denied') {
                message = 'Notification permission was denied. Please enable notifications in your browser settings.';
            } else if (error.message.includes('Push notifications are not configured')) {
                message = 'Push notification configuration is missing on the backend.';
            }

            showToast(message, 'error');
        }
    };

    const handleBudgetAlertsToggle = async (checked: boolean) => {
        setBudgetAlerts(checked);
        try {
            if (checked) {
                await handleNotificationToggle(true);
            } else {
                await pushService.unsubscribeUser();
                setNotifications(false);
            }
        } catch {
            setBudgetAlerts(!checked);
        }
    };

    const handleClearData = async (options: { transactions: boolean; budgets: boolean; accounts: boolean }) => {
        // Let errors propagate so ClearDataModal keeps itself open and shows the failure.
        await api.clearData(options);
        await refreshData();
        showToast('Selected data cleared successfully.', 'success');
    };

    const handleSaveAiSettings = async (settingsToSave?: AiSettings) => {
        const targetSettings = settingsToSave || aiSettings;
        setAiError('');
        try {
            const updated = await saveAiSettings(targetSettings);
            setAiSettings(updated);
            setAiSaved(true);
        } catch (err: any) {
            setAiError(err.message || 'Failed to save AI settings');
        }
    };

    const handleAiProviderChange = (provider: AiProvider) => {
        setAiSaved(false);
        setRevealedKeys({});
        setNewModelInput('');
        setNewKeyInput('');
        const updated: AiSettings = {
            ...aiSettings,
            provider,
            model: (aiSettings.customModels[provider] || [])[0] || ''
        };
        setAiSettings(updated);
    };

    const addModel = () => {
        const val = newModelInput.trim();
        if (!val) return;
        const existing = aiSettings.customModels[aiSettings.provider] || [];
        if (existing.includes(val)) return;
        setAiSaved(false);
        setAiSettings(prev => ({
            ...prev,
            model: val,
            customModels: { ...prev.customModels, [prev.provider]: [...existing, val] }
        }));
        setNewModelInput('');
    };

    const removeModel = (model: string) => {
        setAiSaved(false);
        setAiSettings(prev => {
            const updated = (prev.customModels[prev.provider] || []).filter(m => m !== model);
            return {
                ...prev,
                model: prev.model === model ? (updated[0] || '') : prev.model,
                customModels: { ...prev.customModels, [prev.provider]: updated }
            };
        });
    };

    const addKey = () => {
        const val = newKeyInput.trim();
        if (!val) return;
        setAiSaved(false);
        setAiSettings(prev => ({
            ...prev,
            keys: { ...prev.keys, [prev.provider]: [...(prev.keys[prev.provider] || []), val] }
        }));
        setNewKeyInput('');
    };

    const removeKey = (index: number) => {
        setAiSaved(false);
        setAiSettings(prev => ({
            ...prev,
            keys: {
                ...prev.keys,
                [prev.provider]: (prev.keys[prev.provider] || []).filter((_, i) => i !== index)
            }
        }));
    };

    const handleSetActiveKey = (index: number) => {
        if (index === 0) return;
        setAiSaved(false);
        setAiSettings(prev => {
            const providerKeys = [...(prev.keys[prev.provider] || [])];
            if (index > 0 && index < providerKeys.length) {
                const [selectedKey] = providerKeys.splice(index, 1);
                providerKeys.unshift(selectedKey);
            }
            return {
                ...prev,
                keys: {
                    ...prev.keys,
                    [prev.provider]: providerKeys
                }
            };
        });
    };
    
    const handleDeleteProvider = async () => {
        const providerToDelete = aiSettings.provider;
        if (!providerToDelete || defaultProviders.includes(providerToDelete) || providerToDelete === 'custom') return;

        const confirmed = window.confirm(`Are you sure you want to delete the provider "${providerToDelete}" and all of its configured models and API keys?`);
        if (!confirmed) return;

        setAiSaved(false);

        const updatedKeys = { ...aiSettings.keys };
        delete updatedKeys[providerToDelete];

        const updatedCustomModels = { ...aiSettings.customModels };
        delete updatedCustomModels[providerToDelete];

        const updatedBaseUrl = { ...aiSettings.baseUrl };
        delete updatedBaseUrl[providerToDelete];

        const newSettings: AiSettings = {
            ...aiSettings,
            provider: 'deepseek',
            model: '',
            keys: updatedKeys,
            customModels: updatedCustomModels,
            baseUrl: updatedBaseUrl
        };

        setAiSettings(newSettings);
        await handleSaveAiSettings(newSettings);
    };

    const handleTestConnection = async () => {
        setIsTestingConnection(true);
        try {
            const apiKey = aiSettings.keys[aiSettings.provider]?.[0] || '';
            const res = await api.fetch('/ai-settings/test', {
                method: 'POST',
                body: JSON.stringify({
                    provider: aiSettings.provider,
                    model: aiSettings.model,
                    apiKey,
                    baseUrl: aiSettings.baseUrl[aiSettings.provider] || ''
                })
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok && data.success) {
                showToast(`Connection successful! Model replied: ${data.message || ''}`, 'success');
            } else {
                showToast(`Connection failed: ${data.error || 'Unknown error'}`, 'error');
            }
        } catch (error: any) {
            showToast(`Connection failed: ${error.message || 'Network error'}`, 'error');
        } finally {
            setIsTestingConnection(false);
        }
    };

    return (
        <div className="space-y-6 max-w-4xl">
            <h2 className="text-3xl font-bold text-gray-darkest dark:text-gray-50">Settings</h2>



            {/* Notifications */}
            <Card>
                    <h3 className="text-xl font-semibold mb-4 text-gray-darkest dark:text-gray-50">Notifications</h3>
                    {!vapidConfigured && (
                        <div className="mb-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 flex items-start gap-2">
                            <Icon name="AlertTriangle" size={16} className="text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-amber-700 dark:text-amber-300">
                                Push notifications are not configured on this server. Contact the administrator to set up VAPID keys.
                            </p>
                        </div>
                    )}
                    <div className="space-y-4">
                        <div className={`flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg ${!vapidConfigured ? 'opacity-50' : ''}`}>
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <Icon name="Bell" size={18} className="text-gray-600 dark:text-gray-400" />
                                <h4 className="font-medium text-gray-darkest dark:text-gray-50">Enable Notifications</h4>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Allow this browser to receive ExpenseVision notifications
                            </p>
                        </div>
                        <label className={`relative inline-flex items-center ${vapidConfigured ? 'cursor-pointer' : 'cursor-not-allowed'} ml-4`}>
                            <input
                                type="checkbox"
                                checked={notifications}
                                onChange={(e) => vapidConfigured && handleNotificationToggle(e.target.checked)}
                                disabled={!vapidConfigured}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 dark:peer-focus:ring-primary/40 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
                        </label>
                        </div>
                    </div>

                    <div className={`flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg ${!vapidConfigured ? 'opacity-50' : ''}`}>
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <Icon name="AlertCircle" size={18} className="text-gray-600 dark:text-gray-400" />
                                <h4 className="font-medium text-gray-darkest dark:text-gray-50">Budget Alerts</h4>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Get notified when a new expense pushes a category over budget
                            </p>
                        </div>
                        <label className={`relative inline-flex items-center ${vapidConfigured ? 'cursor-pointer' : 'cursor-not-allowed'} ml-4`}>
                            <input
                                type="checkbox"
                                checked={budgetAlerts}
                                onChange={(e) => vapidConfigured && handleBudgetAlertsToggle(e.target.checked)}
                                disabled={!vapidConfigured}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 dark:peer-focus:ring-primary/40 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
                        </label>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg opacity-60">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <Icon name="Mail" size={18} className="text-gray-600 dark:text-gray-400" />
                                <h4 className="font-medium text-gray-darkest dark:text-gray-50">Email Reports</h4>
                                <span className="px-1.5 py-0.5 text-[10px] font-bold rounded uppercase tracking-wider bg-gray-200 text-gray-600 dark:bg-gray-600 dark:text-gray-300">Coming soon</span>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Receive monthly financial summary reports via email
                            </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-not-allowed ml-4">
                            <input
                                type="checkbox"
                                checked={false}
                                disabled
                                readOnly
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 dark:peer-focus:ring-primary/40 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
                        </label>
                    </div>
            </Card>

            {/* AI */}
            <Card>
                <h3 className="text-xl font-semibold mb-1 text-gray-darkest dark:text-gray-50">AI Settings</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">Configure providers, models, and API keys for AI transaction parsing.</p>
                <div className="space-y-5">
                    <div className="flex items-start justify-between p-4 bg-gray-50 dark:bg-gray-700/10 rounded-lg border border-gray-200 dark:border-gray-700/50">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <Icon name="Sparkles" size={18} className="text-primary" />
                                <h4 className="font-medium text-gray-darkest dark:text-gray-50">AI Statement Imports</h4>
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Automatically extract, map, and import transaction details from statements (CSV, Excel, PDF, Receipt Images).
                            </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer ml-4">
                            <input
                                type="checkbox"
                                checked={aiSettings.importEnabled !== false}
                                onChange={(e) => {
                                    setAiSaved(false);
                                    const nextImport = e.target.checked;
                                    const nextAutoParse = aiSettings.autoParseEnabled !== false;
                                    setAiSettings(prev => ({
                                        ...prev,
                                        importEnabled: nextImport,
                                        enabled: nextImport || nextAutoParse
                                    }));
                                }}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 dark:peer-focus:ring-primary/40 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
                        </label>
                    </div>

                    <div className="flex items-start justify-between p-4 bg-gray-50 dark:bg-gray-700/10 rounded-lg border border-gray-200 dark:border-gray-700/50">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <Icon name="Zap" size={18} className="text-primary" />
                                <h4 className="font-medium text-gray-darkest dark:text-gray-50">AI Transaction Auto-Parsing</h4>
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Parse quick entry transaction descriptions in natural language automatically.
                            </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer ml-4">
                            <input
                                type="checkbox"
                                checked={aiSettings.autoParseEnabled !== false}
                                onChange={(e) => {
                                    setAiSaved(false);
                                    const nextAutoParse = e.target.checked;
                                    const nextImport = aiSettings.importEnabled !== false;
                                    setAiSettings(prev => ({
                                        ...prev,
                                        autoParseEnabled: nextAutoParse,
                                        enabled: nextImport || nextAutoParse
                                    }));
                                }}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 dark:peer-focus:ring-primary/40 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
                        </label>
                    </div>

                    {aiError && (
                        <p className="text-sm text-danger">{aiError}</p>
                    )}

                    {/* Provider selector */}
                    <div>
                        <label htmlFor="ai-provider" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Provider</label>
                        <select
                            id="ai-provider"
                            value={defaultProviders.includes(aiSettings.provider) || customConfiguredProviders.includes(aiSettings.provider) ? aiSettings.provider : 'custom'}
                            onChange={(e) => {
                                const val = e.target.value;
                                handleAiProviderChange(val);
                            }}
                            className="block w-full bg-gray-100 border-transparent rounded-lg p-3 focus:ring-2 focus:ring-primary focus:bg-white text-base dark:bg-gray-700 dark:text-gray-100 dark:focus:bg-gray-600"
                        >
                            <option value="deepseek">DeepSeek</option>
                            <option value="openai">OpenAI</option>
                            <option value="gemini">Gemini</option>
                            <option value="openrouter">OpenRouter</option>
                            {customConfiguredProviders.map(p => (
                                <option key={p} value={p}>{p}</option>
                            ))}
                            <option value="custom">Add Provider (OpenAI-compatible)</option>
                        </select>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 italic">
                            {aiSettings.provider === 'deepseek' && "Uses DeepSeek base URL: https://api.deepseek.com"}
                            {aiSettings.provider === 'openai' && "Uses OpenAI base URL: https://api.openai.com/v1"}
                            {aiSettings.provider === 'gemini' && "Uses Gemini base URL: https://generativelanguage.googleapis.com"}
                            {aiSettings.provider === 'openrouter' && "Uses OpenRouter base URL: https://openrouter.ai/api/v1"}
                        </p>
                    </div>

                    {/* Custom provider name / details — shown when not a default provider or when custom is selected */}
                    {(!defaultProviders.includes(aiSettings.provider) || aiSettings.provider === 'custom') && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="ai-custom-provider" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Custom Provider Name</label>
                                <div className="flex gap-2">
                                    <input
                                        id="ai-custom-provider"
                                        type="text"
                                        value={aiSettings.provider === 'custom' ? '' : aiSettings.provider}
                                        onChange={(e) => {
                                            const val = e.target.value.trim() || 'custom';
                                            setAiSaved(false);
                                            setAiSettings(prev => ({
                                                ...prev,
                                                provider: val,
                                                model: (prev.customModels[val] || [])[0] || ''
                                            }));
                                        }}
                                        placeholder="e.g. groq"
                                        className="block flex-1 bg-gray-100 border-transparent rounded-lg p-3 focus:ring-2 focus:ring-primary focus:bg-white text-base dark:bg-gray-700 dark:text-gray-100 dark:focus:bg-gray-600"
                                    />
                                    {!defaultProviders.includes(aiSettings.provider) && aiSettings.provider !== 'custom' && (
                                        <button
                                            type="button"
                                            onClick={handleDeleteProvider}
                                            className="btn btn-danger flex items-center justify-center px-4"
                                            title="Delete Provider"
                                        >
                                            <Icon name="Trash2" size={18} className="mr-1.5" />
                                            <span>Delete Provider</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div>
                                <label htmlFor="ai-base-url" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Base URL</label>
                                <input
                                    id="ai-base-url"
                                    type="text"
                                    value={aiSettings.baseUrl[aiSettings.provider] || ''}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        setAiSaved(false);
                                        setAiSettings(prev => ({
                                            ...prev,
                                            baseUrl: {
                                                ...(prev.baseUrl || {}),
                                                [prev.provider]: value
                                            }
                                        }));
                                    }}
                                    placeholder="https://api.groq.com/openai/v1"
                                    className="block w-full bg-gray-100 border-transparent rounded-lg p-3 focus:ring-2 focus:ring-primary focus:bg-white text-base dark:bg-gray-700 dark:text-gray-100 dark:focus:bg-gray-600"
                                />
                            </div>
                        </div>
                    )}

                    {/* Models for current provider */}
                    <div className="p-4 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-gray-200 dark:border-gray-700">
                        <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3 capitalize">
                            Models for {aiSettings.provider}
                        </p>
                        {(aiSettings.customModels[aiSettings.provider] || []).length === 0 ? (
                            <p className="text-xs text-gray-400 dark:text-gray-500 mb-3 italic">No models added yet. Add one below to select it.</p>
                        ) : (
                            <div className="flex flex-wrap gap-2 mb-3">
                                {(aiSettings.customModels[aiSettings.provider] || []).map(m => (
                                    <div
                                        key={m}
                                        className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all cursor-pointer select-none ${
                                            aiSettings.model === m
                                                ? 'bg-primary text-white border-primary shadow'
                                                : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-600 hover:border-primary hover:text-primary dark:hover:text-primary'
                                        }`}
                                        onClick={() => { setAiSaved(false); setAiSettings(prev => ({ ...prev, model: m })); }}
                                    >
                                        <span>{m}</span>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); removeModel(m); }}
                                            className={`rounded-full p-0.5 transition-colors ${
                                                aiSettings.model === m
                                                    ? 'text-white/70 hover:text-white hover:bg-white/20'
                                                    : 'text-gray-400 hover:text-danger hover:bg-red-50 dark:hover:bg-red-900/30'
                                            }`}
                                            aria-label={`Remove model ${m}`}
                                        >
                                            <Icon name="X" size={12} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                        <div className="flex gap-2">
                            <input
                                id="new-model-input"
                                type="text"
                                value={newModelInput}
                                onChange={e => setNewModelInput(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') addModel(); }}
                                placeholder="Add model name (e.g. gpt-4-turbo)"
                                className="flex-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-primary dark:text-gray-100 outline-none transition"
                            />
                            <button type="button" onClick={addModel} className="btn btn-secondary whitespace-nowrap text-sm py-2">
                                <Icon name="Plus" size={15} className="mr-1" /> Add
                            </button>
                        </div>
                    </div>

                    {/* API Keys for current provider */}
                    <div className="p-4 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-gray-200 dark:border-gray-700">
                        <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3 capitalize">
                            API Keys for {aiSettings.provider}
                        </p>
                        <div className="space-y-2 mb-3">
                            {(aiSettings.keys[aiSettings.provider] || []).map((key, index) => (
                                <div key={index} className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => handleSetActiveKey(index)}
                                        className={`p-2 rounded-lg border transition-colors flex items-center justify-center ${
                                            index === 0
                                                ? 'text-amber-500 fill-current bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800'
                                                : 'text-gray-400 dark:text-gray-500 hover:text-amber-500 border-gray-200 dark:border-gray-600'
                                        }`}
                                        title="Set as active key"
                                    >
                                        <Icon name="Star" size={15} className={index === 0 ? 'fill-current' : ''} />
                                    </button>
                                    <input
                                        type="text"
                                        value={revealedKeys[`${aiSettings.provider}-${index}`] ? key : '•••••••••••••' + (key.length > 3 ? key.slice(-3) : key)}
                                        readOnly
                                        className="flex-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm font-mono dark:text-gray-100"
                                    />
                                    <button
                                        type="button"
                                        className="btn btn-secondary p-2"
                                        onClick={() => setRevealedKeys(prev => ({ ...prev, [`${aiSettings.provider}-${index}`]: !prev[`${aiSettings.provider}-${index}`] }))}
                                        title="Reveal / Hide Key"
                                    >
                                        <Icon name={revealedKeys[`${aiSettings.provider}-${index}`] ? 'EyeOff' : 'Eye'} size={15} />
                                    </button>
                                    <button
                                        type="button"
                                        className="btn btn-danger p-2 text-white"
                                        onClick={() => removeKey(index)}
                                        title="Delete Key"
                                    >
                                        <Icon name="Trash2" size={15} />
                                    </button>
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <input
                                id="new-key-input"
                                type="text"
                                value={newKeyInput}
                                onChange={e => setNewKeyInput(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') addKey(); }}
                                placeholder="Add new API key (sk-...)"
                                className="flex-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-primary focus:border-primary dark:text-gray-100 outline-none transition"
                            />
                            <button type="button" onClick={addKey} className="btn btn-secondary whitespace-nowrap text-sm py-2">
                                <Icon name="Plus" size={15} className="mr-1" /> Add
                            </button>
                        </div>
                    </div>

                    <div className="flex justify-end pt-1 gap-3">
                        <button
                            type="button"
                            onClick={handleTestConnection}
                            disabled={isTestingConnection}
                            className="btn btn-secondary flex items-center justify-center min-w-[140px]"
                        >
                            {isTestingConnection ? (
                                <>
                                    <Icon name="Loader2" size={16} className="animate-spin mr-2" />
                                    Testing...
                                </>
                            ) : (
                                <>🧪 Test Connection</>
                            )}
                        </button>
                        <button
                            type="button"
                            onClick={() => handleSaveAiSettings()}
                            className={`btn transition-all duration-300 ${aiSaved ? 'bg-green-600 hover:bg-green-700 text-white' : 'btn-primary'}`}
                        >
                            {aiSaved
                                ? <><Icon name="Check" size={16} className="mr-2" />Saved</>
                                : <><Icon name="Save" size={16} className="mr-2" />Save AI Settings</>
                            }
                        </button>
                    </div>
                </div>
            </Card>

            {/* Data Management */}
            <Card>
                <h3 className="text-xl font-semibold mb-4 text-gray-darkest dark:text-gray-50">Data Management</h3>
                <div className="space-y-4">
                    <div className="flex items-start justify-between p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                                <Icon name="AlertTriangle" size={20} className="text-danger" />
                                <h4 className="font-semibold text-gray-darkest dark:text-gray-50">Clear / Reset Data</h4>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Delete selected components of your account data (transactions, budgets, and/or accounts). This action cannot be undone.
                            </p>
                        </div>
                        <button
                            onClick={() => setIsClearDataOpen(true)}
                            className="btn btn-danger ml-4"
                        >
                            <Icon name="Trash2" size={16} className="mr-2" />
                            Clear / Reset Data
                        </button>
                    </div>

                    <div className="flex items-start justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                                <Icon name="ArrowLeftRight" size={20} className="text-primary" />
                                <h4 className="font-semibold text-gray-darkest dark:text-gray-50">Import / Export</h4>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Import transactions from a statement, or export your data as CSV/Excel, on the dedicated Import/Export page
                            </p>
                        </div>
                        <button
                            onClick={() => navigate('/import-export')}
                            className="btn flex items-center gap-1.5 py-2 px-3.5 text-xs font-bold bg-primary hover:bg-primary-hover text-white border border-primary rounded-lg transition-colors shadow-sm ml-4"
                        >
                            <Icon name="ArrowLeftRight" size={14} />
                            Go to Import / Export
                        </button>
                    </div>
                </div>
            </Card>

            {/* Support Us */}
            <Card>
                <h3 className="text-xl font-semibold mb-4 text-gray-darkest dark:text-gray-50">Support Us</h3>
                <div className="flex flex-col md:flex-row gap-6 items-center">
                    <div className="flex-1">
                        <p className="text-gray-600 dark:text-gray-400 mb-4">
                            ExpenseVision is an open-source project. If you find it useful, please consider supporting its development!
                        </p>
                        <div className="flex gap-4">
                            <a href="https://github.com/sponsors/yourusername" target="_blank" rel="noopener noreferrer" className="btn btn-primary flex items-center gap-2">
                                <Icon name="Heart" size={18} />
                                Sponsor on GitHub
                            </a>
                            <a href="https://www.buymeacoffee.com/yourusername" target="_blank" rel="noopener noreferrer" className="btn btn-secondary flex items-center gap-2">
                                <Icon name="Coffee" size={18} />
                                Buy us a coffee
                            </a>
                        </div>
                    </div>
                </div>
            </Card>

            {/* About */}
            <Card>
                <h3 className="text-xl font-semibold mb-4 text-gray-darkest dark:text-gray-50">About</h3>
                <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                    <p><strong className="text-gray-darkest dark:text-gray-50">ExpenseVision</strong> - Personal Finance Manager</p>
                    <p>Version: 1.0.0</p>
                    <p>© 2025 ExpenseVision. All rights reserved.</p>
                    <div className="pt-4 flex gap-4">
                        <a href="https://github.com/yourusername/expensevision/issues" target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary-hover">Report a Bug</a>
                        <span className="text-gray-300">|</span>
                        <a href="mailto:support@expensevision.com" className="text-primary hover:text-primary-hover">Contact Support</a>
                    </div>
                </div>
            </Card>

            <ClearDataModal
                isOpen={isClearDataOpen}
                onClose={() => setIsClearDataOpen(false)}
                onConfirm={handleClearData}
            />
        </div>
    );
};
