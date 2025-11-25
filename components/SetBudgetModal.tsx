
import React, { useState, useContext, useEffect } from 'react';
import { AppContext } from '../App';
import { Icon } from './Icon';

interface SetBudgetModalProps {
    isOpen: boolean;
    onClose: () => void;
    preSelectedCategoryId?: string;
    onDelete?: (budgetId: string) => void;
}

export const SetBudgetModal: React.FC<SetBudgetModalProps> = ({ isOpen, onClose, preSelectedCategoryId, onDelete }) => {
    const context = useContext(AppContext);
    const [amount, setAmount] = useState('');
    const [categoryId, setCategoryId] = useState('');

    useEffect(() => {
        if (!context || !isOpen) return;

        if (preSelectedCategoryId) {
            setCategoryId(preSelectedCategoryId);
            // Check if there is an existing budget for this category and pre-fill amount
            const existingBudget = context.budgets.find(b => b.categoryId === preSelectedCategoryId);
            if (existingBudget) {
                setAmount(existingBudget.amount.toString());
            } else {
                setAmount('');
            }
        } else if (context.categories) {
            const firstExpense = context.categories.find(c => c.type === 'expense');
            if (firstExpense) {
                setCategoryId(firstExpense.id);
                // Pre-fill amount if exists for the default selected
                const existingBudget = context.budgets.find(b => b.categoryId === firstExpense.id);
                if (existingBudget) setAmount(existingBudget.amount.toString());
                else setAmount('');
            }
        }
    }, [isOpen, preSelectedCategoryId, context?.categories, context?.budgets]);

    // Handle category change manually to update pre-fill
    const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newCatId = e.target.value;
        setCategoryId(newCatId);
        const existingBudget = context?.budgets.find(b => b.categoryId === newCatId);
        if (existingBudget) setAmount(existingBudget.amount.toString());
        else setAmount('');
    }

    if (!context) return null;
    const { setBudget, categories, budgets } = context;

    const expenseCategories = categories.filter(c => c.type === 'expense');
    const existingBudget = budgets.find(b => b.categoryId === categoryId);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!amount || !categoryId) return;

        setBudget({
            categoryId,
            amount: parseFloat(amount),
            spent: 0, // In a real app we'd calc this, but App.tsx handles preserving spent for existing budgets
            id: '' // Filled in App
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
                        <h3 className="text-xl font-bold dark:text-gray-50">{preSelectedCategoryId ? 'Edit Budget' : 'Set Budget Limit'}</h3>
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
                                <span className="absolute left-3 top-3.5 text-gray-500">₹</span>
                                <input
                                    type="number"
                                    id="budgetAmount"
                                    value={amount}
                                    onChange={e => setAmount(e.target.value)}
                                    placeholder="0.00"
                                    step="0.01"
                                    className={`${inputStyles} pl-8`}
                                    required
                                />
                            </div>
                        </div>

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
