import React, { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Page } from '../types';
import { Icon } from '../components/Icon';

// ---------------------------------------------------------------------------
// Guided onboarding tour + tips opt-out, all self-contained (no extra deps).
//
// - The tour runs automatically on a user's first visit and can be replayed
//   from Settings. Each step optionally navigates to a page and spotlights an
//   element tagged with `data-tour="<id>"`.
// - Tips are a separate, lighter feature: a rotating hint banner (see
//   TipBanner) that the user can switch off globally. Both preferences live in
//   localStorage so they persist per browser without a backend change.
// ---------------------------------------------------------------------------

const TOUR_DONE_KEY = 'ev_tour_completed';
const TIPS_ENABLED_KEY = 'ev_tips_enabled';

interface TourStep {
    /** Navigate here before showing the step (optional). */
    page?: Page;
    /** CSS selector to spotlight. Omit for a centered welcome/finish card. */
    target?: string;
    title: string;
    body: string;
}

const STEPS: TourStep[] = [
    {
        page: 'Dashboard',
        title: 'Welcome to ExpenseVision! 👋',
        body: "Let's take a quick 30-second tour so you know your way around. You can skip anytime.",
    },
    {
        page: 'Dashboard',
        target: '[data-tour="stat-cards"]',
        title: 'Your month at a glance',
        body: 'These three cards show what you spent, what you earned, and your balance (earned minus spent) for the month. If the balance turns red, you spent more than you earned.',
    },
    {
        page: 'Dashboard',
        target: '[data-tour="month-nav"]',
        title: 'Switch months here',
        body: 'Use the arrows to look at previous months. The date range on the right tells you exactly which days are included.',
    },
    {
        page: 'Dashboard',
        target: '[data-tour="new-transaction"]',
        title: 'Add money in or out',
        body: 'Tap here anytime to record a new expense, income, or transfer between your accounts.',
    },
    {
        page: 'Dashboard',
        target: '[data-tour="nav-ImportExport"]',
        title: 'Import your statements',
        body: "Already have transactions in a bank statement or spreadsheet? Import them here — or download a template to fill in yourself.",
    },
    {
        page: 'Dashboard',
        target: '[data-tour="nav-Reports"]',
        title: 'See where your money goes',
        body: 'Reports break your spending down by category so you can spot where to cut back.',
    },
    {
        page: 'Settings',
        target: '[data-tour="ai-settings"]',
        title: 'Smart features with AI (optional)',
        body: 'Add your own AI provider key here to unlock two things: reading bank statements automatically (PDF, Excel, CSV, or a photo of a receipt), and typing entries in plain English like "coffee 200". Everything else works without it — this just saves you typing.',
    },
    {
        title: "You're all set! 🎉",
        body: 'Start by adding a transaction or importing a statement. You can replay this tour anytime from Settings → Help & Tips.',
    },
];

interface TourContextValue {
    startTour: () => void;
    tipsEnabled: boolean;
    setTipsEnabled: (enabled: boolean) => void;
}

const TourContext = createContext<TourContextValue | null>(null);

export const useTour = () => {
    const ctx = useContext(TourContext);
    if (!ctx) throw new Error('useTour must be used within a TourProvider');
    return ctx;
};

interface Rect { top: number; left: number; width: number; height: number; }

interface TourProviderProps {
    /** Navigate to a page (from the host app router). */
    navigateToPage: (page: Page) => void;
    children: React.ReactNode;
}

export const TourProvider: React.FC<TourProviderProps> = ({ navigateToPage, children }) => {
    const [active, setActive] = useState(false);
    const [stepIndex, setStepIndex] = useState(0);
    const [rect, setRect] = useState<Rect | null>(null);
    const [tipsEnabled, setTipsEnabledState] = useState(() => localStorage.getItem(TIPS_ENABLED_KEY) !== '0');

    const step = STEPS[stepIndex];

    const startTour = useCallback(() => {
        setStepIndex(0);
        setRect(null);
        setActive(true);
    }, []);

    const finishTour = useCallback(() => {
        setActive(false);
        setRect(null);
        localStorage.setItem(TOUR_DONE_KEY, '1');
    }, []);

    const setTipsEnabled = useCallback((enabled: boolean) => {
        setTipsEnabledState(enabled);
        localStorage.setItem(TIPS_ENABLED_KEY, enabled ? '1' : '0');
    }, []);

    // Auto-start on first ever visit, once, after the first paint so the
    // dashboard has mounted and its targets exist.
    useEffect(() => {
        if (localStorage.getItem(TOUR_DONE_KEY) === '1') return;
        const t = setTimeout(() => setActive(true), 900);
        return () => clearTimeout(t);
    }, []);

    // When entering a step, move to its page first (if requested).
    useEffect(() => {
        if (!active) return;
        if (step?.page) navigateToPage(step.page);
    }, [active, stepIndex, step?.page, navigateToPage]);

    // Measure (and keep re-measuring) the spotlighted element. The target may
    // not exist immediately after a page navigation, so retry for a bit.
    useLayoutEffect(() => {
        if (!active) return;
        if (!step?.target) { setRect(null); return; }

        let raf = 0;
        let attempts = 0;
        const measure = () => {
            const el = document.querySelector(step.target!) as HTMLElement | null;
            if (el) {
                el.scrollIntoView({ block: 'center', behavior: 'smooth' });
                const r = el.getBoundingClientRect();
                setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
                return;
            }
            if (attempts++ < 40) raf = requestAnimationFrame(measure);
            else setRect(null); // give up -> falls back to a centered card
        };
        measure();
        return () => cancelAnimationFrame(raf);
    }, [active, stepIndex, step?.target]);

    // Keep the spotlight aligned while the user scrolls or resizes.
    useEffect(() => {
        if (!active || !step?.target) return;
        const update = () => {
            const el = document.querySelector(step.target!) as HTMLElement | null;
            if (!el) return;
            const r = el.getBoundingClientRect();
            setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
        };
        window.addEventListener('resize', update);
        window.addEventListener('scroll', update, true);
        return () => {
            window.removeEventListener('resize', update);
            window.removeEventListener('scroll', update, true);
        };
    }, [active, stepIndex, step?.target]);

    const isLast = stepIndex === STEPS.length - 1;
    const goNext = () => (isLast ? finishTour() : setStepIndex(i => i + 1));
    const goPrev = () => setStepIndex(i => Math.max(0, i - 1));

    return (
        <TourContext.Provider value={{ startTour, tipsEnabled, setTipsEnabled }}>
            {children}
            {active && (
                <TourOverlay
                    step={step}
                    rect={rect}
                    stepIndex={stepIndex}
                    total={STEPS.length}
                    onNext={goNext}
                    onPrev={goPrev}
                    onSkip={finishTour}
                />
            )}
        </TourContext.Provider>
    );
};

