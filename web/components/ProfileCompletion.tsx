import React, { useMemo, useRef, useState } from 'react';
import { Icon } from './Icon';
import { authService } from '../services/auth';
import { CURRENCIES } from '../utils/currency';

interface ProfileCompletionProps {
    onComplete: () => void;
}

// A few common zones to fall back on if the browser lacks Intl.supportedValuesOf.
const FALLBACK_ZONES = [
    'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
    'Europe/London', 'Europe/Berlin', 'Asia/Kolkata', 'Asia/Dubai', 'Asia/Singapore',
    'Australia/Sydney', 'UTC',
];

const detectZone = () => {
    try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York';
    } catch {
        return 'America/New_York';
    }
};

// "America/New_York" -> "America / New York" for friendly display + search.
const zoneLabel = (tz: string) => tz.replace(/_/g, ' ').replace(/\//g, ' / ');

export const ProfileCompletion: React.FC<ProfileCompletionProps> = ({ onComplete }) => {
    const allZones = useMemo(() => {
        try {
            return typeof (Intl as any).supportedValuesOf === 'function'
                ? (Intl as any).supportedValuesOf('timeZone') as string[]
                : FALLBACK_ZONES;
        } catch {
            return FALLBACK_ZONES;
        }
    }, []);

    const initialZone = detectZone();
    const [timezone, setTimezone] = useState(initialZone);
    const [tzQuery, setTzQuery] = useState(zoneLabel(initialZone));
    const [tzOpen, setTzOpen] = useState(false);
    const [currency, setCurrency] = useState('USD'); // Default USD (primary market)
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const blurTimer = useRef<number | null>(null);

    const filteredZones = useMemo(() => {
        const q = tzQuery.toLowerCase().replace(/[\s_/]+/g, '');
        if (!q) return allZones.slice(0, 80);
        return allZones
            .filter(z => zoneLabel(z).toLowerCase().replace(/[\s_/]+/g, '').includes(q))
            .slice(0, 80);
    }, [tzQuery, allZones]);

    const selectZone = (tz: string) => {
        setTimezone(tz);
        setTzQuery(zoneLabel(tz));
        setTzOpen(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!timezone) { setError('Please choose your timezone'); return; }
        setLoading(true);
        try {
            await authService.completeProfile({ timezone, currency });
            onComplete();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to complete profile');
        } finally {
            setLoading(false);
        }
    };

    const fieldCls = 'w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none';

    return (
        <div className="w-full">
            <div className="text-center mb-8">
                <div className="flex items-center justify-center gap-2 mb-4">
                    <Icon name="UserCheck" size={40} className="text-primary" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Complete Your Profile</h2>
                <p className="text-gray-600 dark:text-gray-400">Just two quick things to get started.</p>
            </div>

            {error && (
                <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
                    <Icon name="AlertTriangle" size={20} className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Currency first — defaults to USD */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Currency</label>
                    <select value={currency} onChange={(e) => setCurrency(e.target.value)} className={fieldCls}>
                        {CURRENCIES.map(c => (
                            <option key={c.code} value={c.code}>{c.symbol} {c.name} ({c.code})</option>
                        ))}
                    </select>
                </div>

                {/* Searchable timezone (defaults to the browser-detected zone) */}
                <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Timezone</label>
                    <div className="relative">
                        <input
                            type="text"
                            value={tzQuery}
                            onChange={(e) => { setTzQuery(e.target.value); setTzOpen(true); }}
                            onFocus={() => { setTzOpen(true); if (blurTimer.current) window.clearTimeout(blurTimer.current); }}
                            onBlur={() => {
                                // Delay so a click on an option registers first; then
                                // snap the text back to the currently selected zone.
                                blurTimer.current = window.setTimeout(() => { setTzOpen(false); setTzQuery(zoneLabel(timezone)); }, 150);
                            }}
                            placeholder="Type a city, e.g. New York, London, Kolkata"
                            className={`${fieldCls} pr-10`}
                            autoComplete="off"
                            aria-label="Timezone"
                        />
                        <Icon name="Search" size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                    {tzOpen && (
                        <div className="absolute z-20 mt-1 w-full max-h-60 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-xl">
                            {filteredZones.length === 0 ? (
                                <p className="px-4 py-3 text-sm text-gray-400">No matching timezone</p>
                            ) : filteredZones.map(z => (
                                <button
                                    type="button"
                                    key={z}
                                    onMouseDown={(e) => { e.preventDefault(); selectZone(z); }}
                                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${z === timezone ? 'text-primary font-semibold' : 'text-gray-700 dark:text-gray-200'}`}
                                >
                                    {zoneLabel(z)}
                                </button>
                            ))}
                        </div>
                    )}
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">Used for your transaction dates and scheduled payments. We picked your device's timezone — change it if needed.</p>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full btn btn-primary py-3 text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? (
                        <span className="flex items-center justify-center gap-2"><Icon name="Loader" size={20} className="animate-spin" /> Saving...</span>
                    ) : 'Complete Setup'}
                </button>
            </form>
        </div>
    );
};
