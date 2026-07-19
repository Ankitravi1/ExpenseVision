import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { PublicShell } from './public/PublicShell';

interface LandingPageProps {
    onLoginClick: () => void;
    onSignupClick: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onLoginClick, onSignupClick }) => {
    const location = useLocation();
    const navigate = useNavigate();

    // Scroll to #features / #pricing when linked from the nav/footer.
    useEffect(() => {
        if (location.hash) {
            const el = document.querySelector(location.hash);
            if (el) el.scrollIntoView({ behavior: 'smooth' });
        }
    }, [location.hash]);

    const goSignup = onSignupClick || (() => navigate('/signup'));

    return (
        <PublicShell>
            {/* Hero */}
            <section className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-indigo-50 via-white to-white dark:from-gray-900 dark:via-gray-950 dark:to-gray-950" />
                <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
                <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-indigo-400/10 rounded-full blur-3xl" />
                <div className="relative max-w-4xl mx-auto px-6 pt-20 pb-16 text-center">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-primary/10 text-primary mb-6">
                        <Icon name="Sparkles" size={13} /> Now with AI bank-statement import
                    </span>
                    <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-[1.05] mb-6">
                        Your money, finally<br />
                        <span className="bg-gradient-to-r from-primary to-indigo-500 bg-clip-text text-transparent">clear.</span>
                    </h1>
                    <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto mb-10">
                        Track spending, set budgets, and import your bank statements with AI — no spreadsheets, no jargon. Use it hosted, or self-host and own your data.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <button onClick={goSignup} className="btn btn-primary text-base py-3 px-7 flex items-center justify-center gap-2">
                            <Icon name="Sparkles" size={18} /> Get started free
                        </button>
                        <button onClick={onLoginClick} className="btn btn-secondary text-base py-3 px-7">Sign in</button>
                    </div>
                    <p className="text-xs text-gray-400 mt-4">Free forever plan · No credit card required</p>
                </div>
            </section>

            {/* Trust bar */}
            <section className="border-y border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30">
                <div className="max-w-5xl mx-auto px-6 py-6 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                    {[
                        { icon: 'Sparkles', label: 'AI import' },
                        { icon: 'Lock', label: 'Encrypted & private' },
                        { icon: 'Smartphone', label: 'Web + mobile' },
                        { icon: 'CircleDollarSign', label: 'Any currency' },
                    ].map(t => (
                        <div key={t.label} className="flex items-center justify-center gap-2 text-sm font-semibold text-gray-500 dark:text-gray-400">
                            <Icon name={t.icon} size={16} className="text-primary" /> {t.label}
                        </div>
                    ))}
                </div>
            </section>

            {/* Features */}
            <section id="features" className="max-w-6xl mx-auto px-6 py-20 scroll-mt-20">
                <div className="text-center max-w-2xl mx-auto mb-14">
                    <h2 className="text-3xl sm:text-4xl font-black tracking-tight mb-3">Everything you need to stay on top of your money</h2>
                    <p className="text-gray-600 dark:text-gray-400">Powerful when you want it, dead-simple when you don't.</p>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    <Feature icon="Sparkles" title="AI statement import" desc="Upload a PDF, Excel, CSV, or a photo of a receipt — AI reads it and files every transaction for you." />
                    <Feature icon="Target" title="Budgets that warn you" desc="Set monthly limits per category and get alerted before you overspend, not after." />
                    <Feature icon="PieChart" title="Reports you'll understand" desc="See exactly where your money goes, in plain language and clean charts." />
                    <Feature icon="ArrowLeftRight" title="Accounts & transfers" desc="Track every account and card in one place, and move money between them cleanly." />
                    <Feature icon="RefreshCw" title="Recurring on autopilot" desc="Rent, salary, subscriptions and loans get logged automatically, every cycle." />
                    <Feature icon="Lock" title="Private by design" desc="Your data is encrypted at rest. Prefer full control? Self-host and connect your own database." />
                </div>
            </section>

            {/* How it works */}
            <section className="bg-gray-50 dark:bg-gray-900/40 border-y border-gray-100 dark:border-gray-800">
                <div className="max-w-5xl mx-auto px-6 py-20">
                    <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-center mb-14">Up and running in minutes</h2>
                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            { n: 1, title: 'Create your account', desc: 'Sign up free, pick your currency, and you\'re in — a quick tour shows you around.' },
                            { n: 2, title: 'Add or import money', desc: 'Type a transaction in plain English, or import a whole bank statement with AI.' },
                            { n: 3, title: 'See the full picture', desc: 'Budgets, reports, and balances update instantly so you always know where you stand.' },
                        ].map(s => (
                            <div key={s.n} className="text-center">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-indigo-600 text-white font-black flex items-center justify-center mx-auto mb-4 text-lg">{s.n}</div>
                                <h3 className="font-bold text-lg mb-2">{s.title}</h3>
                                <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">{s.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Pricing */}
            <section id="pricing" className="max-w-6xl mx-auto px-6 py-20 scroll-mt-20">
                <div className="text-center max-w-2xl mx-auto mb-14">
                    <h2 className="text-3xl sm:text-4xl font-black tracking-tight mb-3">Simple, honest pricing</h2>
                    <p className="text-gray-600 dark:text-gray-400">Start free. Upgrade only when you want the AI power features.</p>
                </div>
                <div className="grid md:grid-cols-3 gap-6 items-stretch">
                    <PriceCard
                        name="Free" price="$0" period="forever"
                        desc="A genuinely useful tracker."
                        features={['Unlimited manual transactions', 'Budgets & reports', 'CSV / Excel import & export', 'Recurring transactions', 'Light & dark themes']}
                        cta="Get started" onClick={goSignup}
                    />
                    <PriceCard
                        name="Pro" price="$4.99" period="/ month" highlight
                        desc="For people who want the AI magic."
                        features={['Everything in Free', 'AI statement import', 'More AI quick-entry per day', 'Paper theme', 'Bring your own AI key', 'Priority support']}
                        cta="Start Pro" onClick={goSignup}
                    />
                    <PriceCard
                        name="Self-host" price="One-time" period=""
                        desc="Own your data, run it yourself."
                        features={['Everything in Pro', 'Run on your own server', 'Connect your own database', 'Nothing leaves your machine']}
                        cta="Coming soon" disabled
                    />
                </div>
                <p className="text-center text-xs text-gray-400 mt-6">Prices shown in USD. Taxes handled at checkout. Cancel anytime.</p>
            </section>

            {/* Testimonials — PLACEHOLDER: replace with real quotes before launch */}
            <section className="bg-gray-50 dark:bg-gray-900/40 border-y border-gray-100 dark:border-gray-800">
                <div className="max-w-6xl mx-auto px-6 py-20">
                    <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-center mb-14">People are ditching their spreadsheets</h2>
                    <div className="grid md:grid-cols-3 gap-6">
                        <Quote text="The AI import is the feature I didn't know I needed. I dropped in three months of statements and it just… sorted everything." author="Early user" role="Freelancer" />
                        <Quote text="Finally a finance app that doesn't drown me in accountant words. My partner actually uses it too." author="Early user" role="Everyday budgeter" />
                        <Quote text="I self-host everything, so an app where I can keep my own data was an instant yes." author="Early user" role="Self-hoster" />
                    </div>
                    <p className="text-center text-xs text-gray-400 mt-6">Illustrative feedback — real customer stories coming as we launch.</p>
                </div>
            </section>

            {/* FAQ */}
            <section className="max-w-3xl mx-auto px-6 py-20">
                <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-center mb-12">Questions, answered</h2>
                <div className="space-y-4">
                    <Faq q="Is it really free?" a="Yes — the core tracker (transactions, budgets, reports, CSV/Excel import & export) is free forever. Pro unlocks the AI features and extras." />
                    <Faq q="How does AI import work?" a="Upload a PDF, Excel, CSV, or a photo of a receipt. Our AI reads it, maps the columns, and lets you review before anything is saved." />
                    <Faq q="Is my financial data safe?" a="Your data is encrypted at rest and never sold. If you want total control, the self-host option lets you run everything on your own infrastructure." />
                    <Faq q="Do I need to enter my currency and bank?" a="You pick your currency during a quick setup. There's no bank linking required — you import statements yourself, so you're always in control." />
                    <Faq q="Can I use my own AI key?" a="Absolutely. Add your own provider key in Settings and your AI usage is unlimited and billed to you, not us." />
                </div>
            </section>

            {/* Final CTA */}
            <section className="max-w-5xl mx-auto px-6 pb-24">
                <div className="rounded-3xl bg-gradient-to-br from-primary to-indigo-600 px-8 py-16 text-center text-white relative overflow-hidden">
                    <div className="absolute -top-16 -right-16 w-64 h-64 bg-white/10 rounded-full blur-2xl" />
                    <h2 className="text-3xl sm:text-4xl font-black mb-3 relative">Take control of your money today</h2>
                    <p className="text-white/80 max-w-xl mx-auto mb-8 relative">Free to start. No credit card. Your future self will thank you.</p>
                    <button onClick={goSignup} className="relative bg-white text-primary font-bold py-3 px-8 rounded-xl hover:bg-white/90 transition-colors">Create your free account</button>
                </div>
            </section>
        </PublicShell>
    );
};

