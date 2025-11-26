import React from 'react';
import { Icon } from '../components/Icon';

interface LandingPageProps {
    onLoginClick: () => void;
    onSignupClick: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onLoginClick, onSignupClick }) => {
    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
            {/* Header */}
            <header className="container mx-auto px-6 py-6 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <Icon name="Wallet" size={32} className="text-primary" />
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">ExpenseVision</h1>
                </div>
                <div className="flex gap-4">
                    <button onClick={onLoginClick} className="btn btn-secondary">
                        Login
                    </button>
                    <button onClick={onSignupClick} className="btn btn-primary">
                        Sign Up
                    </button>
                </div>
            </header>

            {/* Hero Section */}
            <main className="container mx-auto px-6 py-20">
                <div className="text-center max-w-4xl mx-auto">
                    <h2 className="text-5xl font-bold text-gray-900 dark:text-white mb-6">
                        Take Control of Your{' '}
                        <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                            Finances
                        </span>
                    </h2>
                    <p className="text-xl text-gray-600 dark:text-gray-300 mb-12">
                        Track expenses, manage budgets, and achieve your financial goals with ExpenseVision
                    </p>
                    <div className="flex gap-4 justify-center">
                        <button onClick={onSignupClick} className="btn btn-primary" style={{ padding: '1rem 2rem', fontSize: '1.125rem' }}>
                            <Icon name="Sparkles" size={20} className="mr-2" />
                            Get Started Free
                        </button>
                        <button onClick={onLoginClick} className="btn btn-secondary" style={{ padding: '1rem 2rem', fontSize: '1.125rem' }}>
                            Sign In
                        </button>
                    </div>
                </div>

                {/* Features */}
                <div className="grid md:grid-cols-3 gap-8 mt-20">
                    <FeatureCard
                        icon="TrendingUp"
                        title="Track Expenses"
                        description="Monitor your spending across categories and accounts in real-time"
                    />
                    <FeatureCard
                        icon="Target"
                        title="Set Budgets"
                        description="Create budgets and get alerts when you're approaching limits"
                    />
                    <FeatureCard
                        icon="PieChart"
                        title="Visual Reports"
                        description="Understand your finances with beautiful charts and insights"
                    />
                </div>

                {/* Stats */}
                <div className="mt-20 grid md:grid-cols-3 gap-8 text-center">
                    <div>
                        <p className="text-4xl font-bold text-primary mb-2">100%</p>
                        <p className="text-gray-600 dark:text-gray-400">Free Forever</p>
                    </div>
                    <div>
                        <p className="text-4xl font-bold text-primary mb-2">Secure</p>
                        <p className="text-gray-600 dark:text-gray-400">Your Data Protected</p>
                    </div>
                    <div>
                        <p className="text-4xl font-bold text-primary mb-2">Simple</p>
                        <p className="text-gray-600 dark:text-gray-400">Easy to Use</p>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="container mx-auto px-6 py-8 mt-20 border-t border-gray-200 dark:border-gray-700">
                <p className="text-center text-gray-600 dark:text-gray-400">
                    © 2025 ExpenseVision. Your personal finance companion.
                </p>
            </footer>
        </div>
    );
};

const FeatureCard: React.FC<{ icon: string; title: string; description: string }> = ({
    icon,
    title,
    description,
}) => (
    <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg hover:shadow-xl transition-shadow border border-gray-100 dark:border-gray-700">
        <div className="bg-gradient-to-br from-blue-500 to-purple-600 w-16 h-16 rounded-xl flex items-center justify-center mb-4">
            <Icon name={icon} size={32} className="text-white" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{title}</h3>
        <p className="text-gray-600 dark:text-gray-300">{description}</p>
    </div>
);
