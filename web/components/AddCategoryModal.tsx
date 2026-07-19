
import React, { useState, useContext, useEffect } from 'react';
import { AppContext } from '../App';
import { Icon, iconList } from './Icon';
import { TransactionType, Category } from '../types';

interface AddCategoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    editingCategory?: Category | null;
    onDelete?: (categoryId: string) => void;
}

export const AddCategoryModal: React.FC<AddCategoryModalProps> = ({ isOpen, onClose, editingCategory, onDelete }) => {
    const context = useContext(AppContext);
    const [name, setName] = useState('');
    const [type, setType] = useState<TransactionType>('expense');
    const [selectedIcon, setSelectedIcon] = useState('Tags');
    const [showIconPicker, setShowIconPicker] = useState(false);

    // Populate form when editing
    useEffect(() => {
        if (editingCategory) {
            setName(editingCategory.name);
            setType(editingCategory.type);
            setSelectedIcon(editingCategory.icon || 'Tags');
        } else {
            setName('');
            setType('expense');
            setSelectedIcon('Tags');
        }
    }, [editingCategory, isOpen]);

    if (!context) return null;
    const { addCategory, updateCategory } = context;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name) return;

        if (editingCategory) {
            updateCategory(editingCategory.id, {
                name,
                type,
                icon: selectedIcon
            });
        } else {
            addCategory({
                name,
                type,
                icon: selectedIcon
            });
        }

        setName('');
        setSelectedIcon('Tags');
        setShowIconPicker(false);
        onClose();
    };

    const handleDelete = () => {
        if (editingCategory && onDelete) {
            onDelete(editingCategory.id);
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
                <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-sm pointer-events-auto transform transition-all ${isOpen ? 'scale-100' : 'scale-95'} flex flex-col max-h-[90vh]`}>
                    <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center shrink-0">
                        <h3 className="text-xl font-bold dark:text-gray-50">{editingCategory ? 'Edit Category' : 'New Category'}</h3>
                        <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                            <Icon name="X" size={24} />
                        </button>
                    </div>
                    <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
                        <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                            <button
                                type="button"
                                onClick={() => setType('expense')}
                                className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${type === 'expense' ? 'bg-white dark:bg-gray-600 shadow text-primary dark:text-emerald-300' : 'text-gray-500 dark:text-gray-400'}`}
                            >
                                Expense
                            </button>
                            <button
                                type="button"
                                onClick={() => setType('income')}
                                className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${type === 'income' ? 'bg-white dark:bg-gray-600 shadow text-primary dark:text-emerald-300' : 'text-gray-500 dark:text-gray-400'}`}
                            >
                                Income
                            </button>
                        </div>

                        <div>
                            <label htmlFor="categoryName" className={labelStyles}>Category Name</label>
                            <input
                                type="text"
                                id="categoryName"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="e.g. Gym, Subscriptions"
                                className={inputStyles}
                                required
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
                                    {showIconPicker ? 'Close Picker' : 'Choose Icon / Emoji'}
                                </button>
                            </div>
                            {showIconPicker && (
                                <div className="mt-2 grid grid-cols-6 gap-2 p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg h-40 overflow-y-auto">
                                    {iconList.map(iconName => (
                                        <button
                                            key={iconName}
                                            type="button"
                                            onClick={() => { setSelectedIcon(iconName); setShowIconPicker(false); }}
                                            className={`p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 flex justify-center ${selectedIcon === iconName ? 'bg-primary-light dark:bg-primary/20 text-primary dark:text-emerald-300' : ''}`}
                                        >
                                            <Icon name={iconName} size={18} />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="pt-2 space-y-3">
                            <button type="submit" className="btn btn-primary w-full">
                                {editingCategory ? 'Update Category' : 'Add Category'}
                            </button>
                            {editingCategory && onDelete && (
                                <button
                                    type="button"
                                    onClick={handleDelete}
                                    className="w-full bg-red-50 text-red-600 font-semibold px-4 py-3 rounded-lg shadow-sm hover:bg-red-100 transition-colors dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30"
                                >
                                    Remove Category
                                </button>
                            )}
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
};
