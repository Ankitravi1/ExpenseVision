import React, { useState, useContext, useMemo } from 'react';
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
        <div className="flex items-center space-x-3 bg-white dark:bg-gray-800 p-1 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm">
            <button onClick={() => changeMonth(-1)} className="p-2 rounded-lg hover:bg-gray-150 dark:hover:bg-gray-700 transition-colors" aria-label="Previous month">
                <Icon name="ChevronLeft" size={18} />
            </button>
            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 w-36 text-center tabular-nums">
                {date.toLocaleString('default', { month: 'long', year: 'numeric' })}
            </h3>
            <button onClick={() => changeMonth(1)} className="p-2 rounded-lg hover:bg-gray-150 dark:hover:bg-gray-700 transition-colors" aria-label="Next month">
                <Icon name="ChevronRight" size={18} />
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
        <Card className="hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600 transition-all">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full bg-primary-light dark:bg-primary/20 flex items-center justify-center mr-3">
                        <Icon name={category.icon} className="text-primary dark:text-indigo-300" />
                    </div>
                    <div>
                        <h4 className="font-bold text-sm text-gray-900 dark:text-gray-100">{category.name}</h4>
                        <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider font-semibold">
                            {budget.month ? 'Monthly Override' : 'Recurring limit'}
                        </p>
                    </div>
                </div>
                <button
                    onClick={onEdit}
                    className="p-1.5 rounded-md text-gray-450 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    title="Edit limit"
                >
                    <Icon name="Pencil" size={14} />
                </button>
            </div>

            <div className="flex justify-between items-baseline mb-2 mt-4">
                <span className="font-bold text-xl text-gray-900 dark:text-white">{formatCurrency(budget.spent, currency)}</span>
                <span className="text-xs text-gray-550 dark:text-gray-400">of {formatCurrency(limit, currency)}</span>
            </div>

            {budget.rollover && carryover !== 0 && (
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-2 font-medium">
                    {carryover > 0
                        ? `Includes ${formatCurrency(carryover, currency)} rolled over from last month`
                        : `Reduced by ${formatCurrency(Math.abs(carryover), currency)} overspent last month`}
                </p>
            )}
            <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700 mb-2 overflow-hidden">
                <div className={`${progressBarColor} h-2 rounded-full transition-all`} style={{ width: `${Math.min(percentage, 100)}%` }}></div>
            </div>
            <div className="flex justify-between text-xs">
                <span className="text-gray-550 dark:text-gray-400">
                    {percentage.toFixed(1)}% used
                </span>
                <span className={`font-semibold ${remaining >= 0 ? 'text-success' : 'text-danger'}`}>
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
    const [activeTab, setActiveTab] = useState<'All' | 'Over' | 'Warning' | 'Healthy'>('All');

    const { budgets, categories, transactions, deleteBudget, currency } = useContext(AppContext)!;

    const now = new Date();
    const currentMonthStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
    const isCurrentMonth = currentDate.getFullYear() === now.getFullYear() && currentDate.getMonth() === now.getMonth();

    // Month-scoped budgets for this month, plus repeating (month-less) budgets.
    const repeatingBudgets = budgets
        .filter(b => !b.month)
        .map(b => {
            if (isCurrentMonth) return b;
            const spent = transactions
                .filter(t => t.type === 'expense' && t.categoryId === b.categoryId && t.date.startsWith(currentMonthStr))
                .reduce((sum, t) => sum + t.amount, 0);
            return { ...b, spent, carryover: 0, effectiveAmount: b.amount };
        });
    const monthlyBudgets = budgets.filter(b => b.month === currentMonthStr);
    const filteredRepeating = repeatingBudgets.filter(rb => !monthlyBudgets.some(mb => mb.categoryId === rb.categoryId));
    const filteredBudgets = [...monthlyBudgets, ...filteredRepeating];

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
    };

    const handleDelete = (id: string) => {
        setDeleteConfirm({ isOpen: true, budgetId: id });
    };

    const confirmDelete = () => {
        if (deleteConfirm.budgetId) {
            deleteBudget(deleteConfirm.budgetId);
        }
    };

    // Group budgets by status for counts and tab filtering
    const groupedBudgets = useMemo(() => {
        const over: Budget[] = [];
        const warning: Budget[] = [];
        const healthy: Budget[] = [];

        filteredBudgets.forEach(b => {
            const limit = b.effectiveAmount ?? b.amount;
            const percentage = limit > 0 ? (b.spent / limit) * 100 : 100;
            const threshold = b.alertThreshold ?? 80;

            if (percentage > 100) {
                over.push(b);
            } else if (percentage >= threshold) {
                warning.push(b);
            } else {
                healthy.push(b);
            }
        });

        return { over, warning, healthy };
    }, [filteredBudgets]);

    // Compute budgets list to display based on activeTab
    const budgetsToDisplay = useMemo(() => {
        switch (activeTab) {
            case 'Over':
                return groupedBudgets.over;
            case 'Warning':
                return groupedBudgets.warning;
            case 'Healthy':
                return groupedBudgets.healthy;
            default:
                return filteredBudgets;
        }
    }, [activeTab, groupedBudgets, filteredBudgets]);

    return (
        <>
            <div className="space-y-6">
                {/* Inline Compact Period Navigator and Action */}
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                    <PeriodNavigator date={currentDate} setDate={setCurrentDate} />
                    <button
                        onClick={() => openSetBudget()}
                        className="btn btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-bold shadow-sm"
                        disabled={filteredBudgets.length >= categories.filter(c => c.type === 'expense').length}
                        title={filteredBudgets.length >= categories.filter(c => c.type === 'expense').length ? "All categories budgeted" : ""}
                    >
                        <Icon name="Plus" size={18} />
                        Set Budget Limit
                    </button>
                </div>

                {/* Overall Summary Progress Bar */}
                <Card>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100 uppercase tracking-wider">Overall Progress</h3>
                        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700/50 px-2 py-0.5 rounded-md">
                            {overallPercentage.toFixed(1)}% used
                        </span>
                    </div>
                    <div className="flex justify-between items-baseline mb-2">
                        <span className="font-bold text-3xl text-gray-900 dark:text-white">{formatCurrency(totalSpent, currency)}</span>
                        <span className="text-sm text-gray-500 dark:text-gray-450">of {formatCurrency(totalBudget, currency)}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3 dark:bg-gray-700 mb-3 overflow-hidden">
                        <div
                            className={`h-3 rounded-full transition-all ${overallPercentage > 100 ? 'bg-danger' : overallPercentage > 75 ? 'bg-warning' : 'bg-primary'}`}
                            style={{ width: `${Math.min(overallPercentage, 105)}%` }}
                        ></div>
                    </div>
                    <div className="flex justify-between text-xs">
                        <span className="text-gray-500 dark:text-gray-400 font-semibold">
                            {filteredBudgets.length} of {categories.filter(c => c.type === 'expense').length} categories budgeted
                        </span>
                        <span className={`font-bold ${totalRemaining >= 0 ? 'text-success' : 'text-danger'}`}>
                            {formatCurrency(Math.abs(totalRemaining), currency)} {totalRemaining >= 0 ? 'remaining' : 'over budget'}
                        </span>
                    </div>
                </Card>

                {/* Status Tab Filters */}
                <div className="border-b border-gray-200 dark:border-gray-700 pb-2 shrink-0">
                    <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none">
                        <button
                            onClick={() => setActiveTab('All')}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                                activeTab === 'All'
                                    ? 'bg-primary text-white shadow-md'
                                    : 'bg-white hover:bg-gray-50 text-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-750 border border-gray-200 dark:border-gray-700'
                            }`}
                        >
                            All Budgets ({filteredBudgets.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('Over')}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                                activeTab === 'Over'
                                    ? 'bg-rose-500 text-white shadow-md'
                                    : 'bg-white hover:bg-rose-50/50 text-rose-600 dark:bg-gray-800 dark:text-rose-400 dark:hover:bg-rose-950/20 border border-gray-200 dark:border-gray-700'
                            }`}
                        >
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 dark:bg-rose-455"></span>
                            Over Budget ({groupedBudgets.over.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('Warning')}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                                activeTab === 'Warning'
                                    ? 'bg-amber-500 text-white shadow-md'
                                    : 'bg-white hover:bg-amber-50/50 text-amber-600 dark:bg-gray-800 dark:text-amber-400 dark:hover:bg-amber-950/20 border border-gray-200 dark:border-gray-700'
                            }`}
                        >
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 dark:bg-amber-455"></span>
                            Near Limit ({groupedBudgets.warning.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('Healthy')}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                                activeTab === 'Healthy'
                                    ? 'bg-emerald-500 text-white shadow-md'
                                    : 'bg-white hover:bg-emerald-50/50 text-emerald-650 dark:bg-gray-800 dark:text-emerald-400 dark:hover:bg-emerald-950/20 border border-gray-200 dark:border-gray-700'
                            }`}
                        >
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-455"></span>
                            On Track ({groupedBudgets.healthy.length})
                        </button>
                    </div>
                </div>

                {/* Filtered Budgets List Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {budgetsToDisplay.length === 0 ? (
                        <div className="col-span-full text-center py-14 bg-white dark:bg-gray-800/40 rounded-2xl border border-gray-200 dark:border-gray-700">
                            <Icon name="Target" size={48} className="mx-auto mb-4 opacity-40 text-gray-405" />
                            <p className="text-base font-bold text-gray-700 dark:text-gray-300">No budgets found in this category</p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">Adjust your tab filter above or set a new limit</p>
                        </div>
                    ) : (
                        budgetsToDisplay.map(budget => (
                            <BudgetCard
                                key={budget.id}
                                budget={budget}
                                onEdit={() => openSetBudget(budget.categoryId)}
                            />
                        ))
                    )}
                </div>

                {unbudgetedCategories.length > 0 && (
                    <div className="pt-6 border-t border-gray-150 dark:border-gray-800">
                        <h3 className="text-xs font-bold mb-4 text-gray-900 dark:text-gray-100 uppercase tracking-wider">Unbudgeted Categories</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {unbudgetedCategories.map(category => (
                                <button
                                    key={category.id}
                                    type="button"
                                    onClick={() => openSetBudget(category.id)}
                                    className="flex items-center justify-between p-3 bg-white dark:bg-gray-800/40 rounded-xl border border-gray-200 dark:border-gray-700/80 hover:border-primary dark:hover:border-indigo-500 hover:bg-gray-50 dark:hover:bg-gray-800 hover:shadow-sm transition-all text-left group"
                                >
                                    <div className="flex items-center min-w-0 mr-2">
                                        <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-gray-800 flex items-center justify-center mr-3 flex-shrink-0 group-hover:bg-primary-light dark:group-hover:bg-primary/20 transition-colors">
                                            <Icon name={category.icon} className="text-gray-400 dark:text-gray-550 group-hover:text-primary dark:group-hover:text-indigo-300 transition-colors" size={14} />
                                        </div>
                                        <span className="font-semibold text-xs text-gray-700 dark:text-gray-300 truncate group-hover:text-primary dark:group-hover:text-indigo-300 transition-colors">{category.name}</span>
                                    </div>
                                    <div className="w-6 h-6 rounded-md border border-gray-205 dark:border-gray-700 flex items-center justify-center group-hover:border-primary dark:group-hover:border-indigo-500 transition-all">
                                        <Icon name="Plus" size={12} className="text-gray-400 dark:text-gray-550 group-hover:text-primary dark:group-hover:text-indigo-300 group-hover:scale-110 transition-all flex-shrink-0" />
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
