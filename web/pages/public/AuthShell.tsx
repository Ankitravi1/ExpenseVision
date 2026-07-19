import React from 'react';
import { Icon } from '../../components/Icon';

// Two-column shell for the Login / Signup pages: a branded gradient panel on the
// left (desktop) and the form card on the right. Keeps all auth logic in the
// page components — this is purely presentational.
export const AuthShell: React.FC<{ onBack: () => void; children: React.ReactNode }> = ({ onBack, children }) => (
    <div className="min-h-screen grid lg:grid-cols-2">
        {/* Brand panel */}
        <div className="hidden lg:flex flex-col justify-between p-12 bg-gradient-to-br from-primary to-indigo-700 text-white relative overflow-hidden">
            <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-32 -left-16 w-96 h-96 bg-black/10 rounded-full blur-3xl" />
            <div className="relative flex items-center gap-2">
                <div className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center">
                    <Icon name="Wallet" size={20} className="text-white" />
                </div>
                <span className="text-xl font-bold">ExpenseVision</span>
            </div>
            <div className="relative">
                <h2 className="text-4xl font-black leading-tight mb-4">Your money, finally clear.</h2>
                <p className="text-white/80 text-lg mb-8 max-w-sm">Track, budget, and import your finances with AI — no spreadsheets, no jargon.</p>
                <ul className="space-y-3 text-white/90">
                    {['AI reads your bank statements', 'Budgets that warn you early', 'Private — self-host if you want'].map(f => (
                        <li key={f} className="flex items-center gap-3">
                            <span className="w-6 h-6 rounded-full bg-white/15 flex items-center justify-center flex-shrink-0"><Icon name="Check" size={14} /></span>
                            {f}
                        </li>
                    ))}
                </ul>
            </div>
            <p className="relative text-sm text-white/60">Free forever plan · No credit card required</p>
        </div>

        {/* Form side */}
        <div className="flex items-center justify-center p-6 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
            <div className="w-full max-w-md">
                <button onClick={onBack} className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-8 transition-colors">
                    <Icon name="ChevronLeft" size={20} />
                    Back to Home
                </button>
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 border border-gray-100 dark:border-gray-700">
                    {children}
                </div>
            </div>
        </div>
    </div>
);
