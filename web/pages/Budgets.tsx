
import React, { useState, useContext } from 'react';
import { Card } from '../components/Card';
import { Icon } from '../components/Icon';
import { AppContext } from '../App';
import { Budget } from '../types';
import { SetBudgetModal } from '../components/SetBudgetModal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { formatCurrency } from '../utils/currency';

const PeriodNavigator: React.FC<{ date: Date; setDate: (date: Date) => void }> = ({ date, setDate }) => {
    const changeMonth = (offset: number) => {
        const newDate = new Date(date);
        newDate.setMonth(newDate.getMonth() + offset);
        setDate(newDate);
    };

    return (
        <div className="flex items-center justify-center space-x-4 mb-6">
            <button onClick={() => changeMonth(-1)} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                <Icon name="ChevronLeft" />
            </button>
            <h3 className="text-2xl font-bold text-gray-darkest dark:text-gray-50 w-48 text-center">
                {date.toLocaleString('default', { month: 'long', year: 'numeric' })}
            </h3>
            <button onClick={() => changeMonth(1)} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                <Icon name="ChevronRight" />
            </button>
        </div>
    );
};

const BudgetCard: React.FC<{ budget: Budget; onEdit: () => void }> = ({ budget, onEdit }) => {
    const { categories, currency } = useContext(AppContext)!;
    const category = categories.find(c => c.id === budget.categoryId);
    if (!category) return null;

    const limit = budget.effectiveAmount ?? budget.amount;
    const percentage = limit > 0 ? (budget.spent / limit) * 100 : 100;
    const threshold = budget.alertThreshold ?? 80;
    const progressBarColor = percentage > 100 ? 'bg-danger' : percentage >= threshold ? 'bg-warning' : 'bg-success';
    const remaining = limit - budget.spent;
    const carryover = budget.rollover ? (budget.carryover ?? 0) : 0;

    return (
        <Card>
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full bg-primary-light dark:bg-primary/20 flex items-center justify-center mr-3">
                        <Icon name={category.icon} className="text-primary dark:text-indigo-300" />
                    </div>
                    <h4 className="font-semibold text-lg text-gray-darkest dark:text-gray-50">{category.name}</h4>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={onEdit}
                        className="p-1.5 text-gray-400 hover:text-primary dark:hover:text-indigo-400 transition-colors"
                        title="Edit budget"
                    >
                        <Icon name="Settings" size={16} />
                    </button>
                </div>
            </div>
            <div className="flex justify-between items-baseline mb-1">
                <span className="font-bold text-xl text-gray-darkest dark:text-gray-50">{formatCurrency(budget.spent, currency)}</span>
                <span className="text-gray-medium dark:text-gray-400">of {formatCurrency(limit, currency)}</span>
            </div>
            {carryover !== 0 && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                    {carryover > 0
                        ? `Includes ${formatCurrency(carryover, currency)} rolled over from last month`
                        : `Reduced by ${formatCurrency(Math.abs(carryover), currency)} overspent last month`}
                </p>
            )}
            <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-600 mb-2">
                <div className={`${progressBarColor} h-2.5 rounded-full transition-all`} style={{ width: `${Math.min(percentage, 100)}%` }}></div>
            </div>
            <div className="flex justify-between text-sm">
                <span className="text-gray-medium dark:text-gray-400">
                    {percentage.toFixed(1)}% used
                </span>
                <span className={`font-medium ${remaining >= 0 ? 'text-success' : 'text-danger'}`}>
                    {formatCurrency(Math.abs(remaining), currency)} {remaining >= 0 ? 'left' : 'over'}
                </span>
            </div>
        </Card>
    );
};



