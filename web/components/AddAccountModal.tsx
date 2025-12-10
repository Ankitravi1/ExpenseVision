
import React, { useState, useContext, useEffect } from 'react';
import { AppContext } from '../App';
import { Icon, iconList } from './Icon';
import { AccountType } from '../types';
import { getCurrencySymbol } from '../utils/currency';

interface AddAccountModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const predefinedAccountTypes: { type: AccountType; icon: string; label: string }[] = [
    { type: 'Checking', icon: 'Landmark', label: 'Checking' },
    { type: 'Savings', icon: 'PiggyBank', label: 'Savings' },
    { type: 'Credit Card', icon: 'CreditCard', label: 'Credit Card' },
    { type: 'Cash', icon: 'Wallet', label: 'Cash' },
    { type: 'Asset', icon: 'TrendingUp', label: 'Asset' },
    { type: 'Liability', icon: 'TrendingDown', label: 'Loan' },
];

export const AddAccountModal: React.FC<AddAccountModalProps> = ({ isOpen, onClose, account, onDelete }) => { // Modified
    const context = useContext(AppContext);
    const [name, setName] = useState('');
    const [balance, setBalance] = useState('');
    const [selectedType, setSelectedType] = useState<string>('Checking');
    const [customTypeName, setCustomTypeName] = useState('');
    const [selectedIcon, setSelectedIcon] = useState('Wallet');
    const [showIconPicker, setShowIconPicker] = useState(false);

    useEffect(() => {
        if (isOpen) { // Only reset/fill when modal opens
            if (account) {
                setName(account.name);
                setBalance(account.balance.toString());

                const isPredefined = predefinedAccountTypes.some(t => t.type === account.type);
                if (isPredefined) {
                    setSelectedType(account.type);
                    setCustomTypeName('');
                    setSelectedIcon(predefinedAccountTypes.find(t => t.type === account.type)?.icon || 'Wallet');
                } else {
                    setSelectedType('Custom');
                    setCustomTypeName(account.type);
                    setSelectedIcon(account.icon || 'Wallet');
                }
            } else {
                // Reset form for new account
                setName('');
                setBalance('');
                setSelectedType('Checking');
                setCustomTypeName('');
                setSelectedIcon('Wallet');
                setShowIconPicker(false);
            }
        }
    }, [account, isOpen]); // Dependency array includes account and isOpen

    if (!context) return null;
    const { addAccount, updateAccount, currency } = context; // Added updateAccount

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !balance) return;

        const finalType = selectedType === 'Custom' ? customTypeName : selectedType;
        const finalIcon = selectedType === 'Custom' ? selectedIcon : (predefinedAccountTypes.find(t => t.type === selectedType)?.icon || 'Wallet');

        const accountData = {
            name,
            balance: parseFloat(balance),
            type: finalType || 'Custom',
            icon: finalIcon
        };

        if (account) {
            updateAccount(account.id, accountData); // Handle update
        } else {
            addAccount(accountData); // Handle add
        }

        // Reset form (for add or after update)
        setName('');
        setBalance('');
        setSelectedType('Checking');
        setCustomTypeName('');
        setSelectedIcon('Wallet');
        setShowIconPicker(false);
        onClose();
    };

    const inputStyles = "mt-1 block w-full bg-gray-100 border-transparent rounded-lg p-3 focus:ring-2 focus:ring-primary focus:bg-white text-base dark:bg-gray-700 dark:text-gray-100 dark:focus:bg-gray-600";
    const labelStyles = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";

    if (!isOpen) return null;

    return (
        <>
            <div
                className={`fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={onClose}
            />
            <div
                className={`fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none ${isOpen ? 'opacity-100' : 'opacity-0'}`}
            >
                <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md pointer-events-auto transform transition-all ${isOpen ? 'scale-100' : 'scale-95'} flex flex-col max-h-[90vh]`}>
                    <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center shrink-0">
                        <h3 className="text-xl font-bold dark:text-gray-50">{account ? 'Edit Account' : 'Add New Account'}</h3> {/* Modified title */}
                        <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                            <Icon name="X" size={24} />
                        </button>
                    </div>
                    <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
                        <div>
                            <label className={labelStyles}>Account Type</label>
                            <div className="grid grid-cols-3 gap-2 mt-2">
                                {predefinedAccountTypes.map(t => (
                                    <div
                                        key={t.type}
                                        onClick={() => setSelectedType(t.type)}
                                        className={`cursor-pointer border rounded-lg p-2 flex flex-col items-center justify-center space-y-1 transition-colors ${selectedType === t.type ? 'border-primary bg-primary-light/20 text-primary' : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                                    >
                                        <Icon name={t.icon} size={20} />
                                        <span className="text-[10px] font-medium text-center">{t.label}</span>
                                    </div>
                                ))}
                                <div
                                    onClick={() => setSelectedType('Custom')}
                                    className={`cursor-pointer border rounded-lg p-2 flex flex-col items-center justify-center space-y-1 transition-colors ${selectedType === 'Custom' ? 'border-primary bg-primary-light/20 text-primary' : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                                >
                                    <Icon name="Settings" size={20} />
                                    <span className="text-[10px] font-medium text-center">Custom</span>
                                </div>
                            </div>
                        </div>

                        {selectedType === 'Custom' && (
                            <div className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg border border-gray-100 dark:border-gray-700 space-y-3">
                                <div>
                                    <label className={labelStyles}>Custom Type Name</label>
                                    <input
                                        type="text"
                                        value={customTypeName}
                                        onChange={e => setCustomTypeName(e.target.value)}
                                        placeholder="e.g. Crypto Wallet"
                                        className={inputStyles}
                                        required={selectedType === 'Custom'}
                                    />
                                </div>
                                <div>
                                    <label className={labelStyles}>Icon</label>
                                    <div className="flex items-center space-x-3">
                                        <div className="w-12 h-12 rounded-lg bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                                            <Icon name={selectedIcon} size={24} />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setShowIconPicker(!showIconPicker)}
                                            className="text-sm text-primary hover:text-primary-hover font-medium"
                                        >
                                            {showIconPicker ? 'Close Picker' : 'Choose Icon'}
                                        </button>
                                    </div>
                                    {showIconPicker && (
                                        <div className="mt-2 grid grid-cols-6 gap-2 p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg h-32 overflow-y-auto">
                                            {iconList.map(iconName => (
                                                <button
                                                    key={iconName}
                                                    type="button"
                                                    onClick={() => { setSelectedIcon(iconName); setShowIconPicker(false); }}
                                                    className={`p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 flex justify-center ${selectedIcon === iconName ? 'bg-primary-light text-primary' : ''}`}
                                                >
                                                    <Icon name={iconName} size={18} />
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        <div>
                            <label htmlFor="accountName" className={labelStyles}>Account Name</label>
                            <input
                                type="text"
                                id="accountName"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="e.g. My Secret Stash"
                                className={inputStyles}
                                required
                            />
                        </div>

                        <div>
                            <label htmlFor="initialBalance" className={labelStyles}>Initial Balance</label>
                            <div className="relative">
                                <span className="absolute left-3 top-3.5 text-gray-500">{getCurrencySymbol(currency)}</span>
                                <input
                                    type="number"
                                    id="initialBalance"
                                    value={balance}
                                    onChange={e => setBalance(e.target.value)}
                                    placeholder="0.00"
                                    step="0.01"
                                    className={`${inputStyles} pl-8`}
                                    required
                                />
                            </div>
                        </div>

                        <div className="pt-2">
                            <button type="submit" className="w-full bg-primary text-white font-semibold px-4 py-3 rounded-lg shadow-sm hover:bg-primary-hover transition-colors">
                                {account ? 'Save Changes' : 'Create Account'}
                            </button>
                            {account && onDelete && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (window.confirm('Are you sure you want to delete this account?')) {
                                            onDelete(account.id);
                                            onClose();
                                        }
                                    }}
                                    className="mt-3 w-full bg-red-50 text-red-600 font-semibold px-4 py-3 rounded-lg shadow-sm hover:bg-red-100 transition-colors dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30"
                                >
                                    Delete Account
                                </button>
                            )}
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
};
