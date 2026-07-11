import React, { useState, useContext, useEffect, useMemo } from 'react';
import { Card } from '../components/Card';
import { Icon } from '../components/Icon';
import { AppContext } from '../App';
import { authService, User } from '../services/auth';
import { useToast } from '../context/ToastContext';
import { CURRENCIES } from '../utils/currency';

export const Profile: React.FC = () => {
    const context = useContext(AppContext);
    const { showToast } = useToast();
    const [currency, setCurrency] = useState('INR');
    const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
    const [user, setUser] = useState<User | null>(null);
    const [name, setName] = useState('');
    const [isSaving, setIsSaving] = useState(false);

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
            // Refresh App-level user state (name/timezone) and global currency so
            // changes reflect immediately without a page reload.
            context?.updateUser(updatedUser.user);
            context?.setCurrency(currency);
            showToast('Profile updated successfully!', 'success');
        } catch (error) {
            console.error('Failed to update profile:', error);
            showToast('Failed to update profile', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    // Helper to get timezone offset and format
    const getTimezoneOption = (tz: string) => {
        try {
            const date = new Date();
            // Get offset string like "GMT+5:30" or "GMT-05:00"
            const str = date.toLocaleString('en-US', { timeZone: tz, timeZoneName: 'longOffset' });
            const offsetPart = str.split('GMT')[1] || '+00:00';

            // Format to (GMT +HH:MM)
            // offsetPart is like "+5:30" or "-5:00"
            // We want "+05:30"
            let [sign, ...rest] = offsetPart;
            let [hours, minutes] = rest.join('').split(':');
            if (!minutes) minutes = '00';
            hours = hours.padStart(2, '0');

            const formattedOffset = `(GMT ${sign}${hours}:${minutes})`;
            return { value: tz, label: `${formattedOffset} ${tz}`, offset: parseInt(hours) * 60 + parseInt(minutes) * (sign === '+' ? 1 : -1) };
        } catch (e) {
            return { value: tz, label: tz, offset: 0 };
        }
    };

    const timezoneOptions = useMemo(() => {
        return Intl.supportedValuesOf('timeZone')
            .map(tz => getTimezoneOption(tz))
            .sort((a, b) => a.offset - b.offset);
    }, []);

    // All hooks are declared above; safe to bail out now.
    if (!context) return null;
    const { transactions } = context;

    return (
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
                            className="input w-full font-mono text-sm"
                        >
                            {timezoneOptions.map(opt => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Your transactions will be recorded in this timezone.
                        </p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Default Currency
                        </label>
                        <select
                            value={currency}
                            onChange={(e) => setCurrency(e.target.value)}
                            className="select w-full"
                        >
                            {CURRENCIES.map(c => (
                                <option key={c.code} value={c.code}>
                                    {c.symbol} {c.name} ({c.code})
                                </option>
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
                        className="btn btn-primary w-full sm:w-auto"
                        onClick={handleSaveProfile}
                        disabled={isSaving}
                    >
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
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
    );
};
