
import React, { useState, useContext } from 'react';
import { Card } from '../components/Card';
import { Icon } from '../components/Icon';
import { AppContext } from '../App';
import { Category, TransactionType } from '../types';
import { AddCategoryModal } from '../components/AddCategoryModal';
import { ConfirmDialog } from '../components/ConfirmDialog';

const CategoryChip: React.FC<{ category: Category; onEdit: () => void }> = ({ category, onEdit }) => (
    <div className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between hover:shadow-md transition-shadow dark:bg-gray-700 dark:border-gray-600 group">
        <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${category.type === 'expense' ? 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-300' : 'bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-300'}`}>
                <Icon name={category.icon} />
            </div>
            <span className="font-medium text-gray-darkest dark:text-gray-100">{category.name}</span>
        </div>
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
                onClick={onEdit}
                className="p-1.5 text-gray-400 hover:text-primary dark:hover:text-indigo-400 transition-colors"
                title="Category settings"
            >
                <Icon name="Settings" size={16} />
            </button>
        </div>
    </div>
);

export const Categories: React.FC = () => {
    const [activeTab, setActiveTab] = useState<TransactionType>('expense');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; categoryId: string | null }>({ isOpen: false, categoryId: null });
    const { categories, deleteCategory } = useContext(AppContext)!;

    const filteredCategories = categories.filter(c => c.type === activeTab);

    const handleEdit = (category: Category) => {
        setEditingCategory(category);
        setIsModalOpen(true);
    };

    const handleDelete = (id: string) => {
        setDeleteConfirm({ isOpen: true, categoryId: id });
    };

    const confirmDelete = () => {
        if (deleteConfirm.categoryId) {
            deleteCategory(deleteConfirm.categoryId);
        }
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingCategory(null);
    };

    return (
        <>
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <h2 className="text-3xl font-bold text-gray-darkest dark:text-gray-50">Manage Categories</h2>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="btn btn-primary flex items-center gap-2"
                    >
                        <Icon name="Plus" size={20} />
                        Add New
                    </button>
                </div>

                <Card>
                    <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
                        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                            <button
                                onClick={() => setActiveTab('expense')}
                                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'expense'
                                    ? 'border-primary text-primary'
                                    : 'border-transparent text-gray-medium hover:text-gray-dark hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:border-gray-500'
                                    }`}
                            >
                                Expense Categories
                            </button>
                            <button
                                onClick={() => setActiveTab('income')}
                                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'income'
                                    ? 'border-primary text-primary'
                                    : 'border-transparent text-gray-medium hover:text-gray-dark hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:border-gray-500'
                                    }`}
                            >
                                Income Categories
                            </button>
                        </nav>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {filteredCategories.length === 0 ? (
                            <div className="col-span-full text-center py-8 text-gray-500 dark:text-gray-400">
                                No {activeTab} categories yet. Click "Add New" to create one.
                            </div>
                        ) : (
                            filteredCategories.map(category => (
                                <CategoryChip
                                    key={category.id}
                                    category={category}
                                    onEdit={() => handleEdit(category)}
                                />
                            ))
                        )}
                    </div>
                </Card>
            </div>

            <AddCategoryModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                editingCategory={editingCategory}
                onDelete={handleDelete}
            />

            <ConfirmDialog
                isOpen={deleteConfirm.isOpen}
                onClose={() => setDeleteConfirm({ isOpen: false, categoryId: null })}
                onConfirm={confirmDelete}
                title="Delete Category"
                message="Are you sure you want to delete this category? You cannot delete categories that are being used in transactions or budgets."
                confirmText="Delete"
                cancelText="Cancel"
                variant="danger"
            />
        </>
    );
};