export const Budgets: React.FC = () => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | undefined>(undefined);
    const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; budgetId: string | null }>({ isOpen: false, budgetId: null });

    const { budgets, categories, transactions, deleteBudget, currency } = useContext(AppContext)!;

    const now = new Date();
    const currentMonthStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
    const isCurrentMonth = currentDate.getFullYear() === now.getFullYear() && currentDate.getMonth() === now.getMonth();

    // Month-scoped budgets for this month, plus repeating (month-less) budgets.
    // Repeating budgets come from the API with current-month spent; recompute
    // spent client-side when viewing another month. Rollover only applies to
    // the current month.
    const repeatingBudgets = budgets
        .filter(b => !b.month)
        .map(b => {
            if (isCurrentMonth) return b;
            const spent = transactions
                .filter(t => t.type === 'expense' && t.categoryId === b.categoryId && t.date.startsWith(currentMonthStr))
                .reduce((sum, t) => sum + t.amount, 0);
            return { ...b, spent, carryover: 0, effectiveAmount: b.amount };
        });
    const filteredBudgets = [...budgets.filter(b => b.month === currentMonthStr), ...repeatingBudgets];

    const unbudgetedCategories = categories.filter(
        c => c.type === 'expense' && !filteredBudgets.some(b => b.categoryId === c.id)
    );

    const { totalBudget, totalSpent } = filteredBudgets.reduce(
        (acc, budget) => ({
            totalBudget: acc.totalBudget + (budget.effectiveAmount ?? budget.amount),
            totalSpent: acc.totalSpent + budget.spent,
        }),
        { totalBudget: 0, totalSpent: 0 }
    );

    const totalRemaining = totalBudget - totalSpent;
    const overallPercentage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

    const openSetBudget = (categoryId?: string) => {
        setSelectedCategoryId(categoryId);
        setIsModalOpen(true);
    };

    const handleClose = () => {
        setIsModalOpen(false);
        setSelectedCategoryId(undefined);
    }

    const handleDelete = (id: string) => {
        setDeleteConfirm({ isOpen: true, budgetId: id });
    };

    const confirmDelete = () => {
        if (deleteConfirm.budgetId) {
            deleteBudget(deleteConfirm.budgetId);
        }
    };

    return (
        <>
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <h2 className="text-3xl font-bold text-gray-darkest dark:text-gray-50">Budget Management</h2>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => openSetBudget()}
                            className="btn btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={filteredBudgets.length >= categories.filter(c => c.type === 'expense').length}
                            title={filteredBudgets.length >= categories.filter(c => c.type === 'expense').length ? "All categories budgeted" : ""}
                        >
                            <Icon name="Plus" size={18} />
                            Set Budget
                        </button>
                    </div>
                </div>

                <PeriodNavigator date={currentDate} setDate={setCurrentDate} />

                <Card>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-semibold text-lg text-gray-darkest dark:text-gray-50">Overall Progress</h3>
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                            {overallPercentage.toFixed(1)}% of budget used
                        </span>
                    </div>
                    <div className="flex justify-between items-baseline mb-2">
                        <span className="font-bold text-3xl text-gray-darkest dark:text-gray-50">{formatCurrency(totalSpent, currency)}</span>
                        <span className="text-gray-medium dark:text-gray-400">of {formatCurrency(totalBudget, currency)}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-4 dark:bg-gray-700 mb-3">
                        <div
                            className={`h-4 rounded-full transition-all ${overallPercentage > 100 ? 'bg-danger' : overallPercentage > 75 ? 'bg-warning' : 'bg-primary'}`}
                            style={{ width: `${Math.min(overallPercentage, 100)}%` }}
                        ></div>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-medium dark:text-gray-400">
                            {filteredBudgets.length} {filteredBudgets.length === 1 ? 'budget' : 'budgets'} active
                        </span>
                        <span className={`font-semibold ${totalRemaining >= 0 ? 'text-success' : 'text-danger'}`}>
                            {formatCurrency(Math.abs(totalRemaining), currency)} {totalRemaining >= 0 ? 'remaining' : 'over budget'}
                        </span>
                    </div>
                </Card>

                <div>
                    <h3 className="text-xl font-semibold mb-4 text-gray-darkest dark:text-gray-50">Category Budgets</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredBudgets.length === 0 ? (
                            <div className="col-span-full text-center py-12 text-gray-500 dark:text-gray-400">
                                <Icon name="Target" size={48} className="mx-auto mb-4 opacity-50" />
                                <p className="text-lg">No budgets set for this month</p>
                                <p className="text-sm mt-2">Click "Set Budget" to get started</p>
                            </div>
                        ) : (
                            filteredBudgets.map(budget => (
                                <BudgetCard
                                    key={budget.id}
                                    budget={budget}
                                    onEdit={() => openSetBudget(budget.categoryId)}
                                />
                            ))
                        )}
                    </div>
                </div>

                {unbudgetedCategories.length > 0 && (
                    <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
                        <h3 className="text-xl font-semibold mb-4 text-gray-darkest dark:text-gray-50">Unbudgeted Categories</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {unbudgetedCategories.map(category => (
                                <button
                                    key={category.id}
                                    type="button"
                                    onClick={() => openSetBudget(category.id)}
                                    className="flex items-center justify-between p-3.5 bg-white dark:bg-gray-800/40 rounded-xl border border-gray-200 dark:border-gray-700/80 hover:border-primary dark:hover:border-indigo-500 hover:bg-gray-50 dark:hover:bg-gray-800 hover:shadow-sm transition-all text-left group"
                                >
                                    <div className="flex items-center min-w-0 mr-2">
                                        <div className="w-9 h-9 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center mr-3 flex-shrink-0 group-hover:bg-primary-light dark:group-hover:bg-primary/20 transition-colors">
                                            <Icon name={category.icon} className="text-gray-400 dark:text-gray-500 group-hover:text-primary dark:group-hover:text-indigo-300 transition-colors" size={16} />
                                        </div>
                                        <span className="font-medium text-sm text-gray-700 dark:text-gray-300 truncate group-hover:text-primary dark:group-hover:text-indigo-300 transition-colors">{category.name}</span>
                                    </div>
                                    <div className="w-7 h-7 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center group-hover:border-primary dark:group-hover:border-indigo-500 transition-all">
                                        <Icon name="Plus" size={14} className="text-gray-400 dark:text-gray-500 group-hover:text-primary dark:group-hover:text-indigo-300 group-hover:scale-110 transition-all flex-shrink-0" />
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <SetBudgetModal
                isOpen={isModalOpen}
                onClose={handleClose}
                preSelectedCategoryId={selectedCategoryId}
                month={currentMonthStr}
                onDelete={handleDelete}
            />

            <ConfirmDialog
                isOpen={deleteConfirm.isOpen}
                onClose={() => setDeleteConfirm({ isOpen: false, budgetId: null })}
                onConfirm={confirmDelete}
                title="Delete Budget"
                message="Are you sure you want to delete this budget? This will not affect your transactions."
                confirmText="Delete"
                cancelText="Cancel"
                variant="danger"
            />
        </>
    );
};
