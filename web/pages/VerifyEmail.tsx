import React, { useEffect, useState } from 'react';
import { Icon } from '../components/Icon';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const VerifyEmail: React.FC = () => {
    // Use URLSearchParams directly since we're not using react-router-dom hooks yet (assuming simple routing in App.tsx)
    // But wait, App.tsx doesn't use react-router-dom. It uses state-based routing.
    // So I need to parse the URL manually or assume the user lands here directly.
    // Since the email link is http://localhost:3000/verify-email?token=..., I need to handle this in App.tsx.

    const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
    const [message, setMessage] = useState('');

    useEffect(() => {
        const verify = async () => {
            const params = new URLSearchParams(window.location.search);
            const token = params.get('token');

            if (!token) {
                setStatus('error');
                setMessage('No verification token found');
                return;
            }

            try {
                const res = await fetch(`${API_URL}/auth/verify-email`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token }),
                });

                const data = await res.json();

                if (res.ok) {
                    setStatus('success');
                    setMessage('Email verified successfully! You can now login.');
                } else {
                    setStatus('error');
                    setMessage(data.error || 'Verification failed');
                }
            } catch (error) {
                setStatus('error');
                setMessage('Something went wrong. Please try again.');
            }
        };

        verify();
    }, []);

    return (
        <div className="min-h-screen bg-[#faf9f6] dark:bg-gray-950 flex items-center justify-center p-6">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-md w-full text-center border border-gray-100 dark:border-gray-700">
                <div className="mb-6 flex justify-center">
                    {status === 'verifying' && (
                        <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                            <Icon name="Loader" size={32} className="text-blue-600 dark:text-blue-400 animate-spin" />
                        </div>
                    )}
                    {status === 'success' && (
                        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                            <Icon name="Check" size={32} className="text-green-600 dark:text-green-400" />
                        </div>
                    )}
                    {status === 'error' && (
                        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                            <Icon name="AlertTriangle" size={32} className="text-red-600 dark:text-red-400" />
                        </div>
                    )}
                </div>

                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    {status === 'verifying' && 'Verifying Email...'}
                    {status === 'success' && 'Email Verified!'}
                    {status === 'error' && 'Verification Failed'}
                </h2>

                <p className="text-gray-600 dark:text-gray-400 mb-8">
                    {message}
                </p>

                {status !== 'verifying' && (
                    <button
                        onClick={() => window.location.href = '/'}
                        className="btn btn-primary w-full py-3"
                    >
                        Go to Login
                    </button>
                )}
            </div>
        </div>
    );
};
