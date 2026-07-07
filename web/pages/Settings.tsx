import React, { useState, useEffect, useContext } from 'react';
import { Card } from '../components/Card';
import { Icon } from '../components/Icon';
import { AppContext } from '../App';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { authService } from '../services/auth';
import { pushService } from '../services/push';
import { AiProvider, AiSettings, defaultAiSettings, getAiSettings, providerModels, saveAiSettings } from '../services/aiSettings';
import { ImportTransactionsModal } from '../components/ImportTransactionsModal';
import { api } from '../services/api';

export const Settings: React.FC = () => {
    const context = useContext(AppContext);
    if (!context) return null;
    const { theme, setTheme, transactions, clearAllTransactions } = context;

    const [notifications, setNotifications] = useState(false); // Default to false until checked
    const [budgetAlerts, setBudgetAlerts] = useState(false);
    const [emailReports, setEmailReports] = useState(false);
    const [clearConfirm, setClearConfirm] = useState(false);
    const [clearPhrase, setClearPhrase] = useState('');
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [aiSettings, setAiSettings] = useState<AiSettings>(defaultAiSettings);
    const [aiSaved, setAiSaved] = useState(false);
    const [aiError, setAiError] = useState('');
    const [vapidConfigured, setVapidConfigured] = useState(true);

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

            alert(message);
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

    const handleClearAllTransactions = async () => {
        await clearAllTransactions('DELETE');
        setClearPhrase('');
        setClearConfirm(false);
    };

    const handleExportData = async () => {
        try {
            const token = authService.getToken();
            if (!token) return;

            const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/transactions/export`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) throw new Error('Export failed');

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `transactions_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Export failed:', error);
            alert('Failed to export data');
        }
    };

    const handleAiProviderChange = (provider: AiProvider) => {
        setAiSaved(false);
        setAiSettings(prev => ({
            ...prev,
            provider,
            model: providerModels[provider][0] || ''
        }));
    };

    const handleSaveAiSettings = async () => {
        setAiError('');
        try {
            setAiSettings(await saveAiSettings(aiSettings));
            setAiSaved(true);
            window.setTimeout(() => setAiSaved(false), 2500);
        } catch (err: any) {
            setAiError(err.message || 'Failed to save AI settings');
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

                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <Icon name="Mail" size={18} className="text-gray-600 dark:text-gray-400" />
                                <h4 className="font-medium text-gray-darkest dark:text-gray-50">Email Reports</h4>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Receive monthly financial summary reports via email
                            </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer ml-4">
                            <input
                                type="checkbox"
                                checked={emailReports}
                                onChange={(e) => setEmailReports(e.target.checked)}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 dark:peer-focus:ring-primary/40 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
                        </label>
                    </div>
            </Card>

            {/* AI */}
            <Card>
                <h3 className="text-xl font-semibold mb-4 text-gray-darkest dark:text-gray-50">AI</h3>
                <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <Icon name="Sparkles" size={18} className="text-gray-600 dark:text-gray-400" />
                                <h4 className="font-medium text-gray-darkest dark:text-gray-50">AI Transaction Parsing</h4>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Convert typed or dictated transaction notes into draft transactions.
                            </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer ml-4">
                            <input
                                type="checkbox"
                                checked={aiSettings.enabled}
                                onChange={(e) => {
                                    setAiSaved(false);
                                    setAiSettings(prev => ({ ...prev, enabled: e.target.checked }));
                                }}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 dark:peer-focus:ring-primary/40 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
                        </label>
                    </div>

                    {aiError && (
                        <p className="text-sm text-danger">{aiError}</p>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="ai-provider" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Provider</label>
                            <select
                                id="ai-provider"
                                value={aiSettings.provider}
                                onChange={(e) => handleAiProviderChange(e.target.value as AiProvider)}
                                className="block w-full bg-gray-100 border-transparent rounded-lg p-3 focus:ring-2 focus:ring-primary focus:bg-white text-base dark:bg-gray-700 dark:text-gray-100 dark:focus:bg-gray-600"
                            >
                                <option value="deepseek">DeepSeek</option>
                                <option value="openai">OpenAI</option>
                                <option value="gemini">Gemini</option>
                                <option value="openrouter">OpenRouter</option>
                                <option value="custom">Custom OpenAI-compatible</option>
                            </select>
                        </div>

                        <div>
                            <label htmlFor="ai-model" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Model</label>
                            <input
                                id="ai-model"
                                value={aiSettings.model}
                                list="ai-model-options"
                                onChange={(e) => {
                                    setAiSaved(false);
                                    setAiSettings(prev => ({ ...prev, model: e.target.value }));
                                }}
                                placeholder="deepseek-v4-flash"
                                className="block w-full bg-gray-100 border-transparent rounded-lg p-3 focus:ring-2 focus:ring-primary focus:bg-white text-base dark:bg-gray-700 dark:text-gray-100 dark:focus:bg-gray-600"
                            />
                            <datalist id="ai-model-options">
                                {[...(providerModels[aiSettings.provider] || []), ...aiSettings.customModels].filter(Boolean).map(model => (
                                    <option key={model} value={model} />
                                ))}
                            </datalist>
                        </div>
                    </div>

                    {aiSettings.provider === 'custom' && (
                        <div>
                            <label htmlFor="ai-base-url" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Base URL</label>
                            <input
                                id="ai-base-url"
                                value={aiSettings.baseUrl || ''}
                                onChange={(e) => {
                                    setAiSaved(false);
                                    setAiSettings(prev => ({ ...prev, baseUrl: e.target.value }));
                                }}
                                placeholder="https://your-provider.example/v1"
                                className="block w-full bg-gray-100 border-transparent rounded-lg p-3 focus:ring-2 focus:ring-primary focus:bg-white text-base dark:bg-gray-700 dark:text-gray-100 dark:focus:bg-gray-600"
                            />
                        </div>
                    )}

                    <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Custom Models</label>
                        <div className="flex gap-2 mb-2">
                            <input
                                id="new-custom-model"
                                type="text"
                                placeholder="Add custom model name"
                                className="flex-1 bg-gray-100 border-transparent rounded-lg p-3 focus:ring-2 focus:ring-primary focus:bg-white text-base dark:bg-gray-700 dark:text-gray-100 dark:focus:bg-gray-600"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        const input = e.target as HTMLInputElement;
                                        if (input.value.trim() && !aiSettings.customModels.includes(input.value.trim())) {
                                            setAiSaved(false);
                                            setAiSettings(prev => ({ ...prev, customModels: [...prev.customModels, input.value.trim()] }));
                                            input.value = '';
                                        }
                                    }
                                }}
                            />
                            <button
                                className="btn btn-secondary whitespace-nowrap"
                                onClick={() => {
                                    const input = document.getElementById('new-custom-model') as HTMLInputElement;
                                    if (input.value.trim() && !aiSettings.customModels.includes(input.value.trim())) {
                                        setAiSaved(false);
                                        setAiSettings(prev => ({ ...prev, customModels: [...prev.customModels, input.value.trim()] }));
                                        input.value = '';
                                    }
                                }}
                            >
                                <Icon name="Plus" size={16} className="mr-1" /> Add
                            </button>
                        </div>
                        {aiSettings.customModels.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                                {aiSettings.customModels.map(model => (
                                    <div key={model} className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 px-3 py-1.5 rounded-full text-sm">
                                        <span className="text-gray-700 dark:text-gray-300">{model}</span>
                                        <button
                                            onClick={() => {
                                                setAiSaved(false);
                                                setAiSettings(prev => ({
                                                    ...prev,
                                                    customModels: prev.customModels.filter(m => m !== model)
                                                }));
                                            }}
                                            className="text-gray-400 hover:text-danger focus:outline-none"
                                            aria-label="Remove model"
                                        >
                                            <Icon name="X" size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div>
                        <label htmlFor="ai-api-key" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">API Key for {aiSettings.provider}</label>
                        <div className="flex items-center gap-2">
                            <input
                                id="ai-api-key"
                                type={document.getElementById('reveal-key')?.getAttribute('data-revealed') === 'true' ? 'text' : 'password'}
                                value={aiSettings.keys[aiSettings.provider] || ''}
                                onChange={(e) => {
                                    setAiSaved(false);
                                    setAiSettings(prev => ({ 
                                        ...prev, 
                                        keys: { ...prev.keys, [prev.provider]: e.target.value }
                                    }));
                                }}
                                placeholder="sk-..."
                                className="flex-1 bg-gray-100 border-transparent rounded-lg p-3 focus:ring-2 focus:ring-primary focus:bg-white text-base dark:bg-gray-700 dark:text-gray-100 dark:focus:bg-gray-600"
                            />
                            <button
                                id="reveal-key"
                                type="button"
                                data-revealed="false"
                                className="btn btn-secondary h-full"
                                onClick={(e) => {
                                    const btn = e.currentTarget;
                                    const isRevealed = btn.getAttribute('data-revealed') === 'true';
                                    btn.setAttribute('data-revealed', (!isRevealed).toString());
                                    const input = document.getElementById('ai-api-key') as HTMLInputElement;
                                    if (input) {
                                        input.type = isRevealed ? 'password' : 'text';
                                    }
                                }}
                                title="Reveal/Hide Key"
                            >
                                <Icon name="Eye" size={16} />
                            </button>
                            <button
                                type="button"
                                className="btn btn-danger h-full text-white"
                                onClick={() => {
                                    setAiSaved(false);
                                    setAiSettings(prev => {
                                        const newKeys = { ...prev.keys };
                                        delete newKeys[prev.provider];
                                        return { ...prev, keys: newKeys };
                                    });
                                }}
                                title="Delete Key"
                            >
                                <Icon name="Trash2" size={16} />
                            </button>
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <button 
                            onClick={handleSaveAiSettings} 
                            className={`btn ${aiSaved ? 'bg-green-600 hover:bg-green-700 text-white' : 'btn-primary'}`}
                        >
                            {aiSaved ? <Icon name="Check" size={16} className="mr-2" /> : <Icon name="Save" size={16} className="mr-2" />}
                            {aiSaved ? 'Saved' : 'Save AI Settings'}
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
                                <h4 className="font-semibold text-gray-darkest dark:text-gray-50">Clear All Transactions</h4>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                This will permanently delete all your transactions. This action cannot be undone.
                            </p>
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mt-2">
                                Total transactions: <span className="text-danger">{transactions.length}</span>
                            </p>
                        </div>
                        <button
                            onClick={() => setClearConfirm(true)}
                            className="btn btn-danger ml-4"
                        >
                            <Icon name="Trash2" size={16} className="mr-2" />
                            Clear All
                        </button>
                    </div>

                    <div className="flex items-start justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                                <Icon name="Upload" size={20} className="text-primary" />
                                <h4 className="font-semibold text-gray-darkest dark:text-gray-50">Import Data</h4>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Import transactions from a CSV file
                            </p>
                        </div>
                        <button onClick={() => setIsImportModalOpen(true)} className="btn btn-secondary ml-4">
                            <Icon name="Upload" size={16} className="mr-2" />
                            Import CSV
                        </button>
                    </div>

                    <div className="flex items-start justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                                <Icon name="Download" size={20} className="text-primary" />
                                <h4 className="font-semibold text-gray-darkest dark:text-gray-50">Export Data</h4>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Download all your financial data as a CSV file for backup or analysis
                            </p>
                        </div>
                        <button onClick={handleExportData} className="btn btn-secondary ml-4">
                            <Icon name="Download" size={16} className="mr-2" />
                            Export CSV
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

            <ConfirmDialog
                isOpen={clearConfirm}
                onClose={() => setClearConfirm(false)}
                onConfirm={handleClearAllTransactions}
                title="Clear All Transactions"
                message={`Are you absolutely sure you want to delete all ${transactions.length} transactions and reset account balances?`}
                confirmText="Yes, Clear All"
                cancelText="Cancel"
                variant="danger"
                requirePhrase="DELETE"
            />
            <ImportTransactionsModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                onImportSuccess={() => {}}
            />
        </div>
    );
};
