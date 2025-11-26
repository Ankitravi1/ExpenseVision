import React, { useState } from 'react';
import { Icon } from '../components/Icon';
import { authService } from '../services/auth';
import { GoogleLogin } from '@react-oauth/google';
import { ProfileCompletion } from '../components/ProfileCompletion';

interface LoginProps {
    onSuccess: () => void;
    onBackToLanding: () => void;
    onSwitchToSignup: () => void;
    onForgotPassword: () => void;
}

export const Login: React.FC<LoginProps> = ({ onSuccess, onBackToLanding, onSwitchToSignup, onForgotPassword }) => {
    const [step, setStep] = useState<1 | 2>(1);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [twoFactorCode, setTwoFactorCode] = useState('');
    const [userId, setUserId] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showProfileCompletion, setShowProfileCompletion] = useState(false);
    const [initialName, setInitialName] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (step === 1) {
                const res = await authService.login(email, password);
                // Cast to any to handle potential 2FA response structure
                const data = res as any;
                if (data.require2FA) {
                    setUserId(data.userId);
                    setStep(2);
                    setLoading(false);
                    return;
                }

                onSuccess();
            } else {
                await authService.login2FA(userId, twoFactorCode);
                onSuccess();
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Login failed');
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-6">
            <div className="w-full max-w-md">
                {/* Back Button */}
                <button
                    onClick={onBackToLanding}
                    className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-8 transition-colors"
                >
                    <Icon name="ChevronLeft" size={20} />
                    Back to Home
                </button>

                {/* Login Card */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 border border-gray-100 dark:border-gray-700">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="flex items-center justify-center gap-2 mb-4">
                            <Icon name="Wallet" size={40} className="text-primary" />
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">ExpenseVision</h1>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Welcome Back</h2>
                        <p className="text-gray-600 dark:text-gray-400">Sign in to your account</p>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
                            <Icon name="AlertTriangle" size={20} className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                        </div>
                    )}

                    {showProfileCompletion ? (
                        <ProfileCompletion onComplete={onSuccess} initialName={initialName} />
                    ) : (
                        <>
                            {/* Google Login */}
                            <div className="mb-6 flex justify-center">
                                <GoogleLogin
                                    onSuccess={async (credentialResponse) => {
                                        if (credentialResponse.credential) {
                                            try {
                                                const res = await authService.googleAuth(credentialResponse.credential);
                                                if (res.isNewUser) {
                                                    setInitialName(res.user.name);
                                                    setShowProfileCompletion(true);
                                                } else {
                                                    onSuccess();
                                                }
                                            } catch (err) {
                                                setError('Google login failed');
                                            }
                                        }
                                    }}
                                    onError={() => {
                                        setError('Google login failed');
                                    }}
                                    theme="filled_blue"
                                    shape="pill"
                                    size="large"
                                    width="100%"
                                />
                            </div>

                            <div className="relative mb-6">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
                                </div>
                                <div className="relative flex justify-center text-sm">
                                    <span className="px-2 bg-white dark:bg-gray-800 text-gray-500">Or continue with email</span>
                                </div>
                            </div>

                            {/* Login Form */}
                            <form onSubmit={handleSubmit} className="space-y-6">
                                {step === 1 ? (
                                    <>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                Email Address
                                            </label>
                                            <input
                                                type="email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                required
                                                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                                                placeholder="you@example.com"
                                            />
                                        </div>

                                        <div>
                                            <div className="flex justify-between items-center mb-2">
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                                    Password
                                                </label>
                                                <button
                                                    type="button"
                                                    onClick={onForgotPassword}
                                                    className="text-sm text-primary hover:underline"
                                                >
                                                    Forgot Password?
                                                </button>
                                            </div>
                                            <input
                                                type="password"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                required
                                                minLength={6}
                                                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                                                placeholder="••••••••"
                                            />
                                        </div>
                                    </>
                                ) : (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Two-Factor Authentication Code
                                        </label>
                                        <input
                                            type="text"
                                            value={twoFactorCode}
                                            onChange={(e) => setTwoFactorCode(e.target.value)}
                                            required
                                            maxLength={6}
                                            className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-center tracking-widest text-lg"
                                            placeholder="000000"
                                            autoFocus
                                        />
                                        <p className="mt-2 text-sm text-gray-500 text-center">
                                            Enter the code from your authenticator app
                                        </p>
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full btn btn-primary py-3 text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <Icon name="Loader" size={20} className="animate-spin" />
                                            {step === 1 ? 'Signing in...' : 'Verifying...'}
                                        </span>
                                    ) : (
                                        step === 1 ? 'Sign In' : 'Verify'
                                    )}
                                </button>
                            </form>

                            {/* Divider */}
                            <div className="my-8 flex items-center gap-4">
                                <div className="flex-1 border-t border-gray-300 dark:border-gray-600"></div>
                                <span className="text-sm text-gray-500 dark:text-gray-400">or</span>
                                <div className="flex-1 border-t border-gray-300 dark:border-gray-600"></div>
                            </div>

                            {/* Sign Up Link */}
                            <div className="text-center">
                                <p className="text-gray-600 dark:text-gray-400">
                                    Don't have an account?{' '}
                                    <button
                                        onClick={onSwitchToSignup}
                                        className="text-primary font-semibold hover:underline"
                                    >
                                        Sign up
                                    </button>
                                </p>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
