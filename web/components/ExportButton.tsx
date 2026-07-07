import React, { useContext } from 'react';
import { AppContext } from '../App';
import { Transaction } from '../types';
import { Icon } from './Icon';
import { formatTransactionDate } from '../utils/date';

interface ExportButtonProps {
    className?: string;
}

export const ExportButton: React.FC<ExportButtonProps> = ({ className = '' }) => {
    const context = useContext(AppContext);

    if (!context) return null;

    const { transactions, accounts, categories } = context;

    const exportToCSV = () => {
        // Prepare CSV data
        const headers = ['Date', 'Time', 'Note', 'Amount', 'Type', 'Category', 'Account', 'Transfer To'];

        const rows = transactions.map(transaction => {
            const category = categories.find(c => c.id === transaction.categoryId);
            const account = accounts.find(a => a.id === transaction.accountId);
            const transferAccount = transaction.transferToAccountId
                ? accounts.find(a => a.id === transaction.transferToAccountId)
                : null;

            return [
                formatTransactionDate(transaction.date),
                transaction.date.split('T')[1]?.slice(0, 5) || '',
                `"${transaction.note.replace(/"/g, '""')}"`, // Escape quotes
                transaction.amount.toFixed(2),
                transaction.type,
                category?.name || '',
                account?.name || '',
                transferAccount?.name || ''
            ];
        });

        // Create CSV content
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');

        // Create blob and download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        link.setAttribute('href', url);
        link.setAttribute('download', `expensevision_transactions_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <button
            onClick={exportToCSV}
            className={`btn btn-secondary flex items-center gap-2 ${className}`}
            title="Export transactions to CSV"
        >
            <Icon name="Download" size={18} />
            <span className="hidden sm:inline">Export CSV</span>
        </button>
    );
};
