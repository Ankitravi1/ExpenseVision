
import React, { useContext, useMemo, useState } from 'react';
import { AppContext } from '../App';
import { Card } from '../components/Card';
import { Icon } from '../components/Icon';
import { Transaction } from '../types';
import { ExportButton } from '../components/ExportButton';
import { ConfirmDialog } from '../components/ConfirmDialog';

const TransactionRow: React.FC<{ transaction: Transaction; onEdit: () => void; onDelete: () => void }> = ({ transaction, onEdit, onDelete }) => {
    const { categories, accounts } = useContext(AppContext)!;
    const category = categories.find(c => c.id === transaction.categoryId);
    const account = accounts.find(a => a.id === transaction.accountId);
    const destAccount = accounts.find(a => a.id === transaction.transferToAccountId);

    const isExpense = transaction.type === 'expense';
    const isTransfer = transaction.type === 'transfer';

    let amountColor = isExpense ? 'text-danger' : 'text-success';
    let prefix = isExpense ? '-' : '+';
    let description = transaction.description;
    let categoryName = category?.name;
    let icon = category?.icon || 'Tags';

    if (isTransfer) {
        amountColor = 'text-gray-700 dark:text-gray-300';
        prefix = '';
        description = `Transfer to ${destAccount?.name || 'Account'}`;
        categoryName = 'Transfer';
        icon = 'ArrowLeftRight';
    }

    // Format date as DD/MM/YYYY HH:MM
    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${day}/${month}/${year} ${hours}:${minutes}`;
    };

    return (
        <tr className="border-b border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700/50">
            <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {formatDate(transaction.date)}
                </div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                    <div className="w-8 h-8 rounded-full bg-primary-light dark:bg-primary/20 flex items-center justify-center mr-3 flex-shrink-0">
                        <Icon name={icon} className="text-primary dark:text-indigo-300" size={18} />
                    </div>
                    <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{description}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{categoryName}</div>
                    </div>
                </div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{account?.name}</td>
            <td className="px-6 py-4 whitespace-nowrap">
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${isExpense ? 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-200' :
                    isTransfer ? 'bg-gray-100 text-gray-800 dark:bg-gray-500/20 dark:text-gray-200' :
                        'bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-200'
                    }`}>
                    {transaction.type}
                </span>
            </td>
            <td className={`px-6 py-4 whitespace-nowrap text-sm font-semibold text-right ${amountColor}`}>
                {prefix}₹{transaction.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button
                    onClick={onDelete}
                    className="text-danger hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20"
                    title="Delete transaction"
                >
                    <Icon name="Trash2" size={18} />
                </button>
            </td>
        </tr>
    );
}


export const TransactionsPage: React.FC = () => {
    const { transactions, deleteTransaction } = useContext(AppContext)!;

    // Helper to get YYYY-MM-DD in local time
    const getLocalDateString = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    // Set default dates: 1st of current month to today (DD/MM/YYYY format)
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const [startDate, setStartDate] = useState(getLocalDateString(firstDayOfMonth));
    const [endDate, setEndDate] = useState(getLocalDateString(today));
    const [sortConfig, setSortConfig] = useState<{ key: keyof Transaction | 'accountName'; direction: 'asc' | 'desc' }>({ key: 'date', direction: 'desc' });
    const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; transactionId: string | null }>({ isOpen: false, transactionId: null });

    const requestSort = (key: keyof Transaction | 'accountName') => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const handleDelete = (id: string) => {
        setDeleteConfirm({ isOpen: true, transactionId: id });
    };

    const confirmDelete = () => {
        if (deleteConfirm.transactionId) {
            deleteTransaction(deleteConfirm.transactionId);
        }
    };

    const filteredAndSortedTransactions = useMemo(() => {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        const filtered = transactions.filter(t => {
            const tDate = new Date(t.date);
            return tDate >= start && tDate <= end;
        });

        return [...filtered].sort((a, b) => {
            const key = sortConfig.key as keyof Transaction;
            let valA = a[key];
            let valB = b[key];

            if (key === 'date') {
                valA = new Date(valA).getTime();
                valB = new Date(valB).getTime();
            }

            if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [transactions, startDate, endDate, sortConfig]);

    // Format date for display (DD/MM/YYYY)
    const formatDateForDisplay = (dateStr: string) => {
        const date = new Date(dateStr);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    };

    const SortableHeader: React.FC<{
        columnKey: keyof Transaction | 'accountName',
        title: string,
        className?: string
    }> = ({ columnKey, title, className }) => (
        <th scope="col" className={`px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer ${className}`} onClick={() => requestSort(columnKey)}>
            <div className="flex items-center">
                <span>{title}</span>
                {sortConfig.key === columnKey && (
                    <Icon name={sortConfig.direction === 'asc' ? 'ChevronUp' : 'ChevronDown'} size={16} className="ml-1" />
                )}
            </div>
        </th>
    );

    return (
        <>
            <Card>
                <div className="flex flex-wrap justify-between items-center mb-4 gap-4">
                    <h2 className="text-2xl font-bold text-gray-darkest dark:text-gray-50">All Transactions</h2>
                    <div className="flex items-center gap-3 flex-wrap">
                        <div className="flex items-center gap-2">
                            <label htmlFor="start-date" className="text-sm font-medium text-gray-medium dark:text-gray-400">From</label>
                            <input
                                type="date"
                                id="start-date"
                                value={startDate}
                                onChange={e => setStartDate(e.target.value)}
                                className="input text-sm"
                            />
                            <label htmlFor="end-date" className="text-sm font-medium text-gray-medium dark:text-gray-400">To</label>
                            <input
                                type="date"
                                id="end-date"
                                value={endDate}
                                onChange={e => setEndDate(e.target.value)}
                                className="input text-sm"
                            />
                        </div>
                        <ExportButton />
                    </div>
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    Showing transactions from {formatDateForDisplay(startDate)} to {formatDateForDisplay(endDate)}
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700/50">
                            <tr>
                                <SortableHeader columnKey="date" title="Date" className="text-left" />
                                <SortableHeader columnKey="description" title="Description" className="text-left" />
                                <SortableHeader columnKey="accountId" title="Account" className="text-left" />
                                <SortableHeader columnKey="type" title="Type" className="text-left" />
                                <SortableHeader columnKey="amount" title="Amount" className="text-right" />
                                <th scope="col" className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider text-right">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                            {filteredAndSortedTransactions.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                                        No transactions found for the selected date range
                                    </td>
                                </tr>
                            ) : (
                                filteredAndSortedTransactions.map(transaction => (
                                    <TransactionRow
                                        key={transaction.id}
                                        transaction={transaction}
                                        onEdit={() => {/* TODO: Implement edit modal */ }}
                                        onDelete={() => handleDelete(transaction.id)}
                                    />
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            <ConfirmDialog
                isOpen={deleteConfirm.isOpen}
                onClose={() => setDeleteConfirm({ isOpen: false, transactionId: null })}
                onConfirm={confirmDelete}
                title="Delete Transaction"
                message="Are you sure you want to delete this transaction? This action cannot be undone."
                confirmText="Delete"
                cancelText="Cancel"
                variant="danger"
            />
        </>
    );
};
