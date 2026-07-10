import React, { useContext, useMemo, useState, useRef } from 'react';
import { AppContext } from '../App';
import { Card } from '../components/Card';
import { Icon } from '../components/Icon';
import { Transaction } from '../types';
import { formatCurrency } from '../utils/currency';
import { NewTransactionModal } from '../components/NewTransactionModal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ImportTransactionsModal } from '../components/ImportTransactionsModal';
import { formatTransactionDate, isoDateToDisplay } from '../utils/date';

const TransactionRow: React.FC<{ 
    transaction: Transaction; 
    onEdit: () => void; 
    isSelected: boolean; 
    onToggleSelect: () => void; 
}> = ({ transaction, onEdit, isSelected, onToggleSelect }) => {
    const { categories, accounts, currency } = useContext(AppContext)!;
    const category = categories.find(c => c.id === transaction.categoryId);
    const account = accounts.find(a => a.id === transaction.accountId);
    const destAccount = accounts.find(a => a.id === transaction.transferToAccountId);

    const isExpense = transaction.type === 'expense';
    const isTransfer = transaction.type === 'transfer';

    let amountColor = isExpense ? 'text-danger' : 'text-success';
    let prefix = isExpense ? '-' : '+';
    let note = transaction.note;
    let categoryName = category?.name;
    let icon = category?.icon || 'Tags';

    if (isTransfer) {
        amountColor = 'text-gray-700 dark:text-gray-355';
        prefix = '';
        categoryName = 'Transfer';
        icon = 'ArrowLeftRight';
    }

    return (
        <tr className={`border-b border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700/50 ${isSelected ? 'bg-primary-light/10 dark:bg-primary/5' : ''}`}>
            {/* Checkbox Selector */}
            <td className="px-4 py-4 whitespace-nowrap text-center">
                <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={onToggleSelect}
                    className="w-4 h-4 rounded text-primary focus:ring-primary border-gray-300 dark:border-gray-600 dark:bg-gray-700 focus:ring-2 cursor-pointer"
                />
            </td>
            {/* Date */}
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                {formatTransactionDate(transaction.date, true)}
            </td>
            {/* Note */}
            <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                    <div className="w-8 h-8 rounded-full bg-primary-light/50 dark:bg-primary/20 flex items-center justify-center mr-3 flex-shrink-0">
                        <Icon name={icon} className="text-primary dark:text-indigo-300" size={16} />
                    </div>
                    <span className="text-sm font-medium text-gray-955 dark:text-gray-100 truncate max-w-xs" title={note}>
                        {note}
                    </span>
                </div>
            </td>
            {/* Amount */}
            <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold ${amountColor}`}>
                {prefix}{formatCurrency(transaction.amount, currency)}
            </td>
            {/* Account */}
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-405 font-medium">
                {account?.name}
            </td>
            {/* Type */}
            <td className="px-6 py-4 whitespace-nowrap">
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    isExpense ? 'bg-red-150 text-red-800 dark:bg-red-500/20 dark:text-red-200' :
                    isTransfer ? 'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-200' :
                    'bg-green-150 text-green-800 dark:bg-green-500/20 dark:text-green-200'
                }`}>
                    {transaction.type}
                </span>
            </td>
            {/* Category (moved after Type) */}
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold bg-gray-100 dark:bg-gray-700/60 text-gray-600 dark:text-gray-300">
                    {categoryName}
                </span>
            </td>
            {/* Transfer To */}
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-555 dark:text-gray-400 font-bold">
                {isTransfer && destAccount ? (
                    <span className="inline-flex items-center gap-1 text-primary dark:text-indigo-400">
                        <Icon name="ArrowRight" size={12} />
                        {destAccount.name}
                    </span>
                ) : (
                    <span className="text-gray-300 dark:text-gray-600">—</span>
                )}
            </td>
            {/* Actions */}
            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button
                    onClick={onEdit}
                    className="text-gray-500 hover:text-primary dark:text-gray-400 dark:hover:text-primary-light transition-colors p-2 rounded-full hover:bg-gray-105 dark:hover:bg-gray-700"
                    title="Edit transaction"
                >
                    <Icon name="MoreHorizontal" size={18} />
                </button>
            </td>
        </tr>
    );
};

