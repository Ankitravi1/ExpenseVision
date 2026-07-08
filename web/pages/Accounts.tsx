import React, { useContext, useMemo, useState } from 'react';
import { AppContext } from '../App';
import { Card } from '../components/Card';
import { Icon } from '../components/Icon';
import { Account, Category, Transaction } from '../types';
import { AddAccountModal } from '../components/AddAccountModal';
import { formatCurrency } from '../utils/currency';

interface AccountDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    account: Account;
    transactions: Transaction[];
    categories: Category[];
    currency: string;
}

const AccountDetailsModal: React.FC<AccountDetailsModalProps> = ({
    isOpen,
    onClose,
    account,
    transactions,
    categories,
    currency
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
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300"
                onClick={onClose}
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl pointer-events-auto transform transition-all flex flex-col max-h-[85vh] overflow-hidden">
                    {/* Header */}
                    <div className="p-6 border-b border-gray-150 dark:border-gray-700 flex justify-between items-center shrink-0 bg-gray-50/50 dark:bg-gray-800/50">
                        <div>
                            <h3 className="text-xl font-bold text-gray-darkest dark:text-gray-50 flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                    <Icon name={account.icon || 'Wallet'} className="text-primary dark:text-indigo-400" size={18} />
                                </div>
                                {account.name}
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {account.type} • Balance: <span className="font-semibold">{formatCurrency(account.balance, currency)}</span>
                            </p>
                        </div>
                        <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                            <Icon name="X" size={20} />
                        </button>
                    </div>

                    {/* Sorting Control */}
                    <div className="px-6 py-3 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-white dark:bg-gray-850">
                        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Transaction History ({accountTransactions.length})
                        </span>
                        <div className="flex items-center gap-2">
                            <label htmlFor="details-sort" className="text-xs text-gray-500 dark:text-gray-400">Sort by:</label>
                            <select
                                id="details-sort"
                                value={sortOrder}
                                onChange={(e) => setSortOrder(e.target.value as 'desc' | 'asc')}
                                className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-2.5 py-1 text-xs font-medium text-gray-700 dark:text-gray-200 outline-none focus:ring-1 focus:ring-primary focus:border-primary cursor-pointer"
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
                                <Icon name="History" size={48} className="mx-auto mb-3 opacity-30" />
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
                                                const iconName = category?.icon || (t.type === 'transfer' ? 'ArrowRightLeft' : 'Wallet');
                                                const isIncoming = t.type === 'income' || (t.type === 'transfer' && t.transferToAccountId === account.id);
                                                const displayAmount = (isIncoming ? '+' : '-') + formatCurrency(t.amount, currency);

                                                return (
                                                    <div key={t.id} className="flex items-center justify-between py-2.5 hover:bg-gray-50/50 dark:hover:bg-gray-750/30 px-2 rounded-lg transition-colors">
                                                        <div className="flex items-center min-w-0 mr-4">
                                                            <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center mr-3 flex-shrink-0">
                                                                <Icon name={iconName} size={15} className="text-gray-500 dark:text-gray-400" />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">
                                                                    {t.note || (t.type === 'transfer' ? 'Transfer' : category?.name || 'Uncategorized')}
                                                                </p>
                                                                <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
                                                                    {t.date}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <span className={`text-sm font-bold flex-shrink-0 ${isIncoming ? 'text-success' : 'text-danger'}`}>
                                                            {displayAmount}
                                                        </span>
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

const AccountCard: React.FC<{ account: Account; onEdit: () => void; onClick: () => void }> = ({ account, onEdit, onClick }) => {
    const { currency } = useContext(AppContext)!;
    const isNegative = account.balance < 0;

    // Map standard types to icons, fallback to 'Wallet'
    const accountTypeIcons: Record<string, string> = {
        'Checking': 'Landmark',
        'Savings': 'PiggyBank',
        'Credit Card': 'CreditCard',
        'Cash': 'Wallet',
        'Asset': 'TrendingUp',
        'Liability': 'TrendingDown'
    }

    // Use custom icon if provided, otherwise mapped icon, otherwise fallback
    const iconName = account.icon || accountTypeIcons[account.type] || 'Wallet';

    return (
        <div onClick={onClick} className="cursor-pointer">
            <Card className="flex flex-col h-full hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600 transition-all">
                <div className="flex items-start justify-between mb-6">
                    <div>
                        <h3 className="font-semibold text-lg text-gray-darkest dark:text-gray-100">{account.name}</h3>
                        <p className="text-gray-medium dark:text-gray-400 text-sm">{account.type}</p>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-gray-light flex items-center justify-center dark:bg-gray-700">
                        <Icon name={iconName} className="text-gray-dark dark:text-gray-300" size={22} />
                    </div>
                </div>
                <div className="mt-auto pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-between items-end">
                    <div>
                        <p className="text-sm text-gray-medium dark:text-gray-400">Current Balance</p>
                        <p className={`text-2xl font-bold ${isNegative ? 'text-danger' : 'text-gray-darkest dark:text-gray-50'}`}>
                            {formatCurrency(account.balance, currency)}
                        </p>
                    </div>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onEdit();
                        }}
                        className="p-2 text-gray-400 hover:text-primary dark:hover:text-primary-light transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                        title="Edit account"
                    >
                        <Icon name="Settings" size={18} />
                    </button>
                </div>
            </Card>
        </div>
    )
}

export const Accounts: React.FC = () => {
    const { accounts, deleteAccount, transactions, categories, currency } = useContext(AppContext)!;
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editAccount, setEditAccount] = useState<Account | null>(null);
    const [selectedDetailAccount, setSelectedDetailAccount] = useState<Account | null>(null);

    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const totalBalance = useMemo(() => accounts.reduce((sum, acc) => sum + acc.balance, 0), [accounts]);

    const currentMonthExpenses = useMemo(() => {
        return transactions
            .filter(t => t.type === 'expense' && t.date.startsWith(currentMonthStr))
            .reduce((sum, t) => sum + t.amount, 0);
    }, [transactions, currentMonthStr]);

    const currentMonthIncome = useMemo(() => {
        return transactions
            .filter(t => t.type === 'income' && t.date.startsWith(currentMonthStr))
            .reduce((sum, t) => sum + t.amount, 0);
    }, [transactions, currentMonthStr]);

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

    return (
        <>
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="flex items-center p-6 bg-gradient-to-br from-primary-light/30 to-indigo-50/10 dark:from-indigo-950/20 dark:to-gray-800/40">
                        <div className="w-12 h-12 rounded-xl bg-primary-light dark:bg-primary/20 flex items-center justify-center mr-4">
                            <Icon name="Landmark" className="text-primary dark:text-indigo-300" size={24} />
                        </div>
                        <div>
                            <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Combined Balance</h4>
                            <p className={`text-2xl font-bold mt-1 ${totalBalance < 0 ? 'text-danger' : 'text-gray-darkest dark:text-gray-50'}`}>
                                {formatCurrency(totalBalance, currency)}
                            </p>
                        </div>
                    </Card>

                    <Card className="flex items-center p-6 bg-gradient-to-br from-green-50/30 to-emerald-50/10 dark:from-emerald-950/20 dark:to-gray-800/40">
                        <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-emerald-950/40 flex items-center justify-center mr-4">
                            <Icon name="TrendingUp" className="text-success dark:text-emerald-400" size={24} />
                        </div>
                        <div>
                            <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Income (This Month)</h4>
                            <p className="text-2xl font-bold mt-1 text-success dark:text-emerald-400">
                                {formatCurrency(currentMonthIncome, currency)}
                            </p>
                        </div>
                    </Card>

                    <Card className="flex items-center p-6 bg-gradient-to-br from-red-50/30 to-rose-50/10 dark:from-rose-950/20 dark:to-gray-800/40">
                        <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-rose-950/40 flex items-center justify-center mr-4">
                            <Icon name="TrendingDown" className="text-danger dark:text-rose-400" size={24} />
                        </div>
                        <div>
                            <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Expenses (This Month)</h4>
                            <p className="text-2xl font-bold mt-1 text-danger dark:text-rose-400">
                                {formatCurrency(currentMonthExpenses, currency)}
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
                            <Icon name="Plus" size={20} />
                            Add Account
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {accounts.map(account => (
                            <AccountCard
                                key={account.id}
                                account={account}
                                onEdit={() => handleEdit(account)}
                                onClick={() => setSelectedDetailAccount(account)}
                            />
                        ))}
                    </div>
                </div>
            </div>

            <AddAccountModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                account={editAccount || undefined}
                onDelete={editAccount ? handleDelete : undefined}
            />

            {selectedDetailAccount && (
                <AccountDetailsModal
                    isOpen={true}
                    onClose={() => setSelectedDetailAccount(null)}
                    account={selectedDetailAccount}
                    transactions={transactions}
                    categories={categories}
                    currency={currency}
                />
            )}
        </>
    );
};
