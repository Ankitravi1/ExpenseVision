
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

    const percentage = (budget.spent / budget.amount) * 100;
    const progressBarColor = percentage > 100 ? 'bg-danger' : percentage > 75 ? 'bg-warning' : 'bg-success';
    const remaining = budget.amount - budget.spent;

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
                <span className="text-gray-medium dark:text-gray-400">of {formatCurrency(budget.amount, currency)}</span>
            </div>
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

const UnbudgetedCategory: React.FC<{ categoryName: string, icon: string, onSetBudget: () => void }> = ({ categoryName, icon, onSetBudget }) => (
    <div className="flex items-center justify-between p-4 border-b last:border-0 border-gray-200 dark:border-gray-700">
        <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mr-4">
                <Icon name={icon} className="text-gray-dark dark:text-gray-300" />
            </div>
            <p className="font-medium">{categoryName}</p>
        </div>
        <button
            onClick={onSetBudget}
            className="font-semibold text-primary hover:text-primary-hover text-sm border border-primary px-3 py-1.5 rounded-md"
        >
            SET BUDGET
        </button>
    </div>
);

export const Budgets: React.FC = () => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | undefined>(undefined);
    const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; budgetId: string | null }>({ isOpen: false, budgetId: null });

    const { budgets, categories, deleteBudget, currency } = useContext(AppContext)!;

    const { totalBudget, totalSpent } = budgets.reduce(
        (acc, budget) => ({
            totalBudget: acc.totalBudget + budget.amount,
            totalSpent: acc.totalSpent + budget.spent,
        }),
        { totalBudget: 0, totalSpent: 0 }
    );

    const totalRemaining = totalBudget - totalSpent;
    const overallPercentage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

    const budgetedCategoryIds = new Set(budgets.map(b => b.categoryId));
    const unbudgetedCategories = categories.filter(c => c.type === 'expense' && !budgetedCategoryIds.has(c.id));

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
                        {/* TODO: Budget Profile Dropdown - Phase 2 */}
                        <button
                            onClick={() => openSetBudget()}
                            className="btn btn-primary flex items-center gap-2"
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
                            {budgets.length} {budgets.length === 1 ? 'budget' : 'budgets'} active
                        </span>
                        <span className={`font-semibold ${totalRemaining >= 0 ? 'text-success' : 'text-danger'}`}>
                            {formatCurrency(Math.abs(totalRemaining), currency)} {totalRemaining >= 0 ? 'remaining' : 'over budget'}
                        </span>
                    </div>
                </Card>

                <div>
                    <h3 className="text-xl font-semibold mb-4 text-gray-darkest dark:text-gray-50">Category Budgets</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {budgets.length === 0 ? (
                            <div className="col-span-full text-center py-12 text-gray-500 dark:text-gray-400">
                                <Icon name="Target" size={48} className="mx-auto mb-4 opacity-50" />
                                <p className="text-lg">No budgets set yet</p>
                                <p className="text-sm mt-2">Click "Set Budget" to get started</p>
                            </div>
                        ) : (
                            budgets.map(budget => (
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
                    <Card>
                        <h3 className="text-lg font-semibold mb-2 dark:text-gray-50">Unbudgeted Categories</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                            Set budgets for these expense categories to track your spending
                        </p>
                        <div className="divide-y divide-gray-200 dark:divide-gray-700">
                            {unbudgetedCategories.map(cat => (
                                <UnbudgetedCategory
                                    key={cat.id}
                                    categoryName={cat.name}
                                    icon={cat.icon}
                                    onSetBudget={() => openSetBudget(cat.id)}
                                />
                            ))}
                        </div>
                    </Card>
                )}
            </div>

            <SetBudgetModal
                isOpen={isModalOpen}
                onClose={handleClose}
                preSelectedCategoryId={selectedCategoryId}
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
