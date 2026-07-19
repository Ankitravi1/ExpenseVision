import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../../components/Icon';
import { PublicShell, LegalPage } from './PublicShell';

// ─── About ────────────────────────────────────────────────────────────────────
export const AboutPage: React.FC = () => {
    const navigate = useNavigate();
    return (
        <PublicShell>
            <div className="max-w-3xl mx-auto px-6 py-16">
                <h1 className="text-4xl font-black tracking-tight mb-6">Money software that respects you</h1>
                <div className="space-y-5 text-gray-600 dark:text-gray-300 leading-relaxed text-lg">
                    <p>ExpenseVision started from a simple frustration: personal finance apps are either bloated with jargon, locked behind subscriptions before they're useful, or quietly monetizing your data.</p>
                    <p>We're building the opposite — a tool that's genuinely useful for free, speaks plain language instead of accountant-speak, and gives you a real path to owning your own data through self-hosting.</p>
                    <p>The wedge we care most about is <strong className="text-gray-900 dark:text-white">effortless import</strong>: the tedious part of every finance app is getting your transactions in. Our AI reads your statements — PDF, spreadsheet, or even a photo — so you can skip the data entry and get to the insight.</p>
                </div>

                <div className="grid sm:grid-cols-3 gap-5 my-12">
                    {[
                        { icon: 'Smile', title: 'Simple first', desc: 'If your family can\'t use it, we designed it wrong.' },
                        { icon: 'Lock', title: 'Privacy by default', desc: 'Encrypted data, no selling, self-host option.' },
                        { icon: 'Sparkles', title: 'AI where it helps', desc: 'To remove busywork, not to gimmick.' },
                    ].map(v => (
                        <div key={v.title} className="p-5 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
                            <Icon name={v.icon} size={22} className="text-primary mb-3" />
                            <h3 className="font-bold mb-1">{v.title}</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{v.desc}</p>
                        </div>
                    ))}
                </div>

                <p className="text-gray-600 dark:text-gray-300 leading-relaxed">We're a small, independent team building in public. Have feedback or an idea? <a href="mailto:hello@expensevision.net" className="text-primary font-medium">Tell us</a> — early users shape where this goes.</p>

                <div className="mt-10">
                    <button onClick={() => navigate('/signup')} className="btn btn-primary py-3 px-7">Get started free</button>
                </div>
            </div>
        </PublicShell>
    );
};

// ─── Documentation ──────────────────────────────────────────────────────────────
const docSections = [
    { id: 'getting-started', title: 'Getting started', body: ['Sign up with email or Google, pick your currency, and add your first account. A short guided tour points out the essentials — you can replay it anytime from the profile menu or Settings → Help & Tips.'] },
    { id: 'transactions', title: 'Adding transactions', body: ['Use “New Transaction” (top right) to log an expense, income, or transfer. With AI quick-entry you can just type “coffee 4.50 from checking” and it fills in the rest.'] },
    { id: 'ai-import', title: 'Importing statements with AI', body: ['Go to Import / Export → Import. Upload a PDF, Excel, CSV, or a photo of a receipt. The AI extracts the transactions and shows a preview where you can edit, check for duplicates, and choose which rows to import. Prefer to do it yourself? Download the CSV/Excel template and fill it in.'] },
    { id: 'budgets', title: 'Budgets', body: ['On the Budgets page, set a monthly limit per category. Progress bars show how much you\'ve used, and you can enable alerts to get notified before you go over.'] },
    { id: 'recurring', title: 'Recurring transactions', body: ['Add rent, salary, loan payments, or subscriptions once and they\'re logged automatically each cycle. Pause, resume, or run one early from the Recurring page.'] },
    { id: 'invoices', title: 'Invoices', body: ['Create an invoice under Invoices, then download it as a PDF from your browser\'s print dialog. You can optionally record the total as an income transaction.'] },
    { id: 'ai-settings', title: 'AI settings & your own key', body: ['By default, AI features use our hosted key with a daily limit. Want unlimited use? In Settings → AI, choose “Use my own API key” and add a provider key (OpenAI, Gemini, and more). Your usage is then billed to you, not us.'] },
    { id: 'privacy', title: 'Your data & self-hosting', body: ['Your data is encrypted at rest. For full control, a self-host option (run the whole app on your own server, connect your own database) is on the way — see Pricing.'] },
];

