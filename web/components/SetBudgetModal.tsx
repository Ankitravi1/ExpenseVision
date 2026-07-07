
import React, { useState, useContext, useEffect } from 'react';
import { AppContext } from '../App';
import { Icon } from './Icon';
import { getCurrencySymbol } from '../utils/currency';

interface SetBudgetModalProps {
    isOpen: boolean;
    onClose: () => void;
    preSelectedCategoryId?: string;
    month?: string; // YYYY-MM
    onDelete?: (budgetId: string) => void;
}

export const SetBudgetModal: React.FC<SetBudgetModalProps> = ({ isOpen, onClose, preSelectedCategoryId, month, onDelete }) => {
    const context = useContext(AppContext);
    const [amount, setAmount] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [rollover, setRollover] = useState(false);
    const [alertThreshold, setAlertThreshold] = useState('100');

    const applyBudgetFields = (budget?: { amount: number; rollover?: boolean; alertThreshold?: number }) => {
        setAmount(budget ? budget.amount.toString() : '');
        setRollover(budget?.rollover ?? false);
        setAlertThreshold(String(budget?.alertThreshold ?? 100));
    };

    useEffect(() => {
        if (!context || !isOpen) return;

        const findBudget = (catId: string) => {
            if (month) {
                return context.budgets.find(b => b.categoryId === catId && b.month === month);
            }
            return context.budgets.find(b => b.categoryId === catId);
        };

        if (preSelectedCategoryId) {
            setCategoryId(preSelectedCategoryId);
            applyBudgetFields(findBudget(preSelectedCategoryId));
        } else if (context.categories) {
            const firstExpense = context.categories.find(c => c.type === 'expense');
            if (firstExpense) {
                setCategoryId(firstExpense.id);
                applyBudgetFields(findBudget(firstExpense.id));
            }
        }
    }, [isOpen, preSelectedCategoryId, month, context?.categories, context?.budgets]);

    const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newCatId = e.target.value;
        setCategoryId(newCatId);

        let existingBudget;
        if (month) {
            existingBudget = context?.budgets.find(b => b.categoryId === newCatId && b.month === month);
        } else {
            existingBudget = context?.budgets.find(b => b.categoryId === newCatId);
        }

        applyBudgetFields(existingBudget);
    }

    if (!context) return null;
    const { setBudget, categories, budgets, currency } = context;

    const expenseCategories = categories.filter(c => c.type === 'expense');
    const existingBudget = month
        ? budgets.find(b => b.categoryId === categoryId && b.month === month)
        : budgets.find(b => b.categoryId === categoryId);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!amount || !categoryId) return;

        const threshold = parseFloat(alertThreshold);
        const budgetPayload = {
            categoryId,
            amount: parseFloat(amount),
            month: month || undefined,
            rollover,
            alertThreshold: threshold >= 1 && threshold <= 500 ? threshold : 100,
        };

        setBudget({
            ...budgetPayload,
            spent: 0,
            id: ''
        });

        setAmount('');
        onClose();
    };

    const handleDelete = () => {
        if (existingBudget && onDelete) {
            onDelete(existingBudget.id);
            onClose();
        }
    };

    const inputStyles = "mt-1 block w-full bg-gray-100 border-transparent rounded-lg p-3 focus:ring-2 focus:ring-primary focus:bg-white text-base dark:bg-gray-700 dark:text-gray-100 dark:focus:bg-gray-600";
    const labelStyles = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";

    if (!isOpen) return null;

    const monthDisplay = month ? new Date(month + '-01').toLocaleString('default', { month: 'long', year: 'numeric' }) : '';

    return (
        <>
            <div
                className={`fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={onClose}
            />
            <div
                className={`fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none ${isOpen ? 'opacity-100' : 'opacity-0'}`}
            >
                <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-sm pointer-events-auto transform transition-all ${isOpen ? 'scale-100' : 'scale-95'}`}>
                    <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                        <div>
                            <h3 className="text-xl font-bold dark:text-gray-50">{preSelectedCategoryId ? 'Edit Budget' : 'Set Budget Limit'}</h3>
                            {monthDisplay && <p className="text-sm text-gray-500 dark:text-gray-400">for {monthDisplay}</p>}
                        </div>
                        <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                            <Icon name="X" size={24} />
                        </button>
                    </div>
                    <form onSubmit={handleSubmit} className="p-6 space-y-4">
                        <div>
                            <label htmlFor="budgetCategory" className={labelStyles}>Category</label>
                            <select
                                id="budgetCategory"
                                value={categoryId}
                                onChange={handleCategoryChange}
                                className={inputStyles}
                                disabled={!!preSelectedCategoryId}
                            >
                                {expenseCategories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                            </select>
                        </div>

                        <div>
                            <label htmlFor="budgetAmount" className={labelStyles}>Monthly Limit</label>
                            <div className="relative">
                                <span className="absolute left-3 top-3.5 text-gray-500">{getCurrencySymbol(currency)}</span>
                                <input
                                    type="number"
                                    id="budgetAmount"
                                    value={amount}
                                    onChange={e => setAmount(e.target.value)}
                                    placeholder="0.00"
                                    step="any"
                                    className={`${inputStyles} pl-8`}
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="budgetThreshold" className={labelStyles}>Alert at % of budget</label>
                            <input
                                type="number"
                                id="budgetThreshold"
                                value={alertThreshold}
                                onChange={e => setAlertThreshold(e.target.value)}
                                min={1}
                                max={500}
                                step={5}
                                className={inputStyles}
                            />
                        </div>

                        <label className="flex items-center justify-between gap-3 cursor-pointer">
                            <div>
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Roll over unused budget</span>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Last month's leftover (or overspend) carries into this month's limit</p>
                            </div>
                            <input
                                type="checkbox"
                                checked={rollover}
                                onChange={e => setRollover(e.target.checked)}
                                className="h-5 w-5 rounded text-primary focus:ring-primary"
                            />
                        </label>

                        <div className="pt-2 space-y-3">
                            <button type="submit" className="w-full bg-primary text-white font-semibold px-4 py-3 rounded-lg shadow-sm hover:bg-primary-hover transition-colors">
                                Save Budget
                            </button>
                            {existingBudget && onDelete && (
                                <button
                                    type="button"
                                    onClick={handleDelete}
                                    className="w-full bg-red-50 text-red-600 font-semibold px-4 py-3 rounded-lg shadow-sm hover:bg-red-100 transition-colors dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30"
                                >
                                    Remove Budget
                                </button>
                            )}
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
};
