import React from 'react';
import { Icon } from './Icon';

interface Props { children: React.ReactNode }
interface State { hasError: boolean }

// Catches render/runtime errors in the component tree so one broken screen shows
// a recoverable fallback instead of white-screening the whole app. (roadmap 01 §3)
export class ErrorBoundary extends React.Component<Props, State> {
    state: State = { hasError: false };

    static getDerivedStateFromError(): State {
        return { hasError: true };
    }

    componentDidCatch(error: unknown, info: unknown) {
        // Kept lightweight; a real error tracker (Sentry) can hook in here later.
        console.error('Uncaught error in component tree:', error, info);
    }

    handleReload = () => {
        this.setState({ hasError: false });
        window.location.reload();
    };

    render() {
        if (!this.state.hasError) return this.props.children;
        return (
            <div className="min-h-screen flex items-center justify-center p-6 bg-[#faf9f6] dark:bg-gray-950">
                <div className="max-w-md w-full text-center bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-xl p-8">
                    <div className="w-12 h-12 rounded-xl bg-danger/10 text-danger flex items-center justify-center mx-auto mb-4">
                        <Icon name="AlertTriangle" size={24} />
                    </div>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Something went wrong</h1>
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">
                        This part of the app hit an unexpected error. Your data is safe — reloading usually fixes it.
                    </p>
                    <button onClick={this.handleReload} className="btn btn-primary px-6 py-2.5">Reload the app</button>
                </div>
            </div>
        );
    }
}
