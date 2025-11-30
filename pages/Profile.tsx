import React, { useState, useContext, useEffect } from 'react';
import { Card } from '../components/Card';
import { Icon } from '../components/Icon';
import { AppContext } from '../App';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { authService, User } from '../services/auth';
import { CURRENCIES } from '../utils/currency';

export const Profile: React.FC = () => {
    const context = useContext(AppContext);
    const [clearConfirm, setClearConfirm] = useState(false);
    const [currency, setCurrency] = useState('INR');
    const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        const currentUser = authService.getUser();
        setUser(currentUser);
        if (currentUser) {
            setName(currentUser.name);
            if (currentUser.timezone) {
                setTimezone(currentUser.timezone);
            }
            if (currentUser.currency) {
                setCurrency(currentUser.currency);
            }
        }
    }, []);

    const handleSaveProfile = async () => {
        setIsSaving(true);
        try {
            const updatedUser = await authService.updateProfile({
                name,
                timezone,
                currency
            });
            setUser(updatedUser.user);
            setGlobalCurrency(currency);
            alert('Profile updated successfully!');
        } catch (error) {
            console.error('Failed to update profile:', error);
            alert('Failed to update profile');
        } finally {
            setIsSaving(false);
        }
    };

    if (!context) return null;

    const { transactions, clearAllTransactions, setActivePage, currency: globalCurrency, setCurrency: setGlobalCurrency } = context;
    const [name, setName] = useState('');
    const [isSaving, setIsSaving] = useState(false);

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

    const handleCurrencyChange = async (newCurrency: string) => {
        setCurrency(newCurrency);
        try {
            const updatedUser = await authService.updateProfile({
                currency: newCurrency
            });
            setUser(updatedUser.user);
            setGlobalCurrency(newCurrency);
            // Optional: Show a small toast or indicator, but user asked for "update and be saved... once we select"
        } catch (error) {
            console.error('Failed to update currency:', error);
            alert('Failed to update currency preference');
        }
    };

    return (
        <>
            <div className="space-y-6 max-w-4xl">
                <h2 className="text-3xl font-bold text-gray-darkest dark:text-gray-50">Profile Settings</h2>

                {/* User Information */}
                <Card>
                    <h3 className="text-xl font-semibold mb-4 text-gray-darkest dark:text-gray-50">User Information</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Name
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="input w-full"
                                placeholder="Your name"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Timezone
                            </label>
                            <select
                                value={timezone}
                                onChange={(e) => setTimezone(e.target.value)}
                                className="input w-full"
                            >
                                {Intl.supportedValuesOf('timeZone').map(tz => (
                                    <option key={tz} value={tz}>{tz}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Email
                            </label>
                            <input
                                type="email"
                                value={user?.email || ''}
                                readOnly
                                className="input w-full bg-gray-50 dark:bg-gray-700 cursor-not-allowed"
                            />
                        </div>
                        <button
                            className="btn btn-primary"
                            onClick={handleSaveProfile}
                            disabled={isSaving}
                        >
                            {isSaving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </Card>

                {/* Currency Settings */}
                <Card>
                    <h3 className="text-xl font-semibold mb-4 text-gray-darkest dark:text-gray-50">Currency Preference</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Default Currency
                            </label>
                            <select
                                value={currency}
                                onChange={(e) => handleCurrencyChange(e.target.value)}
                                className="select w-full max-w-xs"
                            >
                                {CURRENCIES.map(c => (
                                    <option key={c.code} value={c.code}>
                                        {c.symbol} {c.name} ({c.code})
                                    </option>
                                ))}
                            </select>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                                This will be used for displaying all amounts in the application
                            </p>
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

                {/* Account Statistics */}
                <Card>
                    <h3 className="text-xl font-semibold mb-4 text-gray-darkest dark:text-gray-50">Account Statistics</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                            <Icon name="ArrowLeftRight" size={24} className="mx-auto mb-2 text-primary" />
                            <p className="text-2xl font-bold text-gray-darkest dark:text-gray-50">{transactions.length}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Transactions</p>
                        </div>
                        <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                            <Icon name="Wallet" size={24} className="mx-auto mb-2 text-success" />
                            <p className="text-2xl font-bold text-gray-darkest dark:text-gray-50">{context.accounts.length}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Accounts</p>
                        </div>
                        <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                            <Icon name="Tags" size={24} className="mx-auto mb-2 text-warning" />
                            <p className="text-2xl font-bold text-gray-darkest dark:text-gray-50">{context.categories.length}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Categories</p>
                        </div>
                        <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                            <Icon name="Target" size={24} className="mx-auto mb-2 text-danger" />
                            <p className="text-2xl font-bold text-gray-darkest dark:text-gray-50">{context.budgets.length}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Budgets</p>
                        </div>
                    </div>
                </Card>
            </div>

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
        </>
    );
};
