import React, { useState, useEffect } from 'react';
import { Card } from '../components/Card';
import { Icon } from '../components/Icon';
import { Modal } from '../components/Modal';
import { authService } from '../services/auth';

import { AppContext } from '../App';

export const Settings: React.FC = () => {
    const context = React.useContext(AppContext);
    const { theme, setTheme } = context!;

    const [notifications, setNotifications] = useState(true);
    const [budgetAlerts, setBudgetAlerts] = useState(true);
    const [emailReports, setEmailReports] = useState(false);

    // 2FA State
    const [is2FAEnabled, setIs2FAEnabled] = useState(false);
    const [show2FAModal, setShow2FAModal] = useState(false);
    const [qrCode, setQrCode] = useState('');
    const [verificationCode, setVerificationCode] = useState('');
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    useEffect(() => {
        // Check if 2FA is enabled (this should ideally come from user profile)
        // For now, we'll assume false or check local storage if we stored it
        const user = authService.getUser();
        // We need to update the user type to include twoFactorEnabled
    }, []);

    const handleSetup2FA = async () => {
        try {
            setError('');
            const data = await authService.setup2FA();
            setQrCode(data.qrCode);
            setShow2FAModal(true);
        } catch (err) {
            setError('Failed to setup 2FA');
        }
    };

    const handleVerify2FA = async () => {
        try {
            setError('');
            await authService.verify2FA(verificationCode);
            setIs2FAEnabled(true);
            setShow2FAModal(false);
            setSuccessMessage('Two-Factor Authentication enabled successfully');
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err) {
            setError('Invalid code. Please try again.');
        }
    };

    const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
        if (newTheme === 'system') {
            // For system, we just check preference and set light/dark accordingly
            // In a real app we might want to store 'system' as a preference
            const isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
            setTheme(isDark ? 'dark' : 'light');
        } else {
            setTheme(newTheme);
        }
    };

    return (
        <div className="space-y-6 max-w-4xl">
            <h2 className="text-3xl font-bold text-gray-darkest dark:text-gray-50">Settings</h2>

            {/* Appearance */}
            <Card>
                <h3 className="text-xl font-semibold mb-4 text-gray-darkest dark:text-gray-50">Appearance</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                            Theme
                        </label>
                        <div className="grid grid-cols-3 gap-4">
                            <button
                                onClick={() => handleThemeChange('light')}
                                className={`p-4 rounded-lg border-2 transition-all ${theme === 'light'
                                    ? 'border-primary bg-primary-light dark:bg-primary/20'
                                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                    }`}
                            >
                                <Icon name="Sun" size={24} className="mx-auto mb-2" />
                                <p className="text-sm font-medium text-center">Light</p>
                            </button>
                            <button
                                onClick={() => handleThemeChange('dark')}
                                className={`p-4 rounded-lg border-2 transition-all ${theme === 'dark'
                                    ? 'border-primary bg-primary-light dark:bg-primary/20'
                                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                    }`}
                            >
                                <Icon name="Moon" size={24} className="mx-auto mb-2" />
                                <p className="text-sm font-medium text-center">Dark</p>
                            </button>
                            <button
                                onClick={() => handleThemeChange('system')}
                                className={`p-4 rounded-lg border-2 transition-all ${theme === 'system'
                                    ? 'border-primary bg-primary-light dark:bg-primary/20'
                                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                    }`}
                            >
                                <Icon name="Monitor" size={24} className="mx-auto mb-2" />
                                <p className="text-sm font-medium text-center">System</p>
                            </button>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">
                            Choose your preferred color scheme. System will match your device settings.
                        </p>
                    </div>
                </div>
            </Card>

            {/* Notifications */}
            <Card>
                <h3 className="text-xl font-semibold mb-4 text-gray-darkest dark:text-gray-50">Notifications</h3>
                <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <Icon name="Bell" size={18} className="text-gray-600 dark:text-gray-400" />
                                <h4 className="font-medium text-gray-darkest dark:text-gray-50">Enable Notifications</h4>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Receive notifications about your financial activity
                            </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer ml-4">
                            <input
                                type="checkbox"
                                checked={notifications}
                                onChange={(e) => setNotifications(e.target.checked)}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 dark:peer-focus:ring-primary/40 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
                        </label>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <Icon name="AlertCircle" size={18} className="text-gray-600 dark:text-gray-400" />
                                <h4 className="font-medium text-gray-darkest dark:text-gray-50">Budget Alerts</h4>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Get notified when you're approaching or exceeding budget limits
                            </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer ml-4">
                            <input
                                type="checkbox"
                                checked={budgetAlerts}
                                onChange={(e) => setBudgetAlerts(e.target.checked)}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 dark:peer-focus:ring-primary/40 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
                        </label>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <Icon name="Mail" size={18} className="text-gray-600 dark:text-gray-400" />
                                <h4 className="font-medium text-gray-darkest dark:text-gray-50">Email Reports</h4>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Receive monthly financial summary reports via email
                            </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer ml-4">
                            <input
                                type="checkbox"
                                checked={emailReports}
                                onChange={(e) => setEmailReports(e.target.checked)}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 dark:peer-focus:ring-primary/40 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
                        </label>
                    </div>
                </div>
            </Card>

            {/* Data & Privacy */}
            <Card>
                <h3 className="text-xl font-semibold mb-4 text-gray-darkest dark:text-gray-50">Data & Privacy</h3>
                <div className="space-y-3">
                    <button className="w-full text-left p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Icon name="Download" size={20} className="text-gray-600 dark:text-gray-400" />
                            <div>
                                <p className="font-medium text-gray-darkest dark:text-gray-50">Download Your Data</p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Export all your data in JSON format</p>
                            </div>
                        </div>
                        <Icon name="ChevronRight" size={20} className="text-gray-400" />
                    </button>

                    <button className="w-full text-left p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Icon name="Shield" size={20} className="text-gray-600 dark:text-gray-400" />
                            <div>
                                <p className="font-medium text-gray-darkest dark:text-gray-50">Privacy Policy</p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Learn how we protect your data</p>
                            </div>
                        </div>
                        <Icon name="ChevronRight" size={20} className="text-gray-400" />
                    </button>

                    <button className="w-full text-left p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Icon name="FileText" size={20} className="text-gray-600 dark:text-gray-400" />
                            <div>
                                <p className="font-medium text-gray-darkest dark:text-gray-50">Terms of Service</p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Read our terms and conditions</p>
                            </div>
                        </div>
                        <Icon name="ChevronRight" size={20} className="text-gray-400" />
                    </button>
                </div>
            </Card>

            {/* About */}
            <Card>
                <h3 className="text-xl font-semibold mb-4 text-gray-darkest dark:text-gray-50">About</h3>
                <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                    <p><strong className="text-gray-darkest dark:text-gray-50">ExpenseVision</strong> - Personal Finance Manager</p>
                    <p>Version: 1.0.0</p>
                    <p>© 2025 ExpenseVision. All rights reserved.</p>
                    <div className="pt-4 flex gap-4">
                        <a href="#" className="text-primary hover:text-primary-hover">Help Center</a>
                        <a href="#" className="text-primary hover:text-primary-hover">Contact Support</a>
                        <a href="#" className="text-primary hover:text-primary-hover">Report a Bug</a>
                    </div>
                </div>
            </Card>
        </div>
    );
};
