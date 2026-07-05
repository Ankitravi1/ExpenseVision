
import React, { useContext, useMemo, useState } from 'react';
import { AppContext } from '../App';
import { Card } from '../components/Card';
import { Icon } from '../components/Icon';
import { Transaction } from '../types';
import { ExportButton } from '../components/ExportButton';
import { formatCurrency } from '../utils/currency';
import { NewTransactionModal } from '../components/NewTransactionModal';
import { displayDateToIso, formatTransactionDate, isoDateToDisplay, transactionDateToIso } from '../utils/date';

const TransactionRow: React.FC<{ transaction: Transaction; onEdit: () => void }> = ({ transaction, onEdit }) => {
    const { categories, accounts, currency } = useContext(AppContext)!;
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

    return (
        <tr className="border-b border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700/50">
            <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {formatTransactionDate(transaction.date, true)}
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
                {prefix}{formatCurrency(transaction.amount, currency)}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button
                    onClick={onEdit}
                    className="text-gray-500 hover:text-primary dark:text-gray-400 dark:hover:text-primary-light transition-colors p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                    title="Edit transaction"
                >
                    <Icon name="MoreHorizontal" size={18} />
                </button>
            </td>
        </tr>
    );
}


import { ImportTransactionsModal } from '../components/ImportTransactionsModal';

// ... (existing imports)

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

    const [startDate, setStartDate] = useState(isoDateToDisplay(getLocalDateString(firstDayOfMonth)));
    const [endDate, setEndDate] = useState(isoDateToDisplay(getLocalDateString(today)));
    const [sortConfig, setSortConfig] = useState<{ key: keyof Transaction | 'accountName'; direction: 'asc' | 'desc' }>({ key: 'date', direction: 'desc' });

    // Edit Modal State
    const [editTransaction, setEditTransaction] = useState<Transaction | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);

    const requestSort = (key: keyof Transaction | 'accountName') => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const handleEdit = (transaction: Transaction) => {
        setEditTransaction(transaction);
        setIsEditModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        await deleteTransaction(id);
        setIsEditModalOpen(false);
    };

    const filteredAndSortedTransactions = useMemo(() => {
        const startIso = startDate ? displayDateToIso(startDate) : null;
        const endIso = endDate ? displayDateToIso(endDate) : null;

        const filtered = transactions.filter(t => {
            if (!startIso || !endIso) return true;
            const tDate = transactionDateToIso(t.date);
            return tDate >= startIso && tDate <= endIso;
        });

        return [...filtered].sort((a, b) => {
            const key = sortConfig.key as keyof Transaction;
            let valA = a[key];
            let valB = b[key];

            if (key === 'date') {
                valA = transactionDateToIso(String(valA));
                valB = transactionDateToIso(String(valB));
            }

            if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [transactions, startDate, endDate, sortConfig]);

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

    const handleImportSuccess = (minDate: string, maxDate: string) => {
        setStartDate(isoDateToDisplay(minDate));
        setEndDate(isoDateToDisplay(maxDate));
    };

    return (
        <>
            <Card>
                <div className="flex flex-wrap justify-between items-center mb-4 gap-4">
                    <h2 className="text-2xl font-bold text-gray-darkest dark:text-gray-50">All Transactions</h2>
                    <div className="flex items-center gap-3 flex-wrap">
                        <div className="flex items-center gap-2">
                            {/* ... Date inputs ... */}
                            <label htmlFor="start-date" className="text-sm font-medium text-gray-medium dark:text-gray-400">From</label>
                            <input
                                type="text"
                                id="start-date"
                                value={startDate}
                                onChange={e => setStartDate(e.target.value)}
                                placeholder="DD-MM-YYYY"
                                inputMode="numeric"
                                className="input text-sm"
                            />
                            <label htmlFor="end-date" className="text-sm font-medium text-gray-medium dark:text-gray-400">To</label>
                            <input
                                type="text"
                                id="end-date"
                                value={endDate}
                                onChange={e => setEndDate(e.target.value)}
                                placeholder="DD-MM-YYYY"
                                inputMode="numeric"
                                className="input text-sm"
                            />
                            <button
                                onClick={() => { setStartDate(''); setEndDate(''); }}
                                className="px-3 py-2 text-sm font-medium text-primary hover:text-primary-dark hover:bg-primary/10 rounded-lg transition-colors whitespace-nowrap"
                            >
                                Show All
                            </button>
                        </div>
                        <button
                            onClick={() => setIsImportModalOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors text-sm font-medium text-gray-700 dark:text-gray-200"
                        >
                            <Icon name="Upload" size={16} />
                            Import CSV
                        </button>
                        <ExportButton />
                    </div>
                </div>
                {/* ... Table ... */}
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    {startDate && endDate ? (
                        <>Showing transactions from {startDate} to {endDate}</>
                    ) : (
                        <>Showing all transactions</>
                    )}
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
                                        onEdit={() => handleEdit(transaction)}
                                    />
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {isEditModalOpen && editTransaction && (
                <NewTransactionModal
                    isOpen={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    transaction={editTransaction}
                    onDelete={handleDelete}
                />
            )}

            <ImportTransactionsModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                onImportSuccess={handleImportSuccess}
            />
        </>
    );
};
