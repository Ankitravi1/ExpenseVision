import React, { useEffect } from 'react';
import { Icon } from './Icon';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastProps {
    message: string;
    type: ToastType;
    onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
    const bgColors = {
        success: 'bg-green-500',
        error: 'bg-red-500',
        info: 'bg-blue-500',
        warning: 'bg-yellow-500',
    };

    const icons = {
        success: 'Check',
        error: 'AlertCircle',
        info: 'Info',
        warning: 'AlertTriangle',
    };

    return (
        <div className={`${bgColors[type]} text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 min-w-[300px] animate-slide-up`}>
            <Icon name={icons[type] as any} size={20} />
            <p className="flex-1 text-sm font-medium">{message}</p>
            <button onClick={onClose} className="hover:bg-white/20 p-1 rounded transition-colors">
                <Icon name="X" size={16} />
            </button>
        </div>
    );
};