export const DocsPage: React.FC = () => (
    <PublicShell>
        <div className="max-w-5xl mx-auto px-6 py-16 grid md:grid-cols-[200px_1fr] gap-10">
            <aside className="hidden md:block">
                <div className="sticky top-24 space-y-1 text-sm">
                    <p className="font-bold text-gray-900 dark:text-white mb-3">Documentation</p>
                    {docSections.map(s => (
                        <a key={s.id} href={`#${s.id}`} className="block py-1 text-gray-500 dark:text-gray-400 hover:text-primary transition-colors">{s.title}</a>
                    ))}
                </div>
            </aside>
            <div>
                <h1 className="text-4xl font-black tracking-tight mb-3">Documentation</h1>
                <p className="text-gray-500 dark:text-gray-400 mb-10">Everything you need to get the most out of ExpenseVision.</p>
                <div className="space-y-10">
                    {docSections.map(s => (
                        <section key={s.id} id={s.id} className="scroll-mt-24">
                            <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">{s.title}</h2>
                            {s.body.map((p, i) => <p key={i} className="text-gray-600 dark:text-gray-300 leading-relaxed">{p}</p>)}
                        </section>
                    ))}
                </div>
            </div>
        </div>
    </PublicShell>
);

// ─── Privacy Policy ─────────────────────────────────────────────────────────────
export const PrivacyPage: React.FC = () => (
    <LegalPage title="Privacy Policy" updated="July 2026">
        <p><em>This is a plain-language summary of how ExpenseVision handles your data. Replace the bracketed items with your legal entity details before launch, and have it reviewed for your jurisdictions (US/UK/EU).</em></p>
        <h2>What we collect</h2>
        <ul>
            <li><strong>Account info:</strong> your name, email, and (if you use Google) your Google account id.</li>
            <li><strong>Financial data you enter or import:</strong> transactions, accounts, budgets, categories, and recurring rules.</li>
            <li><strong>Technical data:</strong> basic logs and, if enabled, anonymized product analytics to improve the app.</li>
        </ul>
        <h2>How we use it</h2>
        <ul>
            <li>To provide the service — storing and displaying your finances.</li>
            <li>To power AI features: when you import a statement or use quick-entry, the relevant text is sent to your configured AI provider (ours by default, or your own key) solely to structure the data. It is not used to train models by us.</li>
            <li>We never sell your data.</li>
        </ul>
        <h2>Security</h2>
        <p>API keys and sensitive fields are encrypted at rest (AES-256-GCM). Passwords are hashed. Access to your data requires your authenticated session.</p>
        <h2>Your choices</h2>
        <ul>
            <li>Export your data anytime (CSV/Excel).</li>
            <li>Delete your data or account from Settings.</li>
            <li>Use your own AI key so statement text goes to your provider, not ours.</li>
            <li>Self-host (coming soon) to keep all data on your own infrastructure.</li>
        </ul>
        <h2>Contact</h2>
        <p>Questions about privacy? Email <a href="mailto:hello@expensevision.net">hello@expensevision.net</a>. Data controller: [Your legal entity / name], [address].</p>
    </LegalPage>
);

// ─── Terms of Service ───────────────────────────────────────────────────────────
export const TermsPage: React.FC = () => (
    <LegalPage title="Terms of Service" updated="July 2026">
        <p><em>Plain-language terms. Replace bracketed items and have this reviewed by a professional before launch.</em></p>
        <h2>1. Acceptance</h2>
        <p>By creating an account you agree to these terms. If you don't agree, please don't use the service.</p>
        <h2>2. The service</h2>
        <p>ExpenseVision is a personal finance tool for tracking, budgeting, and importing transactions. It is provided “as is” and is <strong>not financial, tax, or investment advice</strong>.</p>
        <h2>3. Your account</h2>
        <p>You're responsible for keeping your login secure and for the accuracy of the data you enter. You must be old enough to form a binding contract in your country.</p>
        <h2>4. Acceptable use</h2>
        <ul>
            <li>Don't abuse, reverse-engineer, or disrupt the service.</li>
            <li>Don't use it for unlawful purposes.</li>
            <li>AI features may have fair-use limits on the free plan.</li>
        </ul>
        <h2>5. Plans & billing</h2>
        <p>Paid plans are billed via our payment provider, which acts as merchant of record and handles applicable taxes. You can cancel anytime; access continues until the end of the paid period. Refunds per [your refund policy].</p>
        <h2>6. Liability</h2>
        <p>To the maximum extent permitted by law, ExpenseVision is not liable for indirect or consequential damages, or for decisions made based on the app. Always verify important figures yourself.</p>
        <h2>7. Termination & changes</h2>
        <p>You may stop using the service anytime. We may update these terms; we'll note the “last updated” date and, for material changes, notify you.</p>
        <h2>Contact</h2>
        <p><a href="mailto:hello@expensevision.net">hello@expensevision.net</a> · [Your legal entity], [address].</p>
    </LegalPage>
);
