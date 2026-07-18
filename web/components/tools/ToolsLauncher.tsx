import React, { useState } from 'react';
import { Icon } from '../Icon';
import { Calculator } from './Calculator';

// A toggle-away "Tools" drawer: a floating button opens a right-side panel with
// quick utilities (calculator for now; finance calculators can be added here).
export const ToolsLauncher: React.FC = () => {
    const [open, setOpen] = useState(false);

    return (
        <>
            {/* Floating launcher button */}
            <button
                onClick={() => setOpen(o => !o)}
                data-tour="tools"
                className={`fixed bottom-5 right-5 z-40 w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-105 ${open ? 'bg-gray-700 text-white' : 'bg-primary text-white hover:bg-primary-hover'}`}
                aria-label={open ? 'Close tools' : 'Open tools'}
                title="Tools"
            >
                <Icon name={open ? 'X' : 'Wrench'} size={20} />
            </button>

            {/* Backdrop */}
            {open && <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setOpen(false)} aria-hidden="true" />}

            {/* Slide-out panel */}
            <div
                className={`fixed top-0 right-0 h-full w-80 max-w-[90vw] bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 shadow-2xl z-50 transition-transform duration-300 ease-out ${open ? 'translate-x-0' : 'translate-x-full'}`}
                role="dialog"
                aria-label="Tools"
                aria-hidden={!open}
            >
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Icon name="Wrench" size={18} className="text-primary" />
                        Tools
                    </h3>
                    <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" aria-label="Close">
                        <Icon name="X" size={18} />
                    </button>
                </div>

                <div className="p-5 overflow-y-auto h-[calc(100%-60px)]">
                    <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-gray-500 dark:text-gray-400">
                        <Icon name="Calculator" size={16} />
                        Calculator
                    </div>
                    <Calculator />
                    <p className="mt-6 text-xs text-center text-gray-300 dark:text-gray-600">More tools coming soon</p>
                </div>
            </div>
        </>
    );
};
