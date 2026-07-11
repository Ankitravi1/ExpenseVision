import React, { useContext, useMemo, useRef, useState } from 'react';
import { AppContext } from '../../App';
import { useToast } from '../../context/ToastContext';
import { Icon } from '../Icon';
import { Transaction } from '../../types';
import { formatCurrency } from '../../utils/currency';
import { formatTransactionDate, isoDateToDisplay } from '../../utils/date';
import { loadXlsx } from './fileLoaders';

// Local-date helpers (mirrors TransactionsPage/Reports — avoids the UTC
// off-by-one-day bug that new Date("YYYY-MM-DD") introduces).
const getLocalDateString = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const parseLocalDate = (s: string) => {
    const [y, m, d] = s.substring(0, 10).split('-').map(Number);
    return new Date(y, m - 1, d);
};

// RFC 4180-style field escaping (matches Reports.tsx's csvField helper).
const csvField = (value: unknown): string => {
    const str = value == null ? '' : String(value);
    const escaped = str.replace(/"/g, '""');
    return /[",\n\r]/.test(str) ? `"${escaped}"` : escaped;
};

interface ExportPanelProps {
    initialStartDate?: string | null;
    initialEndDate?: string | null;
}

export const ExportPanel: React.FC<ExportPanelProps> = ({ initialStartDate, initialEndDate }) => {
    const context = useContext(AppContext);
    const { showToast } = useToast();
    const startDateRef = useRef<HTMLInputElement>(null);
    const endDateRef = useRef<HTMLInputElement>(null);

    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const [startDate, setStartDate] = useState(initialStartDate || getLocalDateString(firstDayOfMonth));
    const [endDate, setEndDate] = useState(initialEndDate || getLocalDateString(lastDayOfMonth));
    const [viewMode, setViewMode] = useState<string>(initialStartDate || initialEndDate ? 'Custom' : 'Monthly');
    const [carryOver, setCarryOver] = useState<boolean>(true);
    const [showTableFilters, setShowTableFilters] = useState(false);
    const [colFilters, setColFilters] = useState({ note: '', account: '', type: '', category: '' });
    const [isFormatMenuOpen, setIsFormatMenuOpen] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    if (!context) return null;
    const { transactions, accounts, categories, currency, theme } = context;

    const updateDatesForViewMode = (mode: string) => {
        if (mode === 'Custom') return;
        const now = new Date();
        let start: Date;
        let end: Date;
        switch (mode) {
            case 'Daily':
                start = now; end = now; break;
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
                start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
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

    const handleShiftPeriod = (direction: -1 | 1) => {
        if (viewMode === 'Custom') return;
        const currentStart = parseLocalDate(startDate);
        let newStart = parseLocalDate(startDate);
        let newEnd = parseLocalDate(endDate);

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

    const filteredTransactions = useMemo(() => {
        return transactions.filter(t => {
            const datePart = t.date.split('T')[0];
            if (startDate && endDate) {
                if (datePart < startDate || datePart > endDate) return false;
            }
            if (colFilters.note) {
                if (!t.note.toLowerCase().includes(colFilters.note.toLowerCase())) return false;
            }
            if (colFilters.account) {
                const accountName = accounts.find(a => a.id === t.accountId)?.name || '';
                if (accountName !== colFilters.account) return false;
            }
            if (colFilters.type) {
                if (t.type !== colFilters.type) return false;
            }
            if (colFilters.category) {
                const categoryName = t.type === 'transfer' ? 'Transfer' : (categories.find(c => c.id === t.categoryId)?.name || '');
                if (categoryName !== colFilters.category) return false;
            }
            return true;
        }).sort((a, b) => b.date.localeCompare(a.date));
    }, [transactions, startDate, endDate, colFilters, accounts, categories]);

    const rangeIncome = useMemo(() => filteredTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0), [filteredTransactions]);
    const rangeExpense = useMemo(() => filteredTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0), [filteredTransactions]);

    const preRangeBalance = useMemo(() => {
        if (!startDate) return 0;
        let incomeAndTransferIn = 0;
        let expenseAndTransferOut = 0;
        transactions.forEach(t => {
            const datePart = t.date.split('T')[0];
            if (datePart < startDate) {
                if (t.type === 'income') incomeAndTransferIn += t.amount;
                else if (t.type === 'expense') expenseAndTransferOut += t.amount;
                else if (t.type === 'transfer') { incomeAndTransferIn += t.amount; expenseAndTransferOut += t.amount; }
            }
        });
        const sumInitialBalances = accounts.reduce((sum, acc) => sum + acc.initialBalance, 0);
        return incomeAndTransferIn - expenseAndTransferOut + sumInitialBalances;
    }, [transactions, startDate, accounts]);

    const displayBalance = carryOver ? preRangeBalance + rangeIncome - rangeExpense : rangeIncome - rangeExpense;

    const buildExportRows = () => {
        return filteredTransactions.map((transaction: Transaction) => {
            const category = categories.find(c => c.id === transaction.categoryId);
            const account = accounts.find(a => a.id === transaction.accountId);
            const transferAccount = transaction.transferToAccountId ? accounts.find(a => a.id === transaction.transferToAccountId) : null;
            const timePart = transaction.date.includes('T') ? transaction.date.split('T')[1]?.slice(0, 5) : '';
            return {
                Date: formatTransactionDate(transaction.date),
                Time: timePart || '',
                Note: transaction.note,
                Amount: transaction.amount.toFixed(2),
                Account: account?.name || '',
                Type: transaction.type,
                Category: category?.name || (transaction.type === 'transfer' ? 'Transfer' : ''),
                'Transfer To': transferAccount?.name || '',
            };
        });
    };

    const exportCsv = () => {
        if (filteredTransactions.length === 0) {
            showToast('No transactions in this period to export', 'info');
            return;
        }
        const headers = ['Date', 'Time', 'Note', 'Amount', 'Account', 'Type', 'Category', 'Transfer To'];
        const rows = buildExportRows().map(row => headers.map(h => csvField((row as any)[h])));
        const csvContent = [headers.map(csvField).join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.href = url;
        link.download = `expensevision_export_${startDate}_to_${endDate}.csv`;
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        setIsFormatMenuOpen(false);
    };

    const exportExcel = async () => {
        if (filteredTransactions.length === 0) {
            showToast('No transactions in this period to export', 'info');
            return;
        }
        setIsExporting(true);
        try {
            const XLSX = await loadXlsx();
            const rows = buildExportRows();
            const worksheet = XLSX.utils.json_to_sheet(rows);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Transactions');
            XLSX.writeFile(workbook, `expensevision_export_${startDate}_to_${endDate}.xlsx`);
            setIsFormatMenuOpen(false);
        } catch (err: any) {
            console.error('Excel export failed:', err);
            showToast('Failed to generate Excel file.', 'error');
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Controls row */}
            <div className="flex flex-wrap justify-between items-center gap-4 border-b border-gray-100 dark:border-gray-800 pb-4">
                <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center bg-gray-100 dark:bg-gray-800 p-1 rounded-xl border border-gray-200 dark:border-gray-700">
                        {viewMode !== 'Custom' && (
                            <button onClick={() => handleShiftPeriod(-1)} className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400" title="Go back period">
                                <Icon name="ChevronLeft" size={14} />
                            </button>
                        )}
                        <label htmlFor="export-view-mode" className="text-[10px] font-bold text-gray-500 dark:text-gray-400 px-2 uppercase">View</label>
                        <select
                            id="export-view-mode"
                            value={viewMode}
                            onChange={(e) => { const mode = e.target.value; setViewMode(mode); updateDatesForViewMode(mode); }}
                            className="input text-xs py-1 px-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-800 dark:text-gray-200 cursor-pointer outline-none font-bold"
                        >
                            <option value="Daily">Daily</option>
                            <option value="Weekly">Weekly</option>
                            <option value="Monthly">Monthly</option>
                            <option value="3 Month">3 Month</option>
                            <option value="Yearly">Yearly</option>
                            <option value="Custom">Custom</option>
                        </select>
                        {viewMode !== 'Custom' && (
                            <button onClick={() => handleShiftPeriod(1)} className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400" title="Go forward period">
                                <Icon name="ChevronRight" size={14} />
                            </button>
                        )}
                    </div>

                    <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 p-1.5 rounded-xl border border-gray-200 dark:border-gray-700">
                        <label htmlFor="export-start-date" className="text-[10px] font-bold text-gray-500 dark:text-gray-400 px-1 uppercase">From</label>
                        <div className="flex items-center bg-white dark:bg-gray-700 px-2 py-0.5 rounded-lg border border-gray-200/60 dark:border-gray-600">
                            <input
                                type="date"
                                id="export-start-date"
                                ref={startDateRef}
                                value={startDate}
                                onChange={e => { setStartDate(e.target.value); setViewMode('Custom'); }}
                                className="bg-transparent border-none text-xs text-gray-900 dark:text-white outline-none w-28 py-0.5 font-semibold dark:[color-scheme:dark]"
                                style={{ colorScheme: theme }}
                            />
                            <button type="button" onClick={() => startDateRef.current?.showPicker?.()} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded text-gray-400 hover:text-gray-300 flex items-center justify-center">
                                <Icon name="Calendar" size={13} />
                            </button>
                        </div>
                        <label htmlFor="export-end-date" className="text-[10px] font-bold text-gray-500 dark:text-gray-400 px-1 uppercase">To</label>
                        <div className="flex items-center bg-white dark:bg-gray-700 px-2 py-0.5 rounded-lg border border-gray-200/60 dark:border-gray-600">
                            <input
                                type="date"
                                id="export-end-date"
                                ref={endDateRef}
                                value={endDate}
                                onChange={e => { setEndDate(e.target.value); setViewMode('Custom'); }}
                                className="bg-transparent border-none text-xs text-gray-900 dark:text-white outline-none w-28 py-0.5 font-semibold dark:[color-scheme:dark]"
                                style={{ colorScheme: theme }}
                            />
                            <button type="button" onClick={() => endDateRef.current?.showPicker?.()} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded text-gray-400 hover:text-gray-300 flex items-center justify-center">
                                <Icon name="Calendar" size={13} />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-1.5 rounded-xl text-gray-700 dark:text-gray-200">
                        <input
                            type="checkbox"
                            id="export-carryover-chk"
                            checked={carryOver}
                            onChange={e => setCarryOver(e.target.checked)}
                            className="w-3.5 h-3.5 text-primary rounded cursor-pointer border-gray-300 dark:border-gray-600 dark:bg-gray-700 focus:ring-primary"
                        />
                        <label htmlFor="export-carryover-chk" className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer select-none">
                            Carry Over
                        </label>
                    </div>

                    <div className="relative">
                        <button
                            onClick={() => setIsFormatMenuOpen(prev => !prev)}
                            disabled={isExporting}
                            className="btn btn-primary flex items-center gap-1.5 py-2 px-3.5 text-xs font-bold disabled:opacity-50"
                        >
                            <Icon name="Download" size={14} />
                            Export
                            <Icon name="ChevronDown" size={13} />
                        </button>
                        {isFormatMenuOpen && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setIsFormatMenuOpen(false)} />
                                <div className="absolute right-0 top-full mt-2 w-52 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden">
                                    <button onClick={exportCsv} className="w-full text-left px-4 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2">
                                        <Icon name="FileText" size={14} />
                                        Export as CSV
                                    </button>
                                    <button onClick={exportExcel} disabled={isExporting} className="w-full text-left px-4 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 disabled:opacity-50">
                                        <Icon name="FileSpreadsheet" size={14} />
                                        {isExporting ? 'Building Excel file...' : 'Export as Excel (.xlsx)'}
                                    </button>
                                    <button disabled className="w-full text-left px-4 py-2.5 text-sm font-semibold text-gray-400 dark:text-gray-600 flex items-center gap-2 cursor-not-allowed">
                                        <Icon name="FileText" size={14} />
                                        Export as PDF
                                        <span className="ml-auto text-[9px] font-bold uppercase bg-gray-100 dark:bg-gray-700 text-gray-400 px-1.5 py-0.5 rounded">Soon</span>
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex items-center p-6 bg-gradient-to-br from-rose-50 to-rose-100/50 dark:from-rose-950/20 dark:to-gray-800/40 border border-rose-200 dark:border-rose-900/30 shadow-sm rounded-xl">
                    <div className="w-12 h-12 rounded-xl bg-red-100/80 dark:bg-rose-950/40 flex items-center justify-center mr-4">
                        <Icon name="TrendingDown" className="text-danger dark:text-rose-400" size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-medium text-rose-700 dark:text-gray-300">Total Expense</p>
                        <p className="text-2xl font-bold mt-1 text-danger dark:text-rose-400">-{formatCurrency(rangeExpense, currency)}</p>
                    </div>
                </div>
                <div className="flex items-center p-6 bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/20 dark:to-gray-800/40 border border-emerald-200 dark:border-emerald-900/30 shadow-sm rounded-xl">
                    <div className="w-12 h-12 rounded-xl bg-green-100/80 dark:bg-emerald-950/40 flex items-center justify-center mr-4">
                        <Icon name="TrendingUp" className="text-success dark:text-emerald-400" size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-medium text-emerald-700 dark:text-gray-300">Total Income</p>
                        <p className="text-2xl font-bold mt-1 text-success dark:text-emerald-400">+{formatCurrency(rangeIncome, currency)}</p>
                    </div>
                </div>
                <div className="flex items-center p-6 bg-gradient-to-br from-blue-50 to-indigo-50/50 dark:from-indigo-950/20 dark:to-gray-800/40 border border-blue-200 dark:border-indigo-900/30 shadow-sm rounded-xl">
                    <div className="w-12 h-12 rounded-xl bg-primary-light dark:bg-primary/20 text-primary dark:text-indigo-300 flex items-center justify-center mr-4">
                        <Icon name="CircleDollarSign" size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-medium text-blue-700 dark:text-gray-300">{carryOver ? 'Balance (with Carry Over)' : 'Net Balance'}</p>
                        <p className="text-2xl font-bold mt-1 text-primary dark:text-indigo-400">{formatCurrency(displayBalance, currency)}</p>
                    </div>
                </div>
            </div>

            {/* Filter toggle + badge */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <button
                    onClick={() => setShowTableFilters(!showTableFilters)}
                    className={`flex items-center gap-1.5 py-1.5 px-3.5 rounded-xl text-xs font-bold transition-all border shadow-sm ${
                        showTableFilters ? 'bg-primary-hover border-primary-hover text-white' : 'bg-primary border-primary text-white hover:bg-primary-hover'
                    }`}
                >
                    <Icon name="SlidersHorizontal" size={14} />
                    <span>Filter</span>
                </button>
                <span className="text-xs font-bold text-primary bg-primary-light/60 dark:bg-primary/20 dark:text-indigo-300 border border-primary-light px-3 py-1.5 rounded-lg inline-block shadow-sm">
                    Showing <span className="font-extrabold">{filteredTransactions.length}</span> transactions from{' '}
                    <span className="font-extrabold">{isoDateToDisplay(startDate)}</span> to <span className="font-extrabold">{isoDateToDisplay(endDate)}</span>
                </span>
            </div>

            {/* Read-only table */}
            <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-xl">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-100 dark:bg-gray-900">
                        <tr>
                            <th className="px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider text-left">Date</th>
                            <th className="px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider text-left">Note</th>
                            <th className="px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider text-left">Amount</th>
                            <th className="px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider text-left">Account</th>
                            <th className="px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider text-left">Type</th>
                            <th className="px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider text-left">Category</th>
                            <th className="px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider text-left">Transfer To</th>
                        </tr>
                        {showTableFilters && (
                            <tr className="bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                                <th className="px-4 py-1.5"></th>
                                <th className="px-4 py-1.5">
                                    <input
                                        type="text"
                                        placeholder="Filter Note..."
                                        value={colFilters.note}
                                        onChange={e => setColFilters(prev => ({ ...prev, note: e.target.value }))}
                                        className="input text-xs py-1 px-2 w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md outline-none focus:ring-1 focus:ring-primary"
                                    />
                                </th>
                                <th className="px-4 py-1.5"></th>
                                <th className="px-4 py-1.5">
                                    <select
                                        value={colFilters.account}
                                        onChange={e => setColFilters(prev => ({ ...prev, account: e.target.value }))}
                                        className="input text-xs py-1 px-2 w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md outline-none cursor-pointer"
                                    >
                                        <option value="">All Accounts</option>
                                        {accounts.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
                                    </select>
                                </th>
                                <th className="px-4 py-1.5">
                                    <select
                                        value={colFilters.type}
                                        onChange={e => setColFilters(prev => ({ ...prev, type: e.target.value }))}
                                        className="input text-xs py-1 px-2 w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md outline-none cursor-pointer"
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
                                        className="input text-xs py-1 px-2 w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md outline-none cursor-pointer"
                                    >
                                        <option value="">All Categories</option>
                                        <option value="Transfer">Transfer</option>
                                        {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                    </select>
                                </th>
                                <th className="px-4 py-1.5 text-right">
                                    {(colFilters.note || colFilters.account || colFilters.type || colFilters.category) && (
                                        <button
                                            onClick={() => setColFilters({ note: '', account: '', type: '', category: '' })}
                                            className="text-xs text-rose-500 hover:text-rose-700 dark:text-rose-400 font-bold hover:underline"
                                        >
                                            Clear
                                        </button>
                                    )}
                                </th>
                            </tr>
                        )}
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-300 dark:bg-gray-800 dark:divide-gray-700">
                        {filteredTransactions.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                                    No transactions found matching the selected filters
                                </td>
                            </tr>
                        ) : filteredTransactions.map(transaction => {
                            const category = categories.find(c => c.id === transaction.categoryId);
                            const account = accounts.find(a => a.id === transaction.accountId);
                            const destAccount = accounts.find(a => a.id === transaction.transferToAccountId);
                            const isExpense = transaction.type === 'expense';
                            const isTransfer = transaction.type === 'transfer';
                            const amountColor = isTransfer ? 'text-gray-700 dark:text-gray-300' : isExpense ? 'text-danger' : 'text-success';
                            const prefix = isTransfer ? '' : isExpense ? '-' : '+';
                            return (
                                <tr key={transaction.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                    <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{formatTransactionDate(transaction.date, true)}</td>
                                    <td className="px-6 py-3 whitespace-nowrap text-sm font-medium text-gray-950 dark:text-gray-100 truncate max-w-xs" title={transaction.note}>{transaction.note}</td>
                                    <td className={`px-6 py-3 whitespace-nowrap text-sm font-bold ${amountColor}`}>{prefix}{formatCurrency(transaction.amount, currency)}</td>
                                    <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 font-medium">{account?.name}</td>
                                    <td className="px-6 py-3 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                            isExpense ? 'bg-red-200 text-red-800 dark:bg-red-500/20 dark:text-red-200' :
                                            isTransfer ? 'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-200' :
                                            'bg-green-200 text-green-800 dark:bg-green-500/20 dark:text-green-200'
                                        }`}>
                                            {transaction.type}
                                        </span>
                                    </td>
                                    <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold bg-gray-100 dark:bg-gray-700/60 text-gray-600 dark:text-gray-300">
                                            {isTransfer ? 'Transfer' : category?.name}
                                        </span>
                                    </td>
                                    <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 font-bold">
                                        {isTransfer && destAccount ? (
                                            <span className="inline-flex items-center gap-1 text-primary dark:text-indigo-400">
                                                <Icon name="ArrowRight" size={12} />
                                                {destAccount.name}
                                            </span>
                                        ) : (
                                            <span className="text-gray-300 dark:text-gray-600">—</span>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
