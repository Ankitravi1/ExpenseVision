import React, { useState } from 'react';
import { Icon } from '../components/Icon';
import { authService } from '../services/auth';
import { GoogleLogin } from '@react-oauth/google';
import { ProfileCompletion } from '../components/ProfileCompletion';

const googleEnabled = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);

interface SignupProps {
    onSuccess: () => void;
    onBackToLanding: () => void;
    onSwitchToLogin: () => void;
}

export const Signup: React.FC<SignupProps> = ({ onSuccess, onBackToLanding, onSwitchToLogin }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [name, setName] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showProfileCompletion, setShowProfileCompletion] = useState(false);

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        setLoading(true);

        try {
            const res = await authService.signup({
                email,
                password,
                name,
            });

            if (res.needsProfileCompletion) {
                setShowProfileCompletion(true);
            } else {
                onSuccess();
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Signup failed');
        } finally {
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

                {/* Signup Card */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 border border-gray-100 dark:border-gray-700">
                    {showProfileCompletion ? (
                        <ProfileCompletion onComplete={onSuccess} />
                    ) : (
                        <>
                            {/* Header */}
                            <div className="text-center mb-8">
                                <div className="flex items-center justify-center gap-2 mb-4">
                                    <Icon name="Wallet" size={40} className="text-primary" />
                                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">ExpenseVision</h1>
                                </div>
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Create Account</h2>
                                <p className="text-gray-600 dark:text-gray-400">
                                    Sign up to get started
                                </p>
                            </div>

                            {/* Error Message */}
                            {error && (
                                <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
                                    <Icon name="AlertTriangle" size={20} className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                                    <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                                </div>
                            )}

                            {/* Google Signup (hidden when VITE_GOOGLE_CLIENT_ID is not configured) */}
                            {googleEnabled && (
                            <>
                            <div className="mb-6 flex justify-center">
                                <GoogleLogin
                                    onSuccess={async (credentialResponse) => {
                                        if (credentialResponse.credential) {
                                            try {
                                                const res = await authService.googleAuth(credentialResponse.credential);
                                                if (res.needsProfileCompletion) {
                                                    setShowProfileCompletion(true);
                                                } else {
                                                    onSuccess();
                                                }
                                            } catch (err) {
                                                setError('Google signup failed');
                                            }
                                        }
                                    }}
                                    onError={() => {
                                        setError('Google signup failed');
                                    }}
                                    theme="filled_blue"
                                    shape="pill"
                                    size="large"
                                    width="100%"
                                    text="signup_with"
                                />
                            </div>

                            <div className="relative mb-6">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
                                </div>
                                <div className="relative flex justify-center text-sm">
                                    <span className="px-2 bg-white dark:bg-gray-800 text-gray-500">Or sign up with email</span>
                                </div>
                            </div>
                            </>
                            )}

                            <form onSubmit={handleSignup} className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Full Name
                                    </label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        required
                                        className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                                        placeholder="John Doe"
                                    />
                                </div>

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
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Password
                                    </label>
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        minLength={6}
                                        className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                                        placeholder="At least 6 characters"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Confirm Password
                                    </label>
                                    <input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required
                                        minLength={6}
                                        className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                                        placeholder="Re-enter password"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full btn btn-primary py-3 text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <Icon name="Loader" size={20} className="animate-spin" />
                                            Creating Account...
                                        </span>
                                    ) : (
                                        'Create Account'
                                    )}
                                </button>
                            </form>

                            {/* Divider */}
                            <div className="my-8 flex items-center gap-4">
                                <div className="flex-1 border-t border-gray-300 dark:border-gray-600"></div>
                                <span className="text-sm text-gray-500 dark:text-gray-400">or</span>
                                <div className="flex-1 border-t border-gray-300 dark:border-gray-600"></div>
                            </div>

                            {/* Login Link */}
                            <div className="text-center">
                                <p className="text-gray-600 dark:text-gray-400">
                                    Already have an account?{' '}
                                    <button
                                        onClick={onSwitchToLogin}
                                        className="text-primary font-semibold hover:underline"
                                    >
                                        Sign in
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