// ---- Overlay ---------------------------------------------------------------

const PAD = 8; // breathing room around the spotlighted element

const TourOverlay: React.FC<{
    step: TourStep;
    rect: Rect | null;
    stepIndex: number;
    total: number;
    onNext: () => void;
    onPrev: () => void;
    onSkip: () => void;
}> = ({ step, rect, stepIndex, total, onNext, onPrev, onSkip }) => {
    const cardRef = useRef<HTMLDivElement>(null);
    const [cardSize, setCardSize] = useState({ w: 340, h: 200 });

    useLayoutEffect(() => {
        if (cardRef.current) {
            setCardSize({ w: cardRef.current.offsetWidth, h: cardRef.current.offsetHeight });
        }
    }, [stepIndex, rect]);

    const isCentered = !rect;

    // Position the tooltip card relative to the spotlight, clamped to viewport.
    let cardStyle: React.CSSProperties;
    if (isCentered) {
        cardStyle = { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
    } else {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const spotTop = rect!.top - PAD;
        const spotBottom = rect!.top + rect!.height + PAD;
        const roomBelow = vh - spotBottom;
        const placeBelow = roomBelow > cardSize.h + 16 || roomBelow > rect!.top;

        let top = placeBelow ? spotBottom + 12 : spotTop - cardSize.h - 12;
        top = Math.max(12, Math.min(top, vh - cardSize.h - 12));

        let left = rect!.left + rect!.width / 2 - cardSize.w / 2;
        left = Math.max(12, Math.min(left, vw - cardSize.w - 12));

        cardStyle = { top, left };
    }

    return (
        <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-label="Product tour">
            {/* Dimmer + spotlight cutout via a big transparent-hole box-shadow. */}
            {isCentered ? (
                <div className="absolute inset-0 bg-black/60" onClick={onSkip} />
            ) : (
                <div
                    className="absolute rounded-xl transition-all duration-300 ease-out pointer-events-none ring-2 ring-primary"
                    style={{
                        top: rect!.top - PAD,
                        left: rect!.left - PAD,
                        width: rect!.width + PAD * 2,
                        height: rect!.height + PAD * 2,
                        boxShadow: '0 0 0 9999px rgba(0,0,0,0.6)',
                    }}
                />
            )}

            {/* Tooltip card */}
            <div
                ref={cardRef}
                className="absolute w-[340px] max-w-[calc(100vw-24px)] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-5 animate-[fadeIn_0.2s_ease-out]"
                style={cardStyle}
            >
                <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
                            <Icon name="GraduationCap" size={18} />
                        </div>
                        <h4 className="font-bold text-gray-900 dark:text-white text-base leading-tight">{step.title}</h4>
                    </div>
                    <button
                        onClick={onSkip}
                        className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex-shrink-0"
                        aria-label="Close tour"
                    >
                        <Icon name="X" size={16} />
                    </button>
                </div>

                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-4">{step.body}</p>

                <div className="flex items-center justify-between">
                    {/* Step dots */}
                    <div className="flex items-center gap-1.5">
                        {Array.from({ length: total }).map((_, i) => (
                            <span
                                key={i}
                                className={`h-1.5 rounded-full transition-all ${i === stepIndex ? 'w-4 bg-primary' : 'w-1.5 bg-gray-300 dark:bg-gray-600'}`}
                            />
                        ))}
                    </div>

                    <div className="flex items-center gap-2">
                        {stepIndex > 0 && (
                            <button
                                onClick={onPrev}
                                className="px-3 py-1.5 rounded-lg text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            >
                                Back
                            </button>
                        )}
                        {stepIndex < total - 1 ? (
                            <>
                                <button
                                    onClick={onSkip}
                                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                                >
                                    Skip
                                </button>
                                <button
                                    onClick={onNext}
                                    className="btn btn-primary text-xs font-bold py-1.5 px-4 flex items-center gap-1"
                                >
                                    Next
                                    <Icon name="ChevronRight" size={14} />
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={onNext}
                                className="btn btn-primary text-xs font-bold py-1.5 px-4 flex items-center gap-1"
                            >
                                <Icon name="Check" size={14} />
                                Got it
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
