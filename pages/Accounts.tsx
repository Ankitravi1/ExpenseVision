
import React, { useContext, useMemo, useState } from 'react';
import { AppContext } from '../App';
import { Card } from '../components/Card';
import { Icon } from '../components/Icon';
import { Account, AccountType } from '../types';
import { AddAccountModal } from '../components/AddAccountModal';
import { ConfirmDialog } from '../components/ConfirmDialog';

const AccountCard: React.FC<{ account: Account; onDelete: () => void }> = ({ account, onDelete }) => {
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
        <Card className="flex flex-col h-full">
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
                        ₹{account.balance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                </div>
                <button
                    onClick={onDelete}
                    className="p-2 text-gray-400 hover:text-danger dark:hover:text-red-400 transition-colors rounded-full hover:bg-red-50 dark:hover:bg-red-900/20"
                    title="Delete account"
                >
                    <Icon name="Trash2" size={18} />
                </button>
            </div>
        </Card>
    )
}

export const Accounts: React.FC = () => {
    const { accounts, deleteAccount } = useContext(AppContext)!;
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; accountId: string | null }>({ isOpen: false, accountId: null });

    const totalBalance = useMemo(() => accounts.reduce((sum, acc) => sum + acc.balance, 0), [accounts]);

    const handleDelete = (id: string) => {
        setDeleteConfirm({ isOpen: true, accountId: id });
    };

    const confirmDelete = () => {
        if (deleteConfirm.accountId) {
            deleteAccount(deleteConfirm.accountId);
        }
    };

    return (
        <>
            <div className="space-y-6">
                <Card>
                    <h3 className="text-gray-medium font-medium dark:text-gray-400">Total Net Worth</h3>
                    <p className={`text-4xl font-bold mt-2 ${totalBalance < 0 ? 'text-danger' : 'text-gray-darkest dark:text-gray-50'}`}>
                        ₹{totalBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-success font-semibold text-sm mt-2">+2.5% this month</p>
                </Card>

                <div>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-bold text-gray-darkest dark:text-gray-100">My Accounts</h3>
                        <button
                            onClick={() => setIsModalOpen(true)}
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
                                onDelete={() => handleDelete(account.id)}
                            />
                        ))}
                    </div>
                </div>
            </div>

            <AddAccountModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />

            <ConfirmDialog
                isOpen={deleteConfirm.isOpen}
                onClose={() => setDeleteConfirm({ isOpen: false, accountId: null })}
                onConfirm={confirmDelete}
                title="Delete Account"
                message="Are you sure you want to delete this account? You cannot delete accounts that have transactions."
                confirmText="Delete"
                cancelText="Cancel"
                variant="danger"
            />
        </>
    );
};
