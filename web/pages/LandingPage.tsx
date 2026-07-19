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
            {/* ── Hero ─────────────────────────────────────────────────────── */}
            <section className="relative overflow-hidden bg-[#faf9f6] dark:bg-gray-950">
                {/* Warm ambient glows */}
                <div className="absolute -top-32 -right-24 w-[30rem] h-[30rem] bg-primary/15 rounded-full blur-3xl" />
                <div className="absolute top-40 -left-24 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
                {/* Subtle grid texture */}
                <div className="absolute inset-0 opacity-[0.4] dark:opacity-[0.15] [background-image:linear-gradient(to_right,rgba(14,124,102,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(14,124,102,0.06)_1px,transparent_1px)] [background-size:44px_44px] [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />

                <div className="relative max-w-6xl mx-auto px-6 pt-16 pb-20 lg:pt-24 lg:pb-28 grid lg:grid-cols-2 gap-14 items-center">
                    {/* Copy */}
                    <div className="text-center lg:text-left">
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-white dark:bg-gray-900 border border-primary/20 text-primary shadow-sm mb-6">
                            <Icon name="Sparkles" size={13} className="text-accent" /> Now with AI bank-statement import
                        </span>
                        <h1 className="text-[2.6rem] sm:text-6xl font-black tracking-tight leading-[1.03] mb-6 text-gray-900 dark:text-white">
                            Your money,<br className="hidden sm:block" /> finally{' '}
                            <span className="relative whitespace-nowrap text-primary">
                                clear.
                                <svg className="absolute -bottom-2 left-0 w-full" height="10" viewBox="0 0 200 10" fill="none" preserveAspectRatio="none">
                                    <path d="M2 7C50 2 150 2 198 6" stroke="#E0A82E" strokeWidth="3.5" strokeLinecap="round" />
                                </svg>
                            </span>
                        </h1>
                        <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-300 max-w-xl mx-auto lg:mx-0 mb-9 leading-relaxed">
                            Track spending, set budgets, and import your bank statements with AI — no spreadsheets, no jargon. Use it hosted, or self-host and own your data.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
                            <button onClick={goSignup} className="btn btn-primary text-base py-3 px-7 flex items-center justify-center gap-2">
                                Get started free <Icon name="ArrowRight" size={18} />
                            </button>
                            <button onClick={onLoginClick} className="btn btn-secondary text-base py-3 px-7">Sign in</button>
                        </div>
                        <div className="flex items-center gap-5 justify-center lg:justify-start mt-6 text-xs text-gray-500 dark:text-gray-400">
                            <span className="flex items-center gap-1.5"><Icon name="Check" size={14} className="text-primary" /> Free forever plan</span>
                            <span className="flex items-center gap-1.5"><Icon name="Check" size={14} className="text-primary" /> No credit card</span>
                        </div>
                    </div>

                    {/* Product preview */}
                    <HeroPreview />
                </div>
            </section>

            {/* ── Trust bar ────────────────────────────────────────────────── */}
            <section className="border-y border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950">
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

            {/* ── Features (bento) ─────────────────────────────────────────── */}
            <section id="features" className="max-w-6xl mx-auto px-6 py-20 lg:py-24 scroll-mt-20">
                <div className="text-center max-w-2xl mx-auto mb-14">
                    <span className="text-xs font-bold uppercase tracking-widest text-primary">Features</span>
                    <h2 className="text-3xl sm:text-4xl font-black tracking-tight mt-2 mb-3">Everything to stay on top of your money</h2>
                    <p className="text-gray-600 dark:text-gray-400">Powerful when you want it, dead-simple when you don't.</p>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-6 gap-5 auto-rows-fr">
                    {/* Wide hero feature */}
                    <BentoCard className="lg:col-span-4" icon="Sparkles" title="AI statement import" accent
                        desc="Upload a PDF, Excel, CSV, or a photo of a receipt — AI reads it and files every transaction, mapped and categorized, ready for you to review before anything saves." />
                    <BentoCard className="lg:col-span-2" icon="Target" title="Budgets that warn you"
                        desc="Set monthly limits per category and get alerted before you overspend — not after." />
                    <BentoCard className="lg:col-span-2" icon="PieChart" title="Reports you'll understand"
                        desc="See exactly where your money goes, in plain language and clean charts." />
                    <BentoCard className="lg:col-span-2" icon="RefreshCw" title="Recurring on autopilot"
                        desc="Rent, salary, subscriptions and loans log themselves, every cycle." />
                    <BentoCard className="lg:col-span-2" icon="Lock" title="Private by design"
                        desc="Encrypted at rest. Prefer full control? Self-host and use your own database." />
                </div>
            </section>

            {/* ── AI import showcase band ──────────────────────────────────── */}
            <section className="relative overflow-hidden bg-gray-900 dark:bg-black text-white">
                <div className="absolute -top-24 right-10 w-96 h-96 bg-primary/25 rounded-full blur-3xl" />
                <div className="absolute bottom-0 -left-10 w-80 h-80 bg-accent/10 rounded-full blur-3xl" />
                <div className="relative max-w-6xl mx-auto px-6 py-20 lg:py-24 grid lg:grid-cols-2 gap-14 items-center">
                    <div>
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-white/10 text-white mb-5">
                            <Icon name="Zap" size={13} className="text-accent" /> The part everyone hates, gone
                        </span>
                        <h2 className="text-3xl sm:text-4xl font-black tracking-tight mb-4">Drop a statement.<br />Get a clean ledger.</h2>
                        <p className="text-white/70 text-lg leading-relaxed mb-8 max-w-md">
                            No column-mapping wizards, no manual typing. Our AI reads the messy bank export and hands back tidy, categorized transactions — you just confirm.
                        </p>
                        <ul className="space-y-3">
                            {['Works with any bank’s PDF, CSV or Excel', 'Auto-detects dates, amounts & categories', 'Duplicate detection before import', 'Bring your own AI key for unlimited use'].map(f => (
                                <li key={f} className="flex items-center gap-3 text-white/90">
                                    <span className="w-6 h-6 rounded-full bg-primary/25 text-primary-light flex items-center justify-center flex-shrink-0"><Icon name="Check" size={14} /></span>
                                    {f}
                                </li>
                            ))}
                        </ul>
                    </div>
                    <ImportShowcase />
                </div>
            </section>

            {/* ── How it works ─────────────────────────────────────────────── */}
            <section className="bg-[#faf9f6] dark:bg-gray-950 border-b border-gray-100 dark:border-gray-800">
                <div className="max-w-5xl mx-auto px-6 py-20 lg:py-24">
                    <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-center mb-14">Up and running in minutes</h2>
                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            { n: 1, icon: 'User', title: 'Create your account', desc: 'Sign up free, pick your currency, and you’re in — a quick tour shows you around.' },
                            { n: 2, icon: 'Upload', title: 'Add or import money', desc: 'Type a transaction in plain English, or import a whole bank statement with AI.' },
                            { n: 3, icon: 'TrendingUp', title: 'See the full picture', desc: 'Budgets, reports, and balances update instantly so you always know where you stand.' },
                        ].map(s => (
                            <div key={s.n} className="relative text-center bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-7">
                                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-[11px] font-black text-white bg-accent w-7 h-7 rounded-full flex items-center justify-center shadow">{s.n}</div>
                                <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4 mt-2">
                                    <Icon name={s.icon} size={24} />
                                </div>
                                <h3 className="font-bold text-lg mb-2">{s.title}</h3>
                                <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">{s.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Pricing ──────────────────────────────────────────────────── */}
            <section id="pricing" className="max-w-6xl mx-auto px-6 py-20 lg:py-24 scroll-mt-20">
                <div className="text-center max-w-2xl mx-auto mb-14">
                    <span className="text-xs font-bold uppercase tracking-widest text-primary">Pricing</span>
                    <h2 className="text-3xl sm:text-4xl font-black tracking-tight mt-2 mb-3">Simple, honest pricing</h2>
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

            {/* ── Testimonials — PLACEHOLDER: replace with real quotes before launch ── */}
            <section className="bg-[#faf9f6] dark:bg-gray-950 border-y border-gray-100 dark:border-gray-800">
                <div className="max-w-6xl mx-auto px-6 py-20 lg:py-24">
                    <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-center mb-14">People are ditching their spreadsheets</h2>
                    <div className="grid md:grid-cols-3 gap-6">
                        <Quote text="The AI import is the feature I didn't know I needed. I dropped in three months of statements and it just… sorted everything." author="Early user" role="Freelancer" />
                        <Quote text="Finally a finance app that doesn't drown me in accountant words. My partner actually uses it too." author="Early user" role="Everyday budgeter" />
                        <Quote text="I self-host everything, so an app where I can keep my own data was an instant yes." author="Early user" role="Self-hoster" />
                    </div>
                    <p className="text-center text-xs text-gray-400 mt-6">Illustrative feedback — real customer stories coming as we launch.</p>
                </div>
            </section>

            {/* ── FAQ ──────────────────────────────────────────────────────── */}
            <section className="max-w-3xl mx-auto px-6 py-20 lg:py-24">
                <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-center mb-12">Questions, answered</h2>
                <div className="space-y-4">
                    <Faq q="Is it really free?" a="Yes — the core tracker (transactions, budgets, reports, CSV/Excel import & export) is free forever. Pro unlocks the AI features and extras." />
                    <Faq q="How does AI import work?" a="Upload a PDF, Excel, CSV, or a photo of a receipt. Our AI reads it, maps the columns, and lets you review before anything is saved." />
                    <Faq q="Is my financial data safe?" a="Your data is encrypted at rest and never sold. If you want total control, the self-host option lets you run everything on your own infrastructure." />
                    <Faq q="Do I need to enter my currency and bank?" a="You pick your currency during a quick setup. There's no bank linking required — you import statements yourself, so you're always in control." />
                    <Faq q="Can I use my own AI key?" a="Absolutely. Add your own provider key in Settings and your AI usage is unlimited and billed to you, not us." />
                </div>
            </section>

            {/* ── Final CTA ────────────────────────────────────────────────── */}
            <section className="max-w-5xl mx-auto px-6 pb-24">
                <div className="rounded-3xl bg-gradient-to-br from-primary to-primary-hover px-8 py-16 text-center text-white relative overflow-hidden">
                    <div className="absolute -top-16 -right-16 w-64 h-64 bg-white/10 rounded-full blur-2xl" />
                    <div className="absolute -bottom-20 -left-10 w-64 h-64 bg-accent/20 rounded-full blur-2xl" />
                    <h2 className="text-3xl sm:text-4xl font-black mb-3 relative">Take control of your money today</h2>
                    <p className="text-white/80 max-w-xl mx-auto mb-8 relative">Free to start. No credit card. Your future self will thank you.</p>
                    <button onClick={goSignup} className="relative bg-white text-primary font-bold py-3 px-8 rounded-xl hover:bg-white/90 transition-colors inline-flex items-center gap-2">
                        Create your free account <Icon name="ArrowRight" size={18} />
                    </button>
                </div>
            </section>
        </PublicShell>
    );
};

