
import React, { useState, useContext, useEffect, useRef } from 'react';
import { AppContext } from '../App';
import { Icon } from './Icon';
import { TransactionType } from '../types';
import { getCurrencySymbol, formatCurrency } from '../utils/currency';
import { api } from '../services/api';
import { getAiSettings } from '../services/aiSettings';
import { displayDateToIso, isoDateToDisplay, todayIsoDate } from '../utils/date';

import { Transaction } from '../types';

interface NewTransactionModalProps {
    isOpen: boolean;
    onClose: () => void;
    transaction?: Transaction;
    onDelete?: (id: string) => void;
}

export const NewTransactionModal: React.FC<NewTransactionModalProps> = ({ isOpen, onClose, transaction, onDelete }) => {
    const context = useContext(AppContext);

    const [type, setType] = useState<TransactionType>('expense');
    const [amount, setAmount] = useState('');
    const [note, setNote] = useState('');
    const [date, setDate] = useState(isoDateToDisplay(todayIsoDate()));
    const [time, setTime] = useState(new Date().toTimeString().slice(0, 5));
    const [accountId, setAccountId] = useState(''); // From Account (Expense/Transfer) or To Account (Income)
    const [transferToAccountId, setTransferToAccountId] = useState(''); // Only for Transfer
    const [categoryId, setCategoryId] = useState('');
    const [isMounted, setIsMounted] = useState(false);
    const [voiceText, setVoiceText] = useState('');
    const [isParsingVoiceText, setIsParsingVoiceText] = useState(false);
    const [voiceParseError, setVoiceParseError] = useState('');
    const nativeDateInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    useEffect(() => {
        if (type !== 'transfer' && context?.accounts && context.accounts.length > 0 && !accountId) {
            setAccountId(context.accounts[0].id);
        }
    }, [context?.accounts, accountId, type]);

    useEffect(() => {
        if (transaction) {
            setType(transaction.type);
            setAmount(transaction.amount.toString());
            setNote(transaction.note);
            const [datePart, timePart] = transaction.date.split('T');
            setDate(isoDateToDisplay(datePart));
            setTime(timePart?.slice(0, 5) || new Date().toTimeString().slice(0, 5));
            setAccountId(transaction.accountId);
            setCategoryId(transaction.categoryId || '');
            setTransferToAccountId(transaction.transferToAccountId || '');
        } else {
            // Reset to defaults for new transaction
            setType('expense');
            setAmount('');
            setNote('');
            setVoiceText('');
            setVoiceParseError('');
            const now = new Date();
            setDate(isoDateToDisplay(todayIsoDate()));
            setTime(now.toTimeString().slice(0, 5));
            setCategoryId('');
            setTransferToAccountId('');
            setAccountId(type === 'transfer' ? '' : accountId);
        }
    }, [transaction, isOpen]); // Reset when opening

    // Removed auto-select category useEffect to allow blank default
    // useEffect(() => {
    //     if (!transaction && context?.categories && type !== 'transfer') {
    //         const firstCat = context.categories.find(c => c.type === type);
    //         if (firstCat) setCategoryId(firstCat.id);
    //     }
    // }, [context?.categories, type, transaction]);

    if (!isMounted || !context) return null;

    if (!isMounted || !context) return null;

    const { accounts, categories, addTransaction, updateTransaction, currency } = context;

    const filteredCategories = categories.filter(c => c.type === type);

    const handleParseVoiceText = async () => {
        const aiSettings = await getAiSettings();
        if (!aiSettings.enabled) {
            setVoiceParseError('Enable AI transaction parsing in Settings first.');
            return;
        }
        if (!aiSettings.apiKey.trim()) {
            setVoiceParseError('Add an AI API key in Settings first.');
            return;
        }
        if (!voiceText.trim()) {
            setVoiceParseError('Type or dictate a transaction note first. The example text is only a placeholder.');
            return;
        }

        setIsParsingVoiceText(true);
        setVoiceParseError('');
        try {
            const draft = await api.parseTransactionText({
                text: voiceText,
                preferredType: type
            });
            setType(draft.type);
            setAmount(draft.amount ? String(draft.amount) : '');
            setNote(draft.note || voiceText);
            setDate(isoDateToDisplay(draft.date || todayIsoDate()));
            if (draft.time) setTime(draft.time);
            if (draft.accountId) setAccountId(draft.accountId);
            setCategoryId(draft.categoryId || '');
            setTransferToAccountId(draft.transferToAccountId || '');

            if (draft.missingFields?.length) {
                setVoiceParseError(`Review missing fields: ${draft.missingFields.join(', ')}.`);
            }
        } catch (error) {
            setVoiceParseError(error instanceof Error ? error.message : 'Failed to parse transaction note.');
        } finally {
            setIsParsingVoiceText(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!amount || !note || !accountId) {
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

        const isoDate = displayDateToIso(date);
        if (!isoDate) {
            alert("Please enter date as DD-MM-YYYY.");
            return;
        }

        const dateTimeString = `${isoDate}T${time}`;

        const transactionData = {
            date: dateTimeString,
            note,
            amount: parseFloat(amount),
            type,
            categoryId: (type === 'transfer' || !categoryId) ? undefined : categoryId,
            accountId,
            transferToAccountId: type === 'transfer' ? transferToAccountId : undefined
        };

        if (transaction) {
            updateTransaction(transaction.id, transactionData);
        } else {
            addTransaction(transactionData);
        }

        // Reset form and close
        // Reset form and close
        if (!transaction) {
            setAmount('');
            setNote('');
            const now = new Date();
            setDate(isoDateToDisplay(todayIsoDate()));
            setTime(now.toTimeString().slice(0, 5));
            setType('expense');
        }
        onClose();
    };

    const inputStyles = "mt-1 block w-full bg-gray-100 border-transparent rounded-lg p-3 focus:ring-2 focus:ring-primary focus:bg-white text-base dark:bg-gray-700 dark:text-gray-100 dark:focus:bg-gray-600";
    const labelStyles = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";
    const nativeDateValue = displayDateToIso(date) || todayIsoDate();
    const openCalendarPicker = () => {
        const picker = nativeDateInputRef.current;
        if (!picker) return;
        if (typeof picker.showPicker === 'function') {
            picker.showPicker();
        } else {
            picker.click();
        }
    };

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
                    <h3 className="text-xl font-bold dark:text-gray-50">{transaction ? 'Edit Transaction' : 'New Transaction'}</h3>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                        <Icon name="X" size={24} />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
                    <fieldset disabled={isParsingVoiceText} className="p-6 space-y-6 flex-1 overflow-y-auto disabled:opacity-70">

                        {/* Type Toggle */}
                        <div className="grid grid-cols-3 gap-1 bg-gray-100 dark:bg-gray-900 p-1.5 rounded-xl border border-dashed border-primary/30">
                            {(['expense', 'income', 'transfer'] as TransactionType[]).map((t) => (
                                <button
                                    key={t}
                                    type="button"
                                    onClick={() => {
                                        setType(t);
                                        if (t === 'transfer' && !transaction) {
                                            setAccountId('');
                                            setTransferToAccountId('');
                                            setCategoryId('');
                                        }
                                    }}
                                    disabled={isParsingVoiceText}
                                    className={`px-3 py-2 text-sm font-semibold rounded-lg capitalize transition-all ${type === t
                                        ? 'bg-white dark:bg-gray-700 shadow-sm text-primary dark:text-primary-light'
                                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                                        }`}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>

                        {!transaction && (
                            <div className="rounded-lg border border-primary/20 bg-primary-light/40 p-4 dark:bg-primary/10 dark:border-primary/30">
                                <div className="flex items-center gap-2 mb-3">
                                    <Icon name="Mic2" size={18} className="text-primary" />
                                    <label htmlFor="voiceText" className="text-sm font-semibold text-gray-darkest dark:text-gray-50">Quick Entry</label>
                                </div>
                                <textarea
                                    id="voiceText"
                                    value={voiceText}
                                    onChange={e => {
                                        setVoiceText(e.target.value);
                                        setVoiceParseError('');
                                    }}
                                    placeholder="Example: spent 20 on food from SBI savings"
                                    rows={3}
                                    className="block w-full resize-none bg-white border-transparent rounded-lg p-3 focus:ring-2 focus:ring-primary text-base dark:bg-gray-700 dark:text-gray-100"
                                />
                                {voiceParseError && (
                                    <p className="mt-2 text-sm text-amber-700 dark:text-amber-300">{voiceParseError}</p>
                                )}
                                <button
                                    type="button"
                                    onClick={handleParseVoiceText}
                                    disabled={isParsingVoiceText || !voiceText.trim()}
                                    className="mt-3 w-full bg-white text-primary border border-primary/30 font-semibold px-4 py-2.5 rounded-lg shadow-sm hover:bg-primary hover:text-white disabled:opacity-60 disabled:hover:bg-white disabled:hover:text-primary transition-colors flex justify-center items-center dark:bg-gray-800"
                                >
                                    <Icon name="Sparkles" size={18} className="mr-2" />
                                    {isParsingVoiceText ? 'Parsing...' : 'Parse with AI'}
                                </button>
                            </div>
                        )}

                        <fieldset disabled={isParsingVoiceText} className="space-y-4">
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
                            <label htmlFor="note" className={labelStyles}>Description / note</label>
                            <input type="text" id="note" value={note} onChange={e => setNote(e.target.value)} placeholder={type === 'transfer' ? "e.g. Savings allocation" : "e.g. Coffee with friends"} className={inputStyles} />
                        </div>
                        </fieldset>

                        <div className="flex space-x-4 border border-dashed border-primary/30 p-2 rounded-lg">
                            <div className="flex-1">
                                <label htmlFor="date" className={labelStyles}>Date</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        id="date"
                                        value={date}
                                        onChange={e => setDate(e.target.value)}
                                        placeholder="DD-MM-YYYY"
                                        inputMode="numeric"
                                        className={`${inputStyles} pr-11`}
                                    />
                                    <button
                                        type="button"
                                        onClick={openCalendarPicker}
                                        className="absolute right-2 top-2.5 p-2 rounded-lg text-gray-500 hover:text-primary hover:bg-white dark:hover:bg-gray-600"
                                        title="Pick date from calendar"
                                    >
                                        <Icon name="Calendar" size={18} />
                                    </button>
                                    <input
                                        ref={nativeDateInputRef}
                                        type="date"
                                        value={nativeDateValue}
                                        onChange={e => setDate(isoDateToDisplay(e.target.value))}
                                        className="sr-only"
                                        tabIndex={-1}
                                    />
                                </div>
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
                                        <option value="">Select source account</option>
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
                                        <option value="">Select destination account</option>
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
                                        <option value="">Select Category</option>
                                        {filteredCategories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                                    </select>
                                </div>
                            </>
                        )}
                    </fieldset>
                    <div className="mt-8">
                        <button
                            type="submit"
                            disabled={isParsingVoiceText}
                            className="w-full bg-primary text-white font-semibold px-4 py-3 rounded-lg shadow-sm hover:bg-primary-dark transition-colors disabled:opacity-70 flex justify-center items-center"
                        >
                            {transaction ? 'Save Changes' : 'Add Transaction'}
                        </button>
                        {transaction && onDelete && (
                            <button
                                type="button"
                                onClick={() => {
                                    if (window.confirm('Are you sure you want to delete this transaction?')) {
                                        onDelete(transaction.id);
                                        onClose();
                                    }
                                }}
                                className="mt-3 w-full bg-red-50 text-red-600 font-semibold px-4 py-3 rounded-lg shadow-sm hover:bg-red-100 transition-colors dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30 flex justify-center items-center"
                            >
                                <Icon name="Trash2" size={20} className="mr-2" />
                                Delete Transaction
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </>
    );
};
