import React, { useState } from 'react';
import { Icon } from './Icon';
import { authService } from '../services/auth';
import { CURRENCIES } from '../utils/currency';

interface ProfileCompletionProps {
    onComplete: () => void;
}

export const ProfileCompletion: React.FC<ProfileCompletionProps> = ({ onComplete }) => {
    const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
    const [currency, setCurrency] = useState('INR');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!timezone) {
            setError('Timezone is required');
            return;
        }

        setLoading(true);

        try {
            // Use generic completeProfile for all users
            await authService.completeProfile({
                timezone,
                currency,
            });
            onComplete();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to complete profile');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full">
            <div className="text-center mb-8">
                <div className="flex items-center justify-center gap-2 mb-4">
                    <Icon name="UserCheck" size={40} className="text-primary" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Complete Your Profile</h2>
                <p className="text-gray-600 dark:text-gray-400">
                    Please provide a few more details to get started.
                </p>
            </div>

            {error && (
                <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
                    <Icon name="AlertTriangle" size={20} className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Timezone *
                    </label>
                    <select
                        value={timezone}
                        onChange={(e) => setTimezone(e.target.value)}
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    >
                        {Intl.supportedValuesOf('timeZone').map(tz => (
                            <option key={tz} value={tz}>{tz}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Currency
                    </label>
                    <select
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    >
                        {CURRENCIES.map(c => (
                            <option key={c.code} value={c.code}>
                                {c.symbol} {c.name} ({c.code})
                            </option>
                        ))}
                    </select>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full btn btn-primary py-3 text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? (
                        <span className="flex items-center justify-center gap-2">
                            <Icon name="Loader" size={20} className="animate-spin" />
                            Saving...
                        </span>
                    ) : (
                        'Complete Setup'
                    )}
                </button>
            </form>
        </div>
    );
};