// ── Hero product preview: floating dashboard cards ───────────────────────────
const HeroPreview: React.FC = () => (
    <div className="relative mx-auto w-full max-w-md lg:max-w-none">
        {/* Main balance card */}
        <div className="relative rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-2xl shadow-primary/10 p-6">
            <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">This Month's Balance</span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">July</span>
            </div>
            <div className="text-3xl font-black text-gray-900 dark:text-white mb-1">$2,480<span className="text-gray-400 text-xl">.60</span></div>
            <div className="flex items-center gap-1 text-sm font-semibold text-primary mb-5">
                <Icon name="TrendingUp" size={15} /> +12% vs last month
            </div>
            {/* Mini bar chart */}
            <div className="flex items-end gap-1.5 h-20">
                {[40, 62, 48, 75, 55, 88, 68, 95, 72, 84].map((h, i) => (
                    <div key={i} className="flex-1 rounded-t-sm bg-gradient-to-t from-primary/40 to-primary" style={{ height: `${h}%` }} />
                ))}
            </div>
            <div className="flex justify-between text-[10px] text-gray-400 mt-2">
                <span>Income</span><span>Expenses</span><span>Savings</span>
            </div>
        </div>

        {/* Floating budget chip */}
        <div className="absolute -left-4 sm:-left-8 top-6 w-40 rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-xl p-3 hidden sm:block">
            <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg bg-accent/15 text-accent flex items-center justify-center"><Icon name="ShoppingBag" size={14} /></div>
                <span className="text-xs font-bold">Groceries</span>
            </div>
            <div className="progress-bar mb-1"><div className="progress-fill bg-primary" style={{ width: '72%' }} /></div>
            <span className="text-[10px] text-gray-500 dark:text-gray-400">$288 of $400</span>
        </div>

        {/* Floating AI import chip */}
        <div className="absolute -right-2 sm:-right-6 -bottom-6 w-56 rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-xl p-3.5">
            <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg bg-primary/15 text-primary flex items-center justify-center"><Icon name="Sparkles" size={14} /></div>
                <span className="text-xs font-bold">AI Import</span>
                <span className="ml-auto text-[10px] font-bold text-primary flex items-center gap-0.5"><Icon name="Check" size={12} /> Done</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400">
                <Icon name="FileText" size={13} className="text-gray-400" /> statement.pdf
                <Icon name="ArrowRight" size={12} />
                <span className="font-bold text-gray-700 dark:text-gray-200">42 transactions</span>
            </div>
        </div>
    </div>
);

