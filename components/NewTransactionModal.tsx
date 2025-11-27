
import React, { useState, useContext, useEffect } from 'react';
import { AppContext } from '../App';
import { Icon } from './Icon';
import { TransactionType } from '../types';
import { getCurrencySymbol, formatCurrency } from '../utils/currency';

interface NewTransactionModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const NewTransactionModal: React.FC<NewTransactionModalProps> = ({ isOpen, onClose }) => {
    const context = useContext(AppContext);

    const [type, setType] = useState<TransactionType>('expense');
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [time, setTime] = useState(new Date().toTimeString().slice(0, 5));
    const [accountId, setAccountId] = useState(''); // From Account (Expense/Transfer) or To Account (Income)
    const [transferToAccountId, setTransferToAccountId] = useState(''); // Only for Transfer
    const [categoryId, setCategoryId] = useState('');
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    useEffect(() => {
        if (context?.accounts && context.accounts.length > 0 && !accountId) {
            setAccountId(context.accounts[0].id);
        }
        if (context?.accounts && context.accounts.length > 1 && !transferToAccountId) {
            setTransferToAccountId(context.accounts[1].id);
        }
    }, [context?.accounts, accountId, transferToAccountId]);

    useEffect(() => {
        if (context?.categories && type !== 'transfer') {
            const firstCat = context.categories.find(c => c.type === type);
            if (firstCat) setCategoryId(firstCat.id);
        }
    }, [context?.categories, type]);

    if (!isMounted || !context) return null;

    const { accounts, categories, addTransaction, currency } = context;

    const filteredCategories = categories.filter(c => c.type === type);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!amount || !description || !accountId) {
            alert("Please fill required fields.");
            return;
        }

        if (type === 'transfer' && !transferToAccountId) {
            alert("Please select a destination account.");
            return;
        }

        if (type !== 'transfer' && !categoryId) {
            alert("Please select a category.");
            return;
        }

        if (type === 'transfer' && accountId === transferToAccountId) {
            alert("Source and destination accounts cannot be the same.");
            return;
        }

        const dateTimeString = `${date}T${time}`;

        addTransaction({
            date: dateTimeString,
            description,
            amount: parseFloat(amount),
            type,
            categoryId: type === 'transfer' ? '' : categoryId,
            accountId,
            transferToAccountId: type === 'transfer' ? transferToAccountId : undefined
        });

        // Reset form and close
        setAmount('');
        setDescription('');
        const now = new Date();
        setDate(now.toISOString().split('T')[0]);
        setTime(now.toTimeString().slice(0, 5));
        setType('expense');
        onClose();
    };

    const inputStyles = "mt-1 block w-full bg-gray-100 border-transparent rounded-lg p-3 focus:ring-2 focus:ring-primary focus:bg-white text-base dark:bg-gray-700 dark:text-gray-100 dark:focus:bg-gray-600";
    const labelStyles = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";

    return (
        <>
            <div
                className={`fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={onClose}
                aria-hidden="true"
            />
            <div
                role="dialog"
                aria-modal="true"
                className={`fixed top-0 right-0 h-full bg-white shadow-2xl w-full max-w-md transform transition-transform duration-300 z-50 flex flex-col dark:bg-gray-800 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
            >
                <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <h3 className="text-xl font-bold dark:text-gray-50">New Transaction</h3>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                        <Icon name="X" size={24} />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
                    <div className="p-6 space-y-6 flex-1 overflow-y-auto">

                        {/* Type Toggle */}
                        <div className="grid grid-cols-3 gap-1 bg-gray-100 dark:bg-gray-900 p-1.5 rounded-xl border border-dashed border-primary/30">
                            {(['expense', 'income', 'transfer'] as TransactionType[]).map((t) => (
                                <button
                                    key={t}
                                    type="button"
                                    onClick={() => setType(t)}
                                    className={`px-3 py-2 text-sm font-semibold rounded-lg capitalize transition-all ${type === t
                                            ? 'bg-white dark:bg-gray-700 shadow-sm text-primary dark:text-primary-light'
                                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                                        }`}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>

                        <div>
                            <label htmlFor="amount" className={labelStyles}>Amount</label>
                            <div className="relative">
                                <span className="absolute left-3 top-3.5 text-gray-500">{getCurrencySymbol(currency)}</span>
                                <input
                                    type="number"
                                    id="amount"
                                    value={amount}
                                    onChange={e => setAmount(e.target.value)}
                                    placeholder="0.00"
                                    step="0.01"
                                    className={`${inputStyles} pl-8 text-xl font-semibold`}
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="description" className={labelStyles}>Description</label>
                            <input type="text" id="description" value={description} onChange={e => setDescription(e.target.value)} placeholder={type === 'transfer' ? "e.g. Savings allocation" : "e.g. Coffee with friends"} className={inputStyles} />
                        </div>

                        <div className="flex space-x-4 border border-dashed border-primary/30 p-2 rounded-lg">
                            <div className="flex-1">
                                <label htmlFor="date" className={labelStyles}>Date</label>
                                <input type="date" id="date" value={date} onChange={e => setDate(e.target.value)} className={inputStyles} />
                            </div>
                            <div className="w-1/3">
                                <label htmlFor="time" className={labelStyles}>Time</label>
                                <input type="time" id="time" value={time} onChange={e => setTime(e.target.value)} className={inputStyles} />
                            </div>
                        </div>

                        {type === 'transfer' ? (
                            <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg border border-gray-100 dark:border-gray-700">
                                <div>
                                    <label htmlFor="fromAccount" className={labelStyles}>From Account</label>
                                    <select id="fromAccount" value={accountId} onChange={e => setAccountId(e.target.value)} className={inputStyles}>
                                        {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name} ({formatCurrency(acc.balance, currency)})</option>)}
                                    </select>
                                </div>
                                <div className="flex justify-center -my-2 relative z-10">
                                    <div className="bg-gray-200 dark:bg-gray-600 rounded-full p-1.5">
                                        <Icon name="ArrowDown" size={16} className="text-gray-500 dark:text-gray-300" />
                                    </div>
                                </div>
                                <div>
                                    <label htmlFor="toAccount" className={labelStyles}>To Account</label>
                                    <select id="toAccount" value={transferToAccountId} onChange={e => setTransferToAccountId(e.target.value)} className={inputStyles}>
                                        {accounts.filter(a => a.id !== accountId).map(acc => <option key={acc.id} value={acc.id}>{acc.name} ({formatCurrency(acc.balance, currency)})</option>)}
                                    </select>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div>
                                    <label htmlFor="account" className={labelStyles}>Account</label>
                                    <select id="account" value={accountId} onChange={e => setAccountId(e.target.value)} className={inputStyles}>
                                        {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="category" className={labelStyles}>Category</label>
                                    <select id="category" value={categoryId} onChange={e => setCategoryId(e.target.value)} className={inputStyles}>
                                        {filteredCategories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                                    </select>
                                </div>
                            </>
                        )}
                    </div>
                    <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 mt-auto bg-gray-50 dark:bg-gray-800/50">
                        <button type="submit" className="bg-primary text-white font-semibold px-4 py-3 rounded-lg shadow-sm hover:bg-primary-hover transition-colors w-full text-base flex justify-center items-center">
                            <Icon name="Plus" size={20} className="mr-2" />
                            {type === 'transfer' ? 'Transfer Funds' : 'Add Transaction'}
                        </button>
                    </div>
                </form>
            </div>
        </>
    );
};
