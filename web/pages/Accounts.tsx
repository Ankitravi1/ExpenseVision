import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppContext } from '../App';
import { Card } from '../components/Card';
import { Icon } from '../components/Icon';
import { Account, Category, Transaction } from '../types';
import { AddAccountModal } from '../components/AddAccountModal';
import { NewTransactionModal } from '../components/NewTransactionModal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { formatCurrency } from '../utils/currency';
import { formatDisplayDate } from '../utils/date';

interface AccountDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    account: Account;
    transactions: Transaction[];
    categories: Category[];
    currency: string;
    onEditTransaction: (t: Transaction) => void;
}

const AccountDetailsModal: React.FC<AccountDetailsModalProps> = ({
    isOpen,
    onClose,
    account,
    transactions,
    categories,
    currency,
    onEditTransaction
}) => {
    const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

    const accountTransactions = useMemo(() => {
        return transactions.filter(t => t.accountId === account.id || (t.type === 'transfer' && t.transferToAccountId === account.id));
    }, [transactions, account.id]);

    const groupedByMonth = useMemo(() => {
        const groups: Record<string, typeof accountTransactions> = {};
        accountTransactions.forEach(t => {
            const month = t.date.substring(0, 7); // "YYYY-MM"
            if (!groups[month]) {
                groups[month] = [];
            }
            groups[month].push(t);
        });
        return groups;
    }, [accountTransactions]);

    const sortedMonths = useMemo(() => {
        return Object.keys(groupedByMonth).sort((a, b) => {
            return sortOrder === 'desc' ? b.localeCompare(a) : a.localeCompare(b);
        });
    }, [groupedByMonth, sortOrder]);

    const formatMonthName = (monthStr: string) => {
        const [year, month] = monthStr.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1, 1);
        return date.toLocaleString('default', { month: 'long', year: 'numeric' });
    };

    if (!isOpen) return null;

    return (
        <>
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300 pointer-events-auto"
                onClick={onClose}
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl pointer-events-auto transform transition-all flex flex-col max-h-[85vh] overflow-hidden">
                    {/* Header */}
                    <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center shrink-0 bg-gray-100 dark:bg-gray-900">
                        <div>
                            <h3 className="text-xl font-bold text-gray-darkest dark:text-gray-100 flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                    <Icon name={account.icon || 'Wallet'} className="text-primary dark:text-indigo-400" size={18} />
                                </div>
                                {account.name}
                            </h3>
                            <div className="flex items-baseline gap-4 mt-2">
                                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium capitalize bg-gray-100 dark:bg-gray-700/60 px-2 py-0.5 rounded">
                                    {account.type}
                                </span>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-xs text-gray-400 dark:text-gray-500">Current:</span>
                                    <span className="text-xl font-black text-primary dark:text-indigo-400">{formatCurrency(account.balance, currency)}</span>
                                </div>
                                <div className="flex items-baseline gap-2 border-l border-gray-200 dark:border-gray-700 pl-3">
                                    <span className="text-xs text-gray-400 dark:text-gray-500">Initial:</span>
                                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400">{formatCurrency(account.initialBalance ?? 0, currency)}</span>
                                </div>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                            <Icon name="X" size={20} />
                        </button>
                    </div>

                    {/* Sorting Control */}
                    <div className="px-6 py-3 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/30">
                        <span className="text-xs font-bold text-gray-400 dark:text-gray-400 uppercase tracking-wider">
                            Transaction History ({accountTransactions.length})
                        </span>
                        <div className="flex items-center gap-2">
                            <label htmlFor="details-sort" className="text-xs text-gray-500 dark:text-gray-300 font-semibold">Sort by:</label>
                            <select
                                id="details-sort"
                                value={sortOrder}
                                onChange={(e) => setSortOrder(e.target.value as 'desc' | 'asc')}
                                className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-2.5 py-1 text-xs font-bold text-gray-700 dark:text-gray-200 outline-none focus:ring-1 focus:ring-primary focus:border-primary cursor-pointer"
                            >
                                <option value="desc">Newest to Oldest</option>
                                <option value="asc">Oldest to Newest</option>
                            </select>
                        </div>
                    </div>

                    {/* Records List */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        {accountTransactions.length === 0 ? (
                            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                                <Icon name="RefreshCw" size={48} className="mx-auto mb-3 opacity-30" />
                                <p className="text-base font-medium">No transactions recorded for this account</p>
                            </div>
                        ) : (
                            sortedMonths.map(monthStr => {
                                const monthTx = groupedByMonth[monthStr];
                                const sortedTx = [...monthTx].sort((a, b) => {
                                    return sortOrder === 'desc' ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date);
                                });

                                return (
                                    <div key={monthStr} className="space-y-3">
                                        <h4 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center justify-between border-b border-gray-100 dark:border-gray-700/60 pb-1.5">
                                            <span>{formatMonthName(monthStr)}</span>
                                            <span>{monthTx.length} {monthTx.length === 1 ? 'transaction' : 'transactions'}</span>
                                        </h4>
                                        <div className="divide-y divide-gray-100 dark:divide-gray-700/40">
                                            {sortedTx.map(t => {
                                                const category = categories.find(c => c.id === t.categoryId);
                                                const iconName = category?.icon || (t.type === 'transfer' ? 'ArrowLeftRight' : 'Wallet');
                                                const isIncoming = t.type === 'income' || (t.type === 'transfer' && t.transferToAccountId === account.id);
                                                const displayAmount = (isIncoming ? '+' : '-') + formatCurrency(t.amount, currency);

                                                return (
                                                    <div 
                                                        key={t.id} 
                                                        onClick={() => onEditTransaction(t)}
                                                        className="flex items-center justify-between py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700/80 cursor-pointer px-3 -mx-3 rounded-lg transition-colors group"
                                                        title="Click to Edit transaction"
                                                    >
                                                        <div className="flex items-center min-w-0 mr-4">
                                                            <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center mr-3 flex-shrink-0 group-hover:bg-primary-light dark:group-hover:bg-primary/20 transition-colors">
                                                                <Icon name={iconName} size={15} className="text-gray-600 dark:text-gray-300 group-hover:text-primary dark:group-hover:text-indigo-300 transition-colors" />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate group-hover:text-primary dark:group-hover:text-indigo-300 transition-colors">
                                                                    {t.note || (t.type === 'transfer' ? 'Transfer' : category?.name || 'Uncategorized')}
                                                                </p>
                                                                <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
                                                                    {formatDisplayDate(t.date, true)}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2 flex-shrink-0">
                                                            <span className={`text-sm font-bold ${isIncoming ? 'text-success' : 'text-danger'}`}>
                                                                {displayAmount}
                                                            </span>
                                                            <Icon name="Pencil" size={12} className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity ml-1.5 flex-shrink-0 text-primary dark:text-indigo-400" />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};

const AccountCard: React.FC<{
    account: Account;
    onEdit: () => void;
    onClick: () => void;
    onFreeze: () => void;
    onUnfreeze: () => void;
}> = ({ account, onEdit, onClick, onFreeze, onUnfreeze }) => {
    const { currency } = useContext(AppContext)!;
    const isNegative = account.balance < 0;
    const isFrozen = !!account.frozen;

    // Map standard types to icons, fallback to 'Wallet'
    const accountTypeIcons: Record<string, string> = {
        'Savings': 'PiggyBank',
        'Credit Card': 'CreditCard',
        'Cash': 'Wallet',
        'Investment': 'TrendingUp',
        'Loan': 'TrendingDown',
        'Other': 'Landmark'
    };

    // Use custom icon if provided, otherwise mapped icon, otherwise fallback
    const iconName = account.icon || accountTypeIcons[account.type] || 'Wallet';

    // Check if it's predefined to apply theme
    const isPredefined = ['Savings', 'Credit Card', 'Cash', 'Investment', 'Loan'].includes(account.type);

    let cardClass = "";
    let textClass = "text-gray-darkest dark:text-gray-100";
    let subtextClass = "text-gray-medium dark:text-gray-400";
    let borderClass = "border-gray-200 dark:border-gray-700";
    let iconBgClass = "bg-gray-light dark:bg-gray-700 text-gray-dark dark:text-gray-300";
    let dividerClass = "border-gray-100 dark:border-gray-700";

    if (isPredefined) {
        textClass = "text-white";
        subtextClass = "text-white/80";
        dividerClass = "border-white/20";
        iconBgClass = "bg-white/10 text-white";
        
        switch (account.type) {
            case 'Savings':
                cardClass = "bg-gradient-to-br from-indigo-600 to-blue-700 shadow-md text-white hover:brightness-105";
                break;
            case 'Credit Card':
                cardClass = "bg-gradient-to-br from-gray-800 via-gray-900 to-slate-950 shadow-md text-white hover:brightness-105";
                break;
            case 'Cash':
                cardClass = "bg-gradient-to-br from-teal-600 to-emerald-700 shadow-md text-white hover:brightness-105";
                break;
            case 'Investment':
                cardClass = "bg-gradient-to-br from-purple-600 to-indigo-700 shadow-md text-white hover:brightness-105";
                break;
            case 'Loan':
                cardClass = "bg-gradient-to-br from-rose-800 to-red-950 shadow-md text-white hover:brightness-105";
                break;
            default:
                cardClass = "bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700";
        }
    } else {
        // Plain Theme
        cardClass = "bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm";
    }

    return (
        <div onClick={onClick} className={`cursor-pointer h-full ${isFrozen ? 'opacity-60 hover:opacity-80 transition-opacity' : ''}`}>
            <div className={`rounded-2xl p-6 border ${borderClass} ${cardClass} flex flex-col h-full transition-all duration-300 pointer-events-auto relative`}>
                {isFrozen && (
                    <span className="absolute top-3 right-3 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200 dark:border-blue-900/60">
                        <Icon name="Snowflake" size={11} />
                        Frozen
                    </span>
                )}
                <div className="flex items-start justify-between mb-6">
                    <div className="min-w-0">
                        <h3 className={`font-bold text-lg truncate ${textClass}`}>{account.name}</h3>
                        <p className={`text-xs font-semibold ${subtextClass}`}>{account.type}</p>
                    </div>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBgClass}`}>
                        <Icon name={iconName} size={22} />
                    </div>
                </div>
                <div className={`mt-auto pt-4 border-t ${dividerClass} flex justify-between items-end`}>
                    <div>
                        <p className={`text-xs ${subtextClass}`}>Current Balance</p>
                        <p className={`text-2xl font-black tabular-nums tracking-tight mt-0.5 ${isNegative && !isPredefined ? 'text-danger' : textClass}`}>
                            {formatCurrency(account.balance, currency)}
                        </p>
                    </div>
                    <div className="flex items-center">
                        {isFrozen ? (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onUnfreeze();
                                }}
                                className={`p-2 transition-colors rounded-full hover:bg-white/10 ${isPredefined ? 'text-white/80 hover:text-white' : 'text-gray-400 hover:text-success'}`}
                                title="Unfreeze account"
                            >
                                <Icon name="Snowflake" size={18} />
                            </button>
                        ) : (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onFreeze();
                                }}
                                className={`p-2 transition-colors rounded-full hover:bg-white/10 ${isPredefined ? 'text-white/80 hover:text-white' : 'text-gray-400 hover:text-primary'}`}
                                title="Freeze account"
                            >
                                <Icon name="Lock" size={18} />
                            </button>
                        )}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onEdit();
                            }}
                            className={`p-2 transition-colors rounded-full hover:bg-white/10 ${isPredefined ? 'text-white/80 hover:text-white' : 'text-gray-400 hover:text-primary'}`}
                            title="Edit account"
                        >
                            <Icon name="Settings" size={18} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Long-press-then-drag reordering: a plain click must keep working, so a
// drag only "arms" after the pointer has been held (without moving much)
// for DRAG_ACTIVATE_MS. Moving too far before that fires cancels the arm
// entirely, so normal clicks/scrolling are never mistaken for drag intent.
const DRAG_ACTIVATE_MS = 550;
const DRAG_MOVE_THRESHOLD = 6;

export const Accounts: React.FC = () => {
    const { accounts, deleteAccount, updateAccount, reorderAccounts, transactions, categories, currency } = useContext(AppContext)!;
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editAccount, setEditAccount] = useState<Account | null>(null);
    const [selectedDetailAccount, setSelectedDetailAccount] = useState<Account | null>(null);
    const [showFrozen, setShowFrozen] = useState(false);
    const [freezeTarget, setFreezeTarget] = useState<Account | null>(null);

    // Edit transaction states
    const [editTransaction, setEditTransaction] = useState<Transaction | null>(null);
    const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);

    // Frozen accounts are paused everywhere: they're excluded from the active
    // grid and from the summary totals below. They only reappear via the
    // "Show frozen accounts" toggle, which is the sole way to find and
    // unfreeze one.
    const activeAccounts = useMemo(() => accounts.filter(a => !a.frozen), [accounts]);
    const frozenAccounts = useMemo(() => accounts.filter(a => a.frozen), [accounts]);

    // --- Drag-to-reorder (active accounts grid only) ---
    const [orderedAccounts, setOrderedAccounts] = useState<Account[]>(activeAccounts);
    const [draggingId, setDraggingId] = useState<string | null>(null);
    const [dragOverId, setDragOverId] = useState<string | null>(null);
    const isDraggingRef = useRef(false);
    const longPressTimerRef = useRef<number | null>(null);
    const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
    const suppressClickRef = useRef(false);

    // Mirror activeAccounts into local state whenever it changes (new/edited/
    // frozen accounts, or a server-confirmed reorder) — but never mid-drag,
    // or the live drag preview would be clobbered by a stale prop update.
    useEffect(() => {
        if (!isDraggingRef.current) setOrderedAccounts(activeAccounts);
    }, [activeAccounts]);

    const clearLongPressTimer = () => {
        if (longPressTimerRef.current !== null) {
            window.clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
    };

    const handleCardPointerDown = (e: React.PointerEvent<HTMLDivElement>, accountId: string) => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        // Buttons (Freeze/Edit) inside the card keep working exactly as before —
        // never arm a drag from a press that started on one of them.
        if ((e.target as HTMLElement).closest('button')) return;

        pointerStartRef.current = { x: e.clientX, y: e.clientY };
        clearLongPressTimer();
        longPressTimerRef.current = window.setTimeout(() => {
            isDraggingRef.current = true;
            suppressClickRef.current = true;
            setDraggingId(accountId);
            (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
        }, DRAG_ACTIVATE_MS);
    };

    const handleCardPointerMove = (e: React.PointerEvent<HTMLDivElement>, accountId: string) => {
        if (!isDraggingRef.current) {
            const start = pointerStartRef.current;
            if (start && (Math.abs(e.clientX - start.x) > DRAG_MOVE_THRESHOLD || Math.abs(e.clientY - start.y) > DRAG_MOVE_THRESHOLD)) {
                clearLongPressTimer();
            }
            return;
        }

        const target = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>('[data-account-id]');
        const targetId = target?.dataset.accountId;
        setDragOverId(targetId || null);
        if (!targetId || targetId === accountId) return;

        setOrderedAccounts(prev => {
            const fromIndex = prev.findIndex(a => a.id === accountId);
            const toIndex = prev.findIndex(a => a.id === targetId);
            if (fromIndex === -1 || toIndex === -1) return prev;
            const next = [...prev];
            const [moved] = next.splice(fromIndex, 1);
            next.splice(toIndex, 0, moved);
            return next;
        });
    };

    const endDrag = () => {
        clearLongPressTimer();
        if (isDraggingRef.current) {
            isDraggingRef.current = false;
            setDraggingId(null);
            setDragOverId(null);
            reorderAccounts(orderedAccounts.map(a => a.id));
            // The click that natively follows pointerup after a drag must not
            // reopen the account details modal — swallow just that one click.
            setTimeout(() => { suppressClickRef.current = false; }, 0);
        } else {
            suppressClickRef.current = false;
        }
    };

    const totalBalance = useMemo(() => activeAccounts.reduce((sum, acc) => sum + acc.balance, 0), [activeAccounts]);

    const allTimeExpenses = useMemo(() => {
        return transactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);
    }, [transactions]);

    const allTimeIncome = useMemo(() => {
        return transactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0);
    }, [transactions]);

    const handleEdit = (account: Account) => {
        setEditAccount(account);
        setIsModalOpen(true);
    };

    const handleAdd = () => {
        setEditAccount(null);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        await deleteAccount(id);
        setIsModalOpen(false);
    };

    const handleUnfreeze = async (account: Account) => {
        await updateAccount(account.id, { frozen: false });
    };

    return (
        <>
            <div className="space-y-6">
                {/* 
                  Swapped Cards Order:
                  1st Expense so far (left)
                  2nd Income so far (middle)
                  3rd Combined Balance (right)
                */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="flex items-center p-6 bg-gradient-to-br from-red-50/30 to-rose-50/10 dark:from-rose-950/20 dark:to-gray-800/40">
                        <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-rose-950/40 flex items-center justify-center mr-4">
                            <Icon name="TrendingDown" className="text-danger dark:text-rose-400" size={24} />
                        </div>
                        <div>
                            <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Expense so far</h4>
                            <p className="text-2xl font-bold mt-1 text-danger dark:text-rose-400">
                                {formatCurrency(allTimeExpenses, currency)}
                            </p>
                        </div>
                    </Card>

                    <Card className="flex items-center p-6 bg-gradient-to-br from-green-50/30 to-emerald-50/10 dark:from-emerald-950/20 dark:to-gray-800/40">
                        <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-emerald-950/40 flex items-center justify-center mr-4">
                            <Icon name="TrendingUp" className="text-success dark:text-emerald-400" size={24} />
                        </div>
                        <div>
                            <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Income so far</h4>
                            <p className="text-2xl font-bold mt-1 text-success dark:text-emerald-400">
                                {formatCurrency(allTimeIncome, currency)}
                            </p>
                        </div>
                    </Card>

                    <Card className="flex items-center p-6 bg-gradient-to-br from-primary-light/30 to-indigo-50/10 dark:from-indigo-950/20 dark:to-gray-800/40">
                        <div className="w-12 h-12 rounded-xl bg-primary-light dark:bg-primary/20 flex items-center justify-center mr-4">
                            <Icon name="Landmark" className="text-primary dark:text-indigo-300" size={24} />
                        </div>
                        <div>
                            <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Combined Balance</h4>
                            <p className="text-2xl font-bold mt-1 text-primary dark:text-indigo-400">
                                {formatCurrency(totalBalance, currency)}
                            </p>
                        </div>
                    </Card>
                </div>

                <div>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-bold text-gray-darkest dark:text-gray-100">My Accounts</h3>
                        <button
                            onClick={handleAdd}
                            className="btn btn-primary flex items-center gap-2"
                        >
                            <Icon name="Plus" size={18} />
                            Add Account
                        </button>
                    </div>

                    {accounts.length === 0 ? (
                        <Card className="flex flex-col items-center justify-center text-center py-16">
                            <div className="w-16 h-16 rounded-2xl bg-primary-light dark:bg-primary/20 flex items-center justify-center mb-4">
                                <Icon name="Landmark" className="text-primary dark:text-indigo-400" size={32} />
                            </div>
                            <h4 className="text-lg font-bold text-gray-darkest dark:text-gray-100">No accounts yet</h4>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-xs">
                                Add your first account using the <span className="font-semibold">Add Account</span> button above to start tracking balances.
                            </p>
                        </Card>
                    ) : activeAccounts.length === 0 ? (
                        <Card className="flex flex-col items-center justify-center text-center py-16">
                            <div className="w-16 h-16 rounded-2xl bg-primary-light dark:bg-primary/20 flex items-center justify-center mb-4">
                                <Icon name="Snowflake" className="text-primary dark:text-indigo-400" size={32} />
                            </div>
                            <h4 className="text-lg font-bold text-gray-darkest dark:text-gray-100">All accounts are frozen</h4>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-xs">
                                Use "Show frozen accounts" below to unfreeze one.
                            </p>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {orderedAccounts.map(account => (
                                <div
                                    key={account.id}
                                    data-account-id={account.id}
                                    title="Press and hold, then drag to reorder"
                                    onPointerDown={e => handleCardPointerDown(e, account.id)}
                                    onPointerMove={e => handleCardPointerMove(e, account.id)}
                                    onPointerUp={endDrag}
                                    onPointerCancel={endDrag}
                                    style={{ touchAction: draggingId ? 'none' : undefined }}
                                    className={`transition-transform duration-150 select-none ${
                                        draggingId === account.id ? 'scale-[1.03] shadow-2xl z-10 cursor-grabbing' : ''
                                    } ${
                                        dragOverId === account.id && draggingId !== account.id ? 'ring-2 ring-primary ring-offset-2 dark:ring-offset-gray-900 rounded-2xl' : ''
                                    }`}
                                >
                                    <AccountCard
                                        account={account}
                                        onEdit={() => handleEdit(account)}
                                        onClick={() => {
                                            if (suppressClickRef.current) return;
                                            setSelectedDetailAccount(account);
                                        }}
                                        onFreeze={() => setFreezeTarget(account)}
                                        onUnfreeze={() => handleUnfreeze(account)}
                                    />
                                </div>
                            ))}
                        </div>
                    )}

                    {frozenAccounts.length > 0 && (
                        <div className="mt-4">
                            <button
                                onClick={() => setShowFrozen(v => !v)}
                                className="flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary-600 hover:underline transition-colors"
                            >
                                <Icon name={showFrozen ? 'ChevronUp' : 'ChevronDown'} size={16} />
                                <span>{showFrozen ? 'Hide' : 'Show'} frozen accounts ({frozenAccounts.length})</span>
                            </button>

                            {showFrozen && (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
                                    {frozenAccounts.map(account => (
                                        <AccountCard
                                            key={account.id}
                                            account={account}
                                            onEdit={() => handleEdit(account)}
                                            onClick={() => setSelectedDetailAccount(account)}
                                            onFreeze={() => setFreezeTarget(account)}
                                            onUnfreeze={() => handleUnfreeze(account)}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <AddAccountModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                account={editAccount || undefined}
                onDelete={handleDelete}
            />

            <ConfirmDialog
                isOpen={!!freezeTarget}
                onClose={() => setFreezeTarget(null)}
                onConfirm={() => {
                    if (freezeTarget) updateAccount(freezeTarget.id, { frozen: true });
                }}
                title="Freeze Account"
                message={`Freeze "${freezeTarget?.name || 'this account'}"? While frozen, it won't accept new transactions or recurring rules, and it will be excluded from balance totals until you unfreeze it.`}
                confirmText="Freeze"
                cancelText="Cancel"
                variant="warning"
            />

            {selectedDetailAccount && (
                <AccountDetailsModal
                    isOpen={!!selectedDetailAccount}
                    onClose={() => setSelectedDetailAccount(null)}
                    account={selectedDetailAccount}
                    transactions={transactions}
                    categories={categories}
                    currency={currency}
                    onEditTransaction={(t) => {
                        setSelectedDetailAccount(null);
                        setEditTransaction(t);
                        setIsTransactionModalOpen(true);
                    }}
                />
            )}

            {isTransactionModalOpen && editTransaction && (
                <NewTransactionModal
                    isOpen={isTransactionModalOpen}
                    onClose={() => {
                        setIsTransactionModalOpen(false);
                        setEditTransaction(null);
                    }}
                    transaction={editTransaction}
                />
            )}
        </>
    );
};