// ── AI import showcase: file → transactions ──────────────────────────────────
const ImportShowcase: React.FC = () => (
    <div className="relative">
        <div className="rounded-2xl bg-white/5 border border-white/10 backdrop-blur p-5 sm:p-6">
            {/* File in */}
            <div className="flex items-center gap-3 rounded-xl bg-white/5 border border-white/10 p-3.5 mb-4">
                <div className="w-10 h-10 rounded-lg bg-rose-500/20 text-rose-300 flex items-center justify-center"><Icon name="FileText" size={20} /></div>
                <div className="flex-1">
                    <div className="text-sm font-semibold">chase-statement-jul.pdf</div>
                    <div className="text-[11px] text-white/50">Uploaded · reading with AI…</div>
                </div>
                <Icon name="Sparkles" size={18} className="text-accent animate-pulse-slow" />
            </div>
            {/* Arrow */}
            <div className="flex justify-center mb-4"><Icon name="ChevronDown" size={20} className="text-white/40" /></div>
            {/* Transactions out */}
            <div className="space-y-2">
                {[
                    { icon: 'Coffee', name: 'Blue Bottle Coffee', cat: 'Dining', amt: '-$5.40' },
                    { icon: 'ShoppingBag', name: 'Whole Foods Market', cat: 'Groceries', amt: '-$68.12' },
                    { icon: 'Banknote', name: 'Payroll Deposit', cat: 'Income', amt: '+$3,200', pos: true },
                ].map(t => (
                    <div key={t.name} className="flex items-center gap-3 rounded-xl bg-white/5 border border-white/10 p-3">
                        <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white/80"><Icon name={t.icon} size={15} /></div>
                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold truncate">{t.name}</div>
                            <div className="text-[11px] text-white/50">{t.cat}</div>
                        </div>
                        <span className={`text-sm font-bold ${t.pos ? 'text-primary-light' : 'text-white/90'}`}>{t.amt}</span>
                    </div>
                ))}
            </div>
            <div className="mt-4 text-center text-xs font-semibold text-primary-light flex items-center justify-center gap-1.5">
                <Icon name="CheckCircle" size={14} /> 42 transactions ready to review
            </div>
        </div>
    </div>
);