const Feature: React.FC<{ icon: string; title: string; desc: string }> = ({ icon, title, desc }) => (
    <div className="p-6 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 hover:shadow-lg hover:-translate-y-0.5 transition-all">
        <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
            <Icon name={icon} size={22} />
        </div>
        <h3 className="font-bold text-lg mb-1.5">{title}</h3>
        <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">{desc}</p>
    </div>
);

const PriceCard: React.FC<{ name: string; price: string; period: string; desc: string; features: string[]; cta: string; onClick?: () => void; highlight?: boolean; disabled?: boolean }> = ({ name, price, period, desc, features, cta, onClick, highlight, disabled }) => (
    <div className={`flex flex-col p-7 rounded-2xl border ${highlight ? 'border-primary shadow-xl shadow-primary/10 ring-1 ring-primary relative' : 'border-gray-200 dark:border-gray-800'} bg-white dark:bg-gray-900`}>
        {highlight && <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[11px] font-bold uppercase tracking-wider bg-primary text-white px-3 py-1 rounded-full">Most popular</span>}
        <h3 className="font-bold text-lg">{name}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{desc}</p>
        <div className="mb-5"><span className="text-3xl font-black">{price}</span> <span className="text-sm text-gray-400">{period}</span></div>
        <ul className="space-y-2.5 mb-7 flex-1">
            {features.map(f => (
                <li key={f} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <Icon name="Check" size={16} className="text-emerald-500 flex-shrink-0 mt-0.5" /> {f}
                </li>
            ))}
        </ul>
        <button onClick={onClick} disabled={disabled} className={`w-full py-2.5 rounded-xl font-bold text-sm transition-colors ${disabled ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed' : highlight ? 'btn btn-primary' : 'border-2 border-gray-200 dark:border-gray-700 hover:border-primary hover:text-primary'}`}>{cta}</button>
    </div>
);

const Quote: React.FC<{ text: string; author: string; role: string }> = ({ text, author, role }) => (
    <div className="p-6 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="flex gap-0.5 mb-3 text-amber-400">{[0, 1, 2, 3, 4].map(i => <Icon key={i} name="Star" size={15} className="fill-current" />)}</div>
        <p className="text-gray-700 dark:text-gray-200 leading-relaxed mb-4">“{text}”</p>
        <p className="text-sm font-semibold">{author}</p>
        <p className="text-xs text-gray-400">{role}</p>
    </div>
);

const Faq: React.FC<{ q: string; a: string }> = ({ q, a }) => {
    const [open, setOpen] = React.useState(false);
    return (
        <div className="border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
            <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left font-semibold hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
                {q}
                <Icon name={open ? 'ChevronUp' : 'ChevronDown'} size={18} className="text-gray-400 flex-shrink-0" />
            </button>
            {open && <p className="px-5 pb-4 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{a}</p>}
        </div>
    );
};
