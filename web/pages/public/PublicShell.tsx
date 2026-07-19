import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Icon } from '../../components/Icon';

// Shared chrome (top nav + footer) for all public/marketing pages so the landing,
// pricing, docs, about, and legal pages feel like one site.
export const PublicShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const navigate = useNavigate();
    const [menuOpen, setMenuOpen] = useState(false);

    const navLinks = [
        { label: 'Features', to: '/#features' },
        { label: 'Pricing', to: '/#pricing' },
        { label: 'Docs', to: '/docs' },
        { label: 'About', to: '/about' },
    ];

    return (
        <div className="min-h-screen flex flex-col bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">
            {/* Nav */}
            <header className="sticky top-0 z-40 backdrop-blur bg-white/80 dark:bg-gray-950/80 border-b border-gray-100 dark:border-gray-800">
                <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center">
                            <Icon name="Wallet" size={18} className="text-white" />
                        </div>
                        <span className="text-lg font-bold tracking-tight">ExpenseVision</span>
                    </Link>

                    <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-gray-600 dark:text-gray-300">
                        {navLinks.map(l => (
                            <Link key={l.to} to={l.to} className="hover:text-gray-900 dark:hover:text-white transition-colors">{l.label}</Link>
                        ))}
                    </nav>

                    <div className="hidden md:flex items-center gap-3">
                        <button onClick={() => navigate('/login')} className="text-sm font-semibold text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">Sign in</button>
                        <button onClick={() => navigate('/signup')} className="btn btn-primary text-sm py-2 px-4">Get started free</button>
                    </div>

                    <button onClick={() => setMenuOpen(o => !o)} className="md:hidden p-2 -mr-2 text-gray-600 dark:text-gray-300" aria-label="Menu">
                        <Icon name={menuOpen ? 'X' : 'Menu'} size={22} />
                    </button>
                </div>
                {menuOpen && (
                    <div className="md:hidden border-t border-gray-100 dark:border-gray-800 px-6 py-4 space-y-3">
                        {navLinks.map(l => (
                            <Link key={l.to} to={l.to} onClick={() => setMenuOpen(false)} className="block text-sm font-medium text-gray-600 dark:text-gray-300">{l.label}</Link>
                        ))}
                        <div className="flex gap-3 pt-2">
                            <button onClick={() => navigate('/login')} className="btn btn-secondary flex-1 text-sm">Sign in</button>
                            <button onClick={() => navigate('/signup')} className="btn btn-primary flex-1 text-sm">Get started</button>
                        </div>
                    </div>
                )}
            </header>

            <main className="flex-1">{children}</main>

            {/* Footer */}
            <footer className="border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/40">
                <div className="max-w-6xl mx-auto px-6 py-12 grid grid-cols-2 md:grid-cols-4 gap-8 text-sm">
                    <div className="col-span-2 md:col-span-1">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center">
                                <Icon name="Wallet" size={16} className="text-white" />
                            </div>
                            <span className="font-bold">ExpenseVision</span>
                        </div>
                        <p className="text-gray-500 dark:text-gray-400 leading-relaxed">Track, budget, and import your money with AI — on web and mobile.</p>
                    </div>
                    <div>
                        <h4 className="font-semibold mb-3">Product</h4>
                        <ul className="space-y-2 text-gray-500 dark:text-gray-400">
                            <li><Link to="/#features" className="hover:text-gray-900 dark:hover:text-white">Features</Link></li>
                            <li><Link to="/#pricing" className="hover:text-gray-900 dark:hover:text-white">Pricing</Link></li>
                            <li><Link to="/docs" className="hover:text-gray-900 dark:hover:text-white">Documentation</Link></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-semibold mb-3">Company</h4>
                        <ul className="space-y-2 text-gray-500 dark:text-gray-400">
                            <li><Link to="/about" className="hover:text-gray-900 dark:hover:text-white">About</Link></li>
                            <li><a href="mailto:hello@expensevision.net" className="hover:text-gray-900 dark:hover:text-white">Contact</a></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-semibold mb-3">Legal</h4>
                        <ul className="space-y-2 text-gray-500 dark:text-gray-400">
                            <li><Link to="/privacy" className="hover:text-gray-900 dark:hover:text-white">Privacy Policy</Link></li>
                            <li><Link to="/terms" className="hover:text-gray-900 dark:hover:text-white">Terms of Service</Link></li>
                        </ul>
                    </div>
                </div>
                <div className="border-t border-gray-100 dark:border-gray-800 py-6 text-center text-xs text-gray-400">
                    © {new Date().getFullYear()} ExpenseVision · expensevision.net · Made for people who don't love spreadsheets.
                </div>
            </footer>
        </div>
    );
};

// Small shared building block for legal/docs prose pages.
export const LegalPage: React.FC<{ title: string; updated?: string; children: React.ReactNode }> = ({ title, updated, children }) => (
    <PublicShell>
        <div className="max-w-3xl mx-auto px-6 py-16">
            <h1 className="text-4xl font-black tracking-tight mb-2">{title}</h1>
            {updated && <p className="text-sm text-gray-400 mb-10">Last updated: {updated}</p>}
            <div className="prose-invert space-y-5 text-gray-600 dark:text-gray-300 leading-relaxed [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-gray-900 dark:[&_h2]:text-white [&_h2]:mt-10 [&_h2]:mb-3 [&_a]:text-primary [&_a]:font-medium [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1">
                {children}
            </div>
        </div>
    </PublicShell>
);