// ── Building blocks ──────────────────────────────────────────────────────────
const BentoCard: React.FC<{ icon: string; title: string; desc: string; className?: string; accent?: boolean }> = ({ icon, title, desc, className = '', accent }) => (
    <div className={`group p-6 rounded-2xl border transition-all hover:-translate-y-0.5 hover:shadow-lg ${accent ? 'border-primary/20 bg-gradient-to-br from-primary/5 to-transparent dark:from-primary/10' : 'border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900'} ${className}`}>
        <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
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
                    <Icon name="Check" size={16} className="text-primary flex-shrink-0 mt-0.5" /> {f}
                </li>
            ))}
        </ul>
        <button onClick={onClick} disabled={disabled} className={`w-full py-2.5 rounded-xl font-bold text-sm transition-colors ${disabled ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed' : highlight ? 'btn btn-primary' : 'border-2 border-gray-200 dark:border-gray-700 hover:border-primary hover:text-primary'}`}>{cta}</button>
    </div>
);

const Quote: React.FC<{ text: string; author: string; role: string }> = ({ text, author, role }) => (
    <div className="p-6 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="flex gap-0.5 mb-3 text-accent">{[0, 1, 2, 3, 4].map(i => <Icon key={i} name="Star" size={15} className="fill-current" />)}</div>
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