export const TransactionsPage: React.FC = () => {
    const { transactions, deleteTransaction, bulkDeleteTransactions, accounts, categories, currency, theme } = useContext(AppContext)!;

    const startDateRef = useRef<HTMLInputElement>(null);
    const endDateRef = useRef<HTMLInputElement>(null);

    // Helper to get YYYY-MM-DD in local time
    const getLocalDateString = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    // Default dates: 1st of current month to last day of current month
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const [startDate, setStartDate] = useState(getLocalDateString(firstDayOfMonth));
    const [endDate, setEndDate] = useState(getLocalDateString(lastDayOfMonth));
    const [viewMode, setViewMode] = useState<string>('Monthly');
    const [carryOver, setCarryOver] = useState<boolean>(true);
    const [applyFiltersToSummary, setApplyFiltersToSummary] = useState<boolean>(false);
    const [sortConfig, setSortConfig] = useState<{ key: keyof Transaction; direction: 'asc' | 'desc' }>({ key: 'date', direction: 'desc' });

    // Table Filters collapsible by default
    const [showTableFilters, setShowTableFilters] = useState<boolean>(false);
    const [showAmountFilterPopup, setShowAmountFilterPopup] = useState<boolean>(false);

    // Bulk delete selections
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isBulkDeleteConfirmOpen, setIsBulkDeleteConfirmOpen] = useState<boolean>(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);

    // Excel-like Column Filters State
    const [colFilters, setColFilters] = useState({
        note: '',
        category: '',
        account: '',
        type: '',
        amountType: 'expense' as 'expense' | 'income',
        amountLimit: ''
    });

    const updateDatesForViewMode = (mode: string) => {
        if (mode === 'Custom') return;

        const now = new Date();
        let start: Date;
        let end: Date;

        switch (mode) {
            case 'Daily':
                start = now;
                end = now;
                break;
            case 'Weekly': {
                const day = now.getDay();
                const diffToMonday = now.getDate() - day + (day === 0 ? -6 : 1);
                start = new Date(now.getFullYear(), now.getMonth(), diffToMonday);
                end = new Date(now.getFullYear(), now.getMonth(), diffToMonday + 6);
                break;
            }
            case 'Monthly':
                start = new Date(now.getFullYear(), now.getMonth(), 1);
                end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                break;
            case '3 Month':
                start = new Date(now.getFullYear(), now.getMonth() - 3, 1);
                end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                break;
            case 'Yearly':
                start = new Date(now.getFullYear(), 0, 1);
                end = new Date(now.getFullYear(), 11, 31);
                break;
            default:
                return;
        }

        setStartDate(getLocalDateString(start));
        setEndDate(getLocalDateString(end));
    };

    // Navigation arrow shift functionality
    const handleShiftPeriod = (direction: -1 | 1) => {
        if (viewMode === 'Custom') return;

        const currentStart = new Date(startDate);
        let newStart = new Date(startDate);
        let newEnd = new Date(endDate);

        switch (viewMode) {
            case 'Daily':
                newStart.setDate(newStart.getDate() + direction);
                newEnd.setDate(newEnd.getDate() + direction);
                break;
            case 'Weekly':
                newStart.setDate(newStart.getDate() + (direction * 7));
                newEnd.setDate(newEnd.getDate() + (direction * 7));
                break;
            case 'Monthly':
                newStart = new Date(currentStart.getFullYear(), currentStart.getMonth() + direction, 1);
                newEnd = new Date(currentStart.getFullYear(), currentStart.getMonth() + direction + 1, 0);
                break;
            case '3 Month':
                newStart = new Date(currentStart.getFullYear(), currentStart.getMonth() + (direction * 3), 1);
                newEnd = new Date(currentStart.getFullYear(), currentStart.getMonth() + (direction * 3) + 3, 0);
                break;
            case 'Yearly':
                newStart = new Date(currentStart.getFullYear() + direction, 0, 1);
                newEnd = new Date(currentStart.getFullYear() + direction, 11, 31);
                break;
            default:
                return;
        }

        setStartDate(getLocalDateString(newStart));
        setEndDate(getLocalDateString(newEnd));
    };

    // Edit Modal State
    const [editTransaction, setEditTransaction] = useState<Transaction | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    const requestSort = (key: keyof Transaction) => {
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

    const handleBulkDelete = async () => {
        if (selectedIds.length === 0) return;
        await bulkDeleteTransactions(selectedIds);
        setSelectedIds([]);
        setIsBulkDeleteConfirmOpen(false);
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === filteredAndSortedTransactions.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filteredAndSortedTransactions.map(t => t.id));
        }
    };

    const toggleSelectRow = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    // Date-only filtered transactions memo (used as fallback for stats calculation)
    const dateFilteredTransactions = useMemo(() => {
        return transactions.filter(t => {
            const datePart = t.date.split('T')[0];
            if (startDate && endDate) {
                return datePart >= startDate && datePart <= endDate;
            }
            return true;
        });
    }, [transactions, startDate, endDate]);

    // Full column filters + date filters memo
    const filteredAndSortedTransactions = useMemo(() => {
        const filtered = transactions.filter(t => {
            const datePart = t.date.split('T')[0];
            if (startDate && endDate) {
                if (datePart < startDate || datePart > endDate) return false;
            }

            // Excel Column Filters
            if (colFilters.note) {
                const noteText = t.type === 'transfer'
                    ? `Transfer to ${accounts.find(a => a.id === t.transferToAccountId)?.name || 'Account'}`
                    : t.note;
                if (!noteText.toLowerCase().includes(colFilters.note.toLowerCase())) return false;
            }
            if (colFilters.category) {
                const categoryName = t.type === 'transfer' ? 'Transfer' : (categories.find(c => c.id === t.categoryId)?.name || '');
                if (categoryName !== colFilters.category) return false;
            }
            if (colFilters.account) {
                const accountName = accounts.find(a => a.id === t.accountId)?.name || '';
                if (accountName !== colFilters.account) return false;
            }
            if (colFilters.type) {
                if (t.type !== colFilters.type) return false;
            }
            if (colFilters.amountLimit) {
                const limit = parseFloat(colFilters.amountLimit);
                if (t.type !== colFilters.amountType) return false;
                if (t.amount > limit) return false;
            }

            return true;
        });

        return [...filtered].sort((a, b) => {
            const key = sortConfig.key;
            let valA = a[key];
            let valB = b[key];

            if (key === 'date') {
                valA = a.date;
                valB = b.date;
            }

            if (valA === undefined) return 1;
            if (valB === undefined) return -1;

            if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [transactions, startDate, endDate, sortConfig, colFilters, accounts, categories]);

    const summarySourceList = applyFiltersToSummary ? filteredAndSortedTransactions : dateFilteredTransactions;

    const rangeIncome = useMemo(() => {
        return summarySourceList
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0);
    }, [summarySourceList]);

    const rangeExpense = useMemo(() => {
        return summarySourceList
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);
    }, [summarySourceList]);

    const preRangeBalance = useMemo(() => {
        if (!startDate) return 0;

        let incomeAndTransferIn = 0;
        let expenseAndTransferOut = 0;

        transactions.forEach(t => {
            const datePart = t.date.split('T')[0];
            if (datePart < startDate) {
                if (t.type === 'income') {
                    incomeAndTransferIn += t.amount;
                } else if (t.type === 'expense') {
                    expenseAndTransferOut += t.amount;
                } else if (t.type === 'transfer') {
                    incomeAndTransferIn += t.amount;
                    expenseAndTransferOut += t.amount;
                }
            }
        });

        const sumInitialBalances = accounts.reduce((sum, acc) => sum + acc.initialBalance, 0);
        return incomeAndTransferIn - expenseAndTransferOut + sumInitialBalances;
    }, [transactions, startDate, accounts]);

    const displayBalance = carryOver
        ? preRangeBalance + rangeIncome - rangeExpense
        : rangeIncome - rangeExpense;

    const SortableHeader: React.FC<{
        columnKey: keyof Transaction,
        title: string,
        className?: string
    }> = ({ columnKey, title, className }) => (
        <th scope="col" className={`px-6 py-3 text-xs font-semibold text-gray-550 dark:text-gray-300 uppercase tracking-wider cursor-pointer ${className}`} onClick={() => requestSort(columnKey)}>
            <div className="flex items-center">
                <span>{title}</span>
                {sortConfig.key === columnKey && (
                    <Icon name={sortConfig.direction === 'asc' ? 'ChevronUp' : 'ChevronDown'} size={14} className="ml-1" />
                )}
            </div>
        </th>
    );

    return (
        <>
            <Card>
                {/* 
                  Controls row (top layout):
                  Left: [◀] [View Selector] [▶] [From Date Input] [To Date Input]
                  Right: [Carry Over Toggle] [Import Transactions Button]
                */}
                <div className="flex flex-wrap justify-between items-center mb-6 gap-4 border-b border-gray-100 dark:border-gray-800 pb-4">
                    <div className="flex items-center gap-3 flex-wrap">
                        {/* Left chevrons + View select */}
                        <div className="flex items-center bg-gray-100 dark:bg-gray-800 p-1 rounded-xl border border-gray-200 dark:border-gray-700">
                            {viewMode !== 'Custom' && (
                                <button
                                    onClick={() => handleShiftPeriod(-1)}
                                    className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
                                    title="Go back period"
                                >
                                    <Icon name="ChevronLeft" size={14} />
                                </button>
                            )}

                            <label htmlFor="view-mode" className="text-[10px] font-bold text-gray-500 dark:text-gray-405 px-2 uppercase">View</label>
                            <select
                                id="view-mode"
                                value={viewMode}
                                onChange={(e) => {
                                    const mode = e.target.value;
                                    setViewMode(mode);
                                    updateDatesForViewMode(mode);
                                }}
                                className="input text-xs py-1 px-2.5 bg-white dark:bg-gray-700 border border-gray-250 dark:border-gray-600 rounded-lg text-gray-800 dark:text-gray-205 cursor-pointer outline-none font-bold"
                            >
                                <option value="Daily">Daily</option>
                                <option value="Weekly">Weekly</option>
                                <option value="Monthly">Monthly</option>
                                <option value="3 Month">3 Month</option>
                                <option value="Yearly">Yearly</option>
                                <option value="Custom">Custom</option>
                            </select>

                            {viewMode !== 'Custom' && (
                                <button
                                    onClick={() => handleShiftPeriod(1)}
                                    className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
                                    title="Go forward period"
                                >
                                    <Icon name="ChevronRight" size={14} />
                                </button>
                            )}
                        </div>

                        {/* Dates with Manual Typing + Calendar Ref openers */}
                        <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 p-1.5 rounded-xl border border-gray-200 dark:border-gray-700">
                            <label htmlFor="start-date" className="text-[10px] font-bold text-gray-550 dark:text-gray-400 px-1 uppercase">From</label>
                            <div className="flex items-center bg-white dark:bg-gray-700 px-2 py-0.5 rounded-lg border border-gray-200/60 dark:border-gray-600">
                                <input
                                    type="date"
                                    id="start-date"
                                    ref={startDateRef}
                                    value={startDate}
                                    onChange={e => {
                                        setStartDate(e.target.value);
                                        setViewMode('Custom');
                                    }}
                                    className="bg-transparent border-none text-xs text-gray-900 dark:text-white outline-none w-28 py-0.5 font-semibold dark:[color-scheme:dark]"
                                    style={{ colorScheme: theme }}
                                />
                                <button
                                    type="button"
                                    onClick={() => startDateRef.current?.showPicker?.()}
                                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-650 rounded text-gray-450 hover:text-gray-300 flex items-center justify-center"
                                >
                                    <Icon name="Calendar" size={13} />
                                </button>
                            </div>

                            <label htmlFor="end-date" className="text-[10px] font-bold text-gray-550 dark:text-gray-400 px-1 uppercase">To</label>
                            <div className="flex items-center bg-white dark:bg-gray-700 px-2 py-0.5 rounded-lg border border-gray-200/60 dark:border-gray-600">
                                <input
                                    type="date"
                                    id="end-date"
                                    ref={endDateRef}
                                    value={endDate}
                                    onChange={e => {
                                        setEndDate(e.target.value);
                                        setViewMode('Custom');
                                    }}
                                    className="bg-transparent border-none text-xs text-gray-900 dark:text-white outline-none w-28 py-0.5 font-semibold dark:[color-scheme:dark]"
                                    style={{ colorScheme: theme }}
                                />
                                <button
                                    type="button"
                                    onClick={() => endDateRef.current?.showPicker?.()}
                                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-650 rounded text-gray-455 hover:text-gray-300 flex items-center justify-center"
                                >
                                    <Icon name="Calendar" size={13} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Right side: Carry Over & Import Button */}
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-1.5 rounded-xl text-gray-700 dark:text-gray-200">
                            <input
                                type="checkbox"
                                id="carryover-balance-chk"
                                checked={carryOver}
                                onChange={e => setCarryOver(e.target.checked)}
                                className="w-3.5 h-3.5 text-primary rounded cursor-pointer border-gray-300 dark:border-gray-600 dark:bg-gray-700 focus:ring-primary"
                            />
                            <label htmlFor="carryover-balance-chk" className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer select-none">
                                Carry Over
                            </label>
                            <div className="relative group/tooltip">
                                <Icon name="Info" size={12} className="text-gray-450 dark:text-gray-500 hover:text-primary dark:hover:text-indigo-400 cursor-pointer" />
                                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 p-2 bg-gray-900 text-white text-[10px] rounded-lg shadow-xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-205 z-50 leading-normal">
                                    Includes your savings/expenses from previous months in the starting balance.
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={() => setIsImportModalOpen(true)}
                            className="btn btn-primary flex items-center gap-1.5 py-2 px-3.5 text-xs font-bold"
                        >
                            <Icon name="Upload" size={14} />
                            Import Transactions
                        </button>
                    </div>
                </div>

                {/* 
                  Summary Stats cards row - redesigned as separate cards to match Reports and Accounts pages
                */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    {/* Expense Card - Rose Gradient styled matching dashboard */}
                    <Card className="flex items-center p-6 bg-gradient-to-br from-rose-50 to-rose-100/50 dark:from-rose-950/20 dark:to-gray-800/40 border border-rose-150 dark:border-rose-900/30 shadow-sm rounded-xl">
                        <div className="w-12 h-12 rounded-xl bg-red-100/80 dark:bg-rose-955/40 flex items-center justify-center mr-4">
                            <Icon name="TrendingDown" className="text-danger dark:text-rose-400" size={24} />
                        </div>
                        <div>
                            <p className="text-xs font-medium text-rose-700 dark:text-gray-300">Total Expense</p>
                            <p className="text-2xl font-bold mt-1 text-danger dark:text-rose-455">
                                -{formatCurrency(rangeExpense, currency)}
                            </p>
                        </div>
                    </Card>

                    {/* Income Card - Emerald Gradient styled matching dashboard */}
                    <Card className="flex items-center p-6 bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/20 dark:to-gray-800/40 border border-emerald-150 dark:border-emerald-900/30 shadow-sm rounded-xl">
                        <div className="w-12 h-12 rounded-xl bg-green-100/80 dark:bg-emerald-955/40 flex items-center justify-center mr-4">
                            <Icon name="TrendingUp" className="text-success dark:text-emerald-405" size={24} />
                        </div>
                        <div>
                            <p className="text-xs font-medium text-emerald-700 dark:text-gray-300">Total Income</p>
                            <p className="text-2xl font-bold mt-1 text-success dark:text-emerald-405">
                                +{formatCurrency(rangeIncome, currency)}
                            </p>
                        </div>
                    </Card>

                    {/* Balance Card - Blue/Indigo Gradient matching dashboard */}
                    <Card className="flex items-center p-6 bg-gradient-to-br from-blue-50 to-indigo-50/50 dark:from-indigo-950/20 dark:to-gray-800/40 border border-blue-150 dark:border-indigo-900/30 shadow-sm rounded-xl">
                        <div className="w-12 h-12 rounded-xl bg-primary-light dark:bg-primary/20 text-primary dark:text-indigo-300 flex items-center justify-center mr-4">
                            <Icon name="CircleDollarSign" size={24} />
                        </div>
                        <div>
                            <p className="text-xs font-medium text-blue-700 dark:text-gray-300">
                                {carryOver ? 'Balance (with Carry Over)' : 'Net Balance'}
                            </p>
                            <p className="text-2xl font-bold mt-1 text-primary dark:text-indigo-400">
                                {formatCurrency(displayBalance, currency)}
                            </p>
                        </div>
                    </Card>
                </div>

                {/* 
                  Banner row (under stats):
                  Left: [Filter Toggle Button] [Apply columns check]
                  Right: [Deselect/Delete Panel] [Showing Date Badge]
                */}
                <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-3.5 flex-wrap">
                        {/* Highlighted Filter Button */}
                        <button
                            onClick={() => setShowTableFilters(!showTableFilters)}
                            className={`flex items-center gap-1.5 py-1.5 px-3.5 rounded-xl text-xs font-bold transition-all border shadow-sm ${
                                showTableFilters
                                    ? 'bg-primary-dark border-primary-dark text-white'
                                    : 'bg-primary border-primary text-white hover:bg-primary-hover'
                            }`}
                        >
                            <Icon name="SlidersHorizontal" size={14} />
                            <span>Filter</span>
                        </button>

                        {/* Apply filters to stats directly behind filter button on left side */}
                        <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-650 dark:text-gray-350 select-none bg-gray-105 dark:bg-gray-800 px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700">
                            <input
                                type="checkbox"
                                checked={applyFiltersToSummary}
                                onChange={e => setApplyFiltersToSummary(e.target.checked)}
                                className="w-4 h-4 rounded text-primary focus:ring-primary border-gray-300 dark:border-gray-650 focus:ring-2 cursor-pointer"
                            />
                            <span>Apply filters to stats</span>
                        </label>
                    </div>

                    <div className="flex items-center gap-4 flex-wrap">
                        {selectedIds.length > 0 && (
                            <div className="flex items-center gap-2 bg-rose-50 dark:bg-rose-955/20 border border-rose-200 dark:border-rose-900/50 px-3 py-1 rounded-lg text-[10px]">
                                <span className="font-extrabold text-rose-650 dark:text-rose-400">{selectedIds.length} selected</span>
                                <button
                                    onClick={() => setIsBulkDeleteConfirmOpen(true)}
                                    className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded font-bold transition-colors"
                                >
                                    Delete
                                </button>
                                <button
                                    onClick={() => setSelectedIds([])}
                                    className="px-2 py-0.5 bg-amber-500 hover:bg-amber-600 text-white rounded font-bold transition-colors shadow-sm"
                                    title="Deselect all rows"
                                >
                                    Deselect
                                </button>
                            </div>
                        )}

                        {/* Showing transactions badge moved to right side */}
                        <span className="text-xs font-bold text-primary bg-primary-light/60 dark:bg-primary/20 dark:text-indigo-300 border border-primary-light px-3 py-1.5 rounded-lg inline-block shadow-sm">
                            Showing transactions from <span className="font-extrabold">{isoDateToDisplay(startDate)}</span> to <span className="font-extrabold">{isoDateToDisplay(endDate)}</span>
                        </span>
                    </div>
                </div>

                <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-xl">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-100 dark:bg-gray-900">
                            {/* Table Column Order: Date, Note, Amount, Account, Type, Category, Transfer To, Actions */}
                            <tr>
                                <th scope="col" className="px-4 py-3 text-center w-[4%]">
                                    <input
                                        type="checkbox"
                                        checked={filteredAndSortedTransactions.length > 0 && selectedIds.length === filteredAndSortedTransactions.length}
                                        onChange={toggleSelectAll}
                                        className="w-4 h-4 rounded text-primary focus:ring-primary border-gray-300 dark:border-gray-600 focus:ring-2 cursor-pointer dark:bg-gray-800"
                                    />
                                </th>
                                <SortableHeader columnKey="date" title="Date" className="text-left w-[12%]" />
                                <SortableHeader columnKey="note" title="Note" className="text-left w-[18%]" />
                                <SortableHeader columnKey="amount" title="Amount" className="text-left w-[18%]" />
                                <SortableHeader columnKey="accountId" title="Account" className="text-left w-[14%]" />
                                <SortableHeader columnKey="type" title="Type" className="text-left w-[10%]" />
                                <SortableHeader columnKey="categoryId" title="Category" className="text-left w-[12%]" />
                                <th scope="col" className="px-6 py-3 text-xs font-semibold text-gray-550 dark:text-gray-305 uppercase tracking-wider text-left w-[10%]">
                                    Transfer To
                                </th>
                                <th scope="col" className="px-6 py-3 text-xs font-semibold text-gray-550 dark:text-gray-305 uppercase tracking-wider text-right w-[6%]">
                                    Actions
                                </th>
                            </tr>
                             {/* Excel-like Inline Columns Filter Row */}
                             {showTableFilters && (
                                 <tr className="bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                                     <th className="px-4 py-1.5"></th>
                                     <th className="px-4 py-1.5"></th>
                                     <th className="px-4 py-1.5">
                                         <input
                                             type="text"
                                             placeholder="Filter Note..."
                                             value={colFilters.note}
                                             onChange={e => setColFilters(prev => ({ ...prev, note: e.target.value }))}
                                             className="input text-xs py-1 px-2 w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md outline-none focus:ring-1 focus:ring-primary text-gray-900 dark:text-gray-100"
                                         />
                                     </th>
                                     <th className="px-4 py-1.5 relative">
                                         <button
                                             type="button"
                                             onClick={() => setShowAmountFilterPopup(!showAmountFilterPopup)}
                                             className={`flex items-center justify-between text-xs py-1 px-2 w-full bg-white dark:bg-gray-700 border rounded-md outline-none text-left font-medium transition-all ${
                                                 colFilters.amountLimit
                                                     ? 'text-primary dark:text-indigo-400 border-primary dark:border-indigo-500 bg-primary-light/30 dark:bg-primary/10'
                                                     : 'text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-600'
                                             }`}
                                         >
                                             <span className="truncate">
                                                 {colFilters.amountLimit
                                                     ? `${colFilters.amountType === 'expense' ? 'Exp' : 'Inc'} ≤ ${colFilters.amountLimit}`
                                                     : 'Range'}
                                             </span>
                                             <Icon name="ChevronDown" size={12} className="ml-1 flex-shrink-0" />
                                         </button>
                                         {showAmountFilterPopup && (
                                             <div className="absolute top-full right-0 mt-1 w-56 p-3 bg-white dark:bg-gray-800 border border-gray-255 dark:border-gray-700 rounded-lg shadow-xl z-50 flex flex-col gap-3">
                                                 <div className="text-[10px] font-bold text-gray-450 dark:text-gray-400 uppercase tracking-wider">Amount Filter</div>
                                                 <div className="grid grid-cols-2 gap-1 bg-gray-100 dark:bg-gray-900 p-0.5 rounded-lg">
                                                     <button
                                                         type="button"
                                                         onClick={() => setColFilters(prev => ({ ...prev, amountType: 'expense' }))}
                                                         className={`py-1 text-xs font-semibold rounded-md transition-all ${
                                                             colFilters.amountType === 'expense'
                                                                 ? 'bg-rose-500 text-white shadow-sm'
                                                                 : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                                                         }`}
                                                     >
                                                         Expense
                                                     </button>
                                                     <button
                                                         type="button"
                                                         onClick={() => setColFilters(prev => ({ ...prev, amountType: 'income' }))}
                                                         className={`py-1 text-xs font-semibold rounded-md transition-all ${
                                                             colFilters.amountType === 'income'
                                                                 ? 'bg-emerald-500 text-white shadow-sm'
                                                                 : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                                                         }`}
                                                     >
                                                         Income
                                                     </button>
                                                 </div>

                                                 <div className="flex flex-col gap-1">
                                                     <label className="text-[10px] font-semibold text-gray-400 dark:text-gray-550">Up to Limit (0 to value):</label>
                                                     <input
                                                         type="number"
                                                         placeholder="Enter limit..."
                                                         value={colFilters.amountLimit}
                                                         onChange={e => setColFilters(prev => ({ ...prev, amountLimit: e.target.value }))}
                                                         className="input text-xs py-1 px-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md outline-none text-gray-900 dark:text-gray-100 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                     />
                                                 </div>
                                             </div>
                                         )}
                                     </th>
                                     <th className="px-4 py-1.5">
                                         <select
                                             value={colFilters.account}
                                             onChange={e => setColFilters(prev => ({ ...prev, account: e.target.value }))}
                                             className="input text-xs py-1 px-2 w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md outline-none cursor-pointer focus:ring-1 focus:ring-primary font-medium text-gray-900 dark:text-gray-100"
                                         >
                                             <option value="">All Accounts</option>
                                             {accounts.map(a => (
                                                 <option key={a.id} value={a.name}>{a.name}</option>
                                             ))}
                                         </select>
                                     </th>
                                     <th className="px-4 py-1.5">
                                         <select
                                             value={colFilters.type}
                                             onChange={e => setColFilters(prev => ({ ...prev, type: e.target.value }))}
                                             className="input text-xs py-1 px-2 w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md outline-none cursor-pointer focus:ring-1 focus:ring-primary font-medium text-gray-900 dark:text-gray-100"
                                         >
                                             <option value="">All Types</option>
                                             <option value="income">Income</option>
                                             <option value="expense">Expense</option>
                                             <option value="transfer">Transfer</option>
                                         </select>
                                     </th>
                                     <th className="px-4 py-1.5">
                                         <select
                                             value={colFilters.category}
                                             onChange={e => setColFilters(prev => ({ ...prev, category: e.target.value }))}
                                             className="input text-xs py-1 px-2 w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md outline-none cursor-pointer focus:ring-1 focus:ring-primary font-medium text-gray-900 dark:text-gray-100"
                                         >
                                             <option value="">All Categories</option>
                                             <option value="Transfer">Transfer</option>
                                             {categories.map(c => (
                                                 <option key={c.id} value={c.name}>{c.name}</option>
                                             ))}
                                         </select>
                                     </th>
                                     <th className="px-4 py-1.5"></th>
                                     <th className="px-4 py-1.5 text-right">
                                         {(colFilters.note || colFilters.category || colFilters.account || colFilters.type || colFilters.minAmount || colFilters.maxAmount) && (
                                             <button
                                                 onClick={() => setColFilters({ note: '', category: '', account: '', type: '', minAmount: '', maxAmount: '' })}
                                                 className="text-xs text-rose-500 hover:text-rose-700 dark:text-rose-400 font-bold hover:underline transition-colors"
                                                 title="Clear column filters"
                                             >
                                                 Clear
                                            </button>
                                        )}
                                    </th>
                                </tr>
                            )}
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-250 dark:bg-gray-800 dark:divide-gray-700">
                            {filteredAndSortedTransactions.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="px-6 py-8 text-center text-gray-500 dark:text-gray-450">
                                        No transactions found matching the selected filters
                                    </td>
                                </tr>
                            ) : (
                                filteredAndSortedTransactions.map(transaction => (
                                    <TransactionRow
                                        key={transaction.id}
                                        transaction={transaction}
                                        onEdit={() => handleEdit(transaction)}
                                        isSelected={selectedIds.includes(transaction.id)}
                                        onToggleSelect={() => toggleSelectRow(transaction.id)}
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

            <ConfirmDialog
                isOpen={isBulkDeleteConfirmOpen}
                onClose={() => setIsBulkDeleteConfirmOpen(false)}
                onConfirm={handleBulkDelete}
                title="Bulk Delete Transactions"
                message={`Are you sure you want to delete the ${selectedIds.length} selected transactions? This will reverse their account balances and cannot be undone.`}
                confirmText="Delete Selected"
                cancelText="Cancel"
                variant="danger"
            />

            <ImportTransactionsModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
            />
        </>
    );
};
