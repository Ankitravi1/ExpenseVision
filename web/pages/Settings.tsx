import React, { useState, useEffect, useContext } from 'react';
import { Card } from '../components/Card';
import { Icon } from '../components/Icon';
import { AppContext } from '../App';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { authService } from '../services/auth';
import { pushService } from '../services/push';

export const Settings: React.FC = () => {
    const context = useContext(AppContext);
    if (!context) return null;
    const { theme, setTheme, transactions, clearAllTransactions } = context;

    const [notifications, setNotifications] = useState(false); // Default to false until checked
    const [budgetAlerts, setBudgetAlerts] = useState(true);
    const [emailReports, setEmailReports] = useState(false);
    const [clearConfirm, setClearConfirm] = useState(false);

    useEffect(() => {
        // Check if push is supported and subscribed
        if (pushService.isSupported()) {
            navigator.serviceWorker.ready.then(reg => {
                reg.pushManager.getSubscription().then(sub => {
                    setNotifications(!!sub);
                });
            });
        }
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
            } else {
                await pushService.unsubscribeUser();
            }
        } catch (error: any) {
            console.error('Notification toggle failed:', error);
            // Revert UI on failure
            setNotifications(!checked);

            let message = 'Failed to update notification settings.';
            if (error.message === 'Permission denied') {
                message = 'Notification permission was denied. Please enable notifications in your browser settings.';
            } else if (error.message.includes('VAPID')) {
                message = 'Push notification configuration is missing (VAPID Key).';
            }

            alert(message);
        }
    };

    const handleClearAllTransactions = () => {
        clearAllTransactions();
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

    return (
        <div className="space-y-6 max-w-4xl">
            <h2 className="text-3xl font-bold text-gray-darkest dark:text-gray-50">Settings</h2>

            {/* Appearance */}
            <Card>
                <h3 className="text-xl font-semibold mb-4 text-gray-darkest dark:text-gray-50">Appearance</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                            Theme
                        </label>
                        <div className="grid grid-cols-2 gap-4 max-w-md">
                            <button
                                onClick={() => handleThemeChange('light')}
                                className={`p-4 rounded-lg border-2 transition-all ${theme === 'light'
                                    ? 'border-primary bg-primary-light dark:bg-primary/20'
                                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                    }`}
                            >
                                <Icon name="Sun" size={24} className="mx-auto mb-2" />
                                <p className="text-sm font-medium text-center">Light</p>
                            </button>
                            <button
                                onClick={() => handleThemeChange('dark')}
                                className={`p-4 rounded-lg border-2 transition-all ${theme === 'dark'
                                    ? 'border-primary bg-primary-light dark:bg-primary/20'
                                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                    }`}
                            >
                                <Icon name="Moon" size={24} className="mx-auto mb-2" />
                                <p className="text-sm font-medium text-center">Dark</p>
                            </button>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">
                            Choose your preferred color scheme.
                        </p>
                    </div>
                </div>
            </Card>

            {/* Notifications */}
            <Card>
                <h3 className="text-xl font-semibold mb-4 text-gray-darkest dark:text-gray-50">Notifications</h3>
                <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <Icon name="Bell" size={18} className="text-gray-600 dark:text-gray-400" />
                                <h4 className="font-medium text-gray-darkest dark:text-gray-50">Enable Notifications</h4>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Receive notifications about your financial activity
                            </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer ml-4">
                            <input
                                type="checkbox"
                                checked={notifications}
                                onChange={(e) => handleNotificationToggle(e.target.checked)}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 dark:peer-focus:ring-primary/40 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
                        </label>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <Icon name="AlertCircle" size={18} className="text-gray-600 dark:text-gray-400" />
                                <h4 className="font-medium text-gray-darkest dark:text-gray-50">Budget Alerts</h4>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Get notified when you're approaching or exceeding budget limits
                            </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer ml-4">
                            <input
                                type="checkbox"
                                checked={budgetAlerts}
                                onChange={(e) => setBudgetAlerts(e.target.checked)}
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
                message={`Are you absolutely sure you want to delete all ${transactions.length} transactions? This action cannot be undone and will permanently remove all your transaction history.`}
                confirmText="Yes, Clear All"
                cancelText="Cancel"
                variant="danger"
            />
        </div>
    );
};
