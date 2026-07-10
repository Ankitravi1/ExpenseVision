import React, { useState, useEffect, useRef, useContext } from 'react';
import { Icon } from './Icon';
import { api } from '../services/api';
import { authService } from '../services/auth';
import { AppContext } from '../App';

interface AppNotification {
    id: string;
    title: string;
    message: string;
    read: boolean;
    createdAt: string;
}

export const NotificationCenter: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const context = useContext(AppContext);
    const setActivePage = context?.setActivePage;

    const fetchNotifications = async () => {
        if (!authService.isAuthenticated()) return;
        try {
            const res = await api.fetch('/notifications');
            if (res.ok) {
                const data = await res.json();
                setNotifications(data);
                setUnreadCount(data.filter((n: AppNotification) => !n.read).length);
            }
        } catch (error) {
            console.error('Failed to fetch notifications', error);
        }
    };

    useEffect(() => {
        fetchNotifications();
        window.addEventListener('transaction-created', fetchNotifications);
        // Poll every 30 seconds
        const interval = setInterval(fetchNotifications, 30000);
        return () => {
            clearInterval(interval);
            window.removeEventListener('transaction-created', fetchNotifications);
        };
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const markAsRead = async (id: string) => {
        try {
            await api.fetch(`/notifications/${id}/read`, { method: 'PUT' });
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error('Failed to mark notification as read', error);
        }
    };

    const deleteNotification = async (id: string) => {
        try {
            await api.fetch(`/notifications/${id}`, { method: 'DELETE' });
            setNotifications(prev => {
                const notif = prev.find(n => n.id === id);
                if (notif && !notif.read) {
                    setUnreadCount(count => Math.max(0, count - 1));
                }
                return prev.filter(n => n.id !== id);
            });
        } catch (error) {
            console.error('Failed to delete notification', error);
        }
    };

    const clearAll = async () => {
        try {
            await api.fetch('/notifications', { method: 'DELETE' });
            setNotifications([]);
            setUnreadCount(0);
            setIsOpen(false);
        } catch (error) {
            console.error('Failed to clear notifications', error);
        }
    };

    const handleNotificationClick = async (notification: AppNotification) => {
        if (!notification.read) {
            await markAsRead(notification.id);
        }
        setIsOpen(false);

        if (!setActivePage) return;

        const titleText = notification.title.toLowerCase();
        const msgText = notification.message.toLowerCase();

        if (titleText.includes('budget') || msgText.includes('budget') || titleText.includes('limit') || msgText.includes('limit')) {
            setActivePage('Budgets');
        } else if (titleText.includes('recurring') || msgText.includes('recurring') || msgText.includes('emi') || msgText.includes('rent')) {
            setActivePage('Recurring');
        } else {
            setActivePage('Transactions');
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
                aria-label="Notifications"
            >
                <Icon name="Bell" size={20} />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 rounded-xl bg-white dark:bg-gray-800 shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden z-50">
                    <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                        <h3 className="font-semibold text-gray-900 dark:text-white">Notifications</h3>
                        {notifications.length > 0 && (
                            <button
                                onClick={clearAll}
                                className="text-xs text-primary hover:text-primary-hover font-medium"
                            >
                                Clear All
                            </button>
                        )}
                    </div>
                    <div className="max-h-[400px] overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                                <Icon name="BellOff" size={32} className="mx-auto mb-3 opacity-50" />
                                <p className="text-sm">No notifications yet</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
                                {notifications.map(notification => (
                                    <div
                                        key={notification.id}
                                        onClick={() => handleNotificationClick(notification)}
                                        className={`p-4 transition-colors cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                                            !notification.read ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''
                                        }`}
                                    >
                                        <div className="flex gap-3">
                                            <div className={`mt-1 h-2 w-2 rounded-full flex-shrink-0 ${!notification.read ? 'bg-blue-500' : 'bg-transparent'}`} />
                                            <div className="min-w-0 flex-1">
                                                <h4 className={`text-sm font-medium ${!notification.read ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-305'}`}>
                                                    {notification.title}
                                                </h4>
                                                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 break-words leading-relaxed">
                                                    {notification.message}
                                                </p>
                                                <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
                                                    {new Date(notification.createdAt).toLocaleString()}
                                                </p>
                                            </div>
                                            <div className="flex gap-2 ml-auto items-center flex-shrink-0 self-start">
                                                {!notification.read && (
                                                    <button 
                                                        onClick={(e) => { 
                                                            e.stopPropagation(); 
                                                            markAsRead(notification.id); 
                                                        }} 
                                                        className="p-1.5 text-gray-450 hover:text-success rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors" 
                                                        title="Mark Read"
                                                    >
                                                        <Icon name="CheckCheck" size={16} />
                                                    </button>
                                                )}
                                                <button 
                                                    onClick={(e) => { 
                                                        e.stopPropagation(); 
                                                        deleteNotification(notification.id); 
                                                    }} 
                                                    className="p-1.5 text-gray-455 hover:text-danger rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors" 
                                                    title="Clear"
                                                >
                                                    <Icon name="Trash2" size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
