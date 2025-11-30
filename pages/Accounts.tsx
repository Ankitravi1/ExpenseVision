
import React, { useContext, useMemo, useState } from 'react';
import { AppContext } from '../App';
import { Card } from '../components/Card';
import { Icon } from '../components/Icon';
import { Account } from '../types';
import { AddAccountModal } from '../components/AddAccountModal';
import { formatCurrency } from '../utils/currency';

const AccountCard: React.FC<{ account: Account; onEdit: () => void }> = ({ account, onEdit }) => {
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
                        {formatCurrency(account.balance, currency)}
                    </p>
                </div>
                <button
                    onClick={onEdit}
                    className="p-2 text-gray-400 hover:text-primary dark:hover:text-primary-light transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                    title="Edit account"
                >
                    <Icon name="Edit2" size={18} />
                </button>
            </div>
        </Card>
    )
}

export const Accounts: React.FC = () => {
    const { accounts, deleteAccount, currency } = useContext(AppContext)!;
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editAccount, setEditAccount] = useState<Account | null>(null);

    const totalBalance = useMemo(() => accounts.reduce((sum, acc) => sum + acc.balance, 0), [accounts]);

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
                <Card>
                    <h3 className="text-gray-medium font-medium dark:text-gray-400">Total Net Worth</h3>
                    <p className={`text-4xl font-bold mt-2 ${totalBalance < 0 ? 'text-danger' : 'text-gray-darkest dark:text-gray-50'}`}>
                        {formatCurrency(totalBalance, currency)}
                    </p>
                    <p className="text-success font-semibold text-sm mt-2">+2.5% this month</p>
                </Card>

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
        </>
    );
};
