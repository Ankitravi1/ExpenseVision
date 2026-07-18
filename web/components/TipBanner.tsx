import React, { useMemo, useState } from 'react';
import { Icon } from './Icon';
import { useTour } from '../context/TourContext';

// Rotating "did you know" hints shown at the top of the Dashboard. Plain,
// non-jargon wording aimed at first-time / non-finance users. The banner can be
// dismissed for the session and switched off permanently in Settings.
const TIPS: string[] = [
    'Tip: Tap “New Transaction” (top right) to log an expense or income in seconds.',
    'Tip: The balance card turns red when you spend more than you earn in a month.',
    'Tip: Import a bank statement (PDF, Excel, or CSV) from Import / Export — no manual typing.',
    'Tip: Set monthly limits on the Budgets page and get alerted before you overspend.',
    'Tip: Use Recurring for rent, salary, or subscriptions so they’re logged automatically.',
    'Tip: The Reports page shows exactly which categories eat up most of your money.',
    'Tip: Switch between months on the Dashboard using the arrows next to the month name.',
];

const SESSION_DISMISS_KEY = 'ev_tip_dismissed';

export const TipBanner: React.FC = () => {
    const { tipsEnabled, startTour } = useTour();
    const [dismissed, setDismissed] = useState(() => sessionStorage.getItem(SESSION_DISMISS_KEY) === '1');

    // Rotate the tip by day so a returning user sees something new, but it stays
    // stable within a single day/session.
    const tip = useMemo(() => {
        const dayIndex = Math.floor(Date.now() / 86400000);
        return TIPS[dayIndex % TIPS.length];
    }, []);

    if (!tipsEnabled || dismissed) return null;

    const handleDismiss = () => {
        sessionStorage.setItem(SESSION_DISMISS_KEY, '1');
        setDismissed(true);
    };

    return (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 dark:border-amber-800/40 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/10 px-4 py-3 shadow-sm">
            <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
                <Icon name="Lightbulb" size={18} />
            </div>
            <p className="flex-1 text-sm text-amber-900 dark:text-amber-200 leading-relaxed pt-1">{tip}</p>
            <div className="flex items-center gap-1 flex-shrink-0">
                <button
                    onClick={startTour}
                    className="hidden sm:inline-flex text-xs font-bold text-amber-700 dark:text-amber-300 hover:underline px-2 py-1"
                >
                    Take the tour
                </button>
                <button
                    onClick={handleDismiss}
                    className="p-1.5 rounded-lg text-amber-500 hover:text-amber-700 dark:hover:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
                    aria-label="Dismiss tip"
                >
                    <Icon name="X" size={16} />
                </button>
            </div>
        </div>
    );
};
