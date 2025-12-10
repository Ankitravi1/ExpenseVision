import React, { useState, useContext, useRef } from 'react';
import { AppContext } from '../App';
import { Icon } from './Icon';
import { api } from '../services/api';

interface ImportTransactionsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImportSuccess?: (minDate: string, maxDate: string) => void;
}

export const ImportTransactionsModal: React.FC<ImportTransactionsModalProps> = ({ isOpen, onClose, onImportSuccess }) => {
    const context = useContext(AppContext);
    const [file, setFile] = useState<File | null>(null);
    const [previewData, setPreviewData] = useState<any[]>([]);
    const [validationErrors, setValidationErrors] = useState<string[]>([]);
    const [isImporting, setIsImporting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen || !context) return null;

    const { accounts, categories, refreshData } = context;

    const downloadTemplate = () => {
        const headers = ['Type', 'Date (YYYY-MM-DD)', 'Time', 'Amount', 'Description', 'Account', 'Category', 'Transfer To'];
        const csvContent = headers.join(',') + '\n' +
            'expense,2025-01-01,12:00,50.00,Groceries,Checking Account,Groceries,\n' +
            'income,2025-01-02,09:00,2000.00,Salary,Checking Account,Salary,\n';

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'transaction_import_template.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            setFile(selectedFile);
            parseCSV(selectedFile);
        }
    };

    const parseCSV = (file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            if (!text) return;

            const lines = text.split('\n');
            const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

            const parsed: any[] = [];
            const errors: string[] = [];

            // Helper to find index (fuzzy match)
            const getIndex = (name: string) => headers.findIndex(h => h.includes(name.toLowerCase()));

            const typeIdx = getIndex('type');
            const dateIdx = getIndex('date');
            const timeIdx = getIndex('time');
            const amountIdx = getIndex('amount');
            const descIdx = getIndex('description');
            const accIdx = getIndex('account');
            const catIdx = getIndex('category');
            const transferIdx = getIndex('transfer to');

            if (typeIdx === -1 || dateIdx === -1 || amountIdx === -1 || accIdx === -1) {
                setValidationErrors(['Invalid CSV format. Missing required columns: Type, Date, Amount, Account']);
                return;
            }

            // Helper to format date to YYYY-MM-DD (Local Time)
            const formatDateToISO = (dateStr: string) => {
                if (!dateStr) return null;
                const d = new Date(dateStr);
                if (!isNaN(d.getTime())) {
                    const year = d.getFullYear();
                    const month = String(d.getMonth() + 1).padStart(2, '0');
                    const day = String(d.getDate()).padStart(2, '0');
                    return `${year}-${month}-${day}`;
                }
                return null;
            };

            // Helper to parse time
            const parseTime = (timeStr: string) => {
                if (!timeStr) return '00:00';

                // Handle "1330" or 1330 format
                const cleanStr = String(timeStr).trim();
                if (/^\d{3,4}$/.test(cleanStr)) {
                    const padded = cleanStr.padStart(4, '0');
                    return `${padded.slice(0, 2)}:${padded.slice(2)}`;
                }

                // Handle "1:30 pm" or "13:30"
                // Simple check for AM/PM
                if (cleanStr.toLowerCase().includes('pm') || cleanStr.toLowerCase().includes('am')) {
                    // Create a dummy date with this time string to let JS parse it
                    // Prepend a date so Date() can parse "1:30 pm"
                    const d = new Date(`2000-01-01 ${cleanStr}`);
                    if (!isNaN(d.getTime())) {
                        return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
                    }
                }

                // Assume HH:MM
                if (cleanStr.includes(':')) {
                    return cleanStr;
                }

                return '00:00';
            };

            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;

                const cols = line.split(',').map(c => c.trim());

                if (cols.length < headers.length) continue;

                const type = cols[typeIdx]?.toLowerCase();
                const rawDate = cols[dateIdx];
                const rawTime = cols[timeIdx];
                const amount = parseFloat(cols[amountIdx]);
                const description = cols[descIdx] || '';
                const accountName = cols[accIdx];
                const categoryName = cols[catIdx];
                const transferToName = cols[transferIdx];

                if (!['expense', 'income', 'transfer'].includes(type)) {
                    errors.push(`Row ${i + 1}: Invalid type '${type}'`);
                    continue;
                }

                if (isNaN(amount) || amount <= 0) {
                    errors.push(`Row ${i + 1}: Invalid amount`);
                    continue;
                }

                const formattedDate = formatDateToISO(rawDate);
                if (!formattedDate) {
                    errors.push(`Row ${i + 1}: Invalid date format '${rawDate}'`);
                    continue;
                }

                const time = parseTime(rawTime);

                const account = accounts.find(a => a.name.toLowerCase() === accountName?.toLowerCase());
                if (!account) {
                    errors.push(`Row ${i + 1}: Account '${accountName}' not found`);
                    continue;
                }

                let categoryId = undefined;
                if (type !== 'transfer') {
                    const category = categories.find(c => c.name.toLowerCase() === categoryName?.toLowerCase() && c.type === type);
                    if (!category) {
                        errors.push(`Row ${i + 1}: Category '${categoryName}' not found for type '${type}'`);
                        continue;
                    }
                    categoryId = category.id;
                }

                let transferToAccountId = undefined;
                if (type === 'transfer') {
                    const destAccount = accounts.find(a => a.name.toLowerCase() === transferToName?.toLowerCase());
                    if (!destAccount) {
                        errors.push(`Row ${i + 1}: Destination Account '${transferToName}' not found`);
                        continue;
                    }
                    transferToAccountId = destAccount.id;
                }

                parsed.push({
                    type,
                    date: `${formattedDate}T${time}`,
                    amount,
                    description,
                    accountId: account.id,
                    categoryId,
                    transferToAccountId
                });
            }

            setValidationErrors(errors);
            setPreviewData(parsed);
        };
        reader.readAsText(file);
    };

    const handleImport = async () => {
        if (previewData.length === 0) return;

        setIsImporting(true);
        try {
            await api.importTransactions(previewData);
            await refreshData();

            if (onImportSuccess && previewData.length > 0) {
                // Sort by date string to find min/max without timezone issues
                const sorted = [...previewData].sort((a, b) => a.date.localeCompare(b.date));
                const minDate = sorted[0].date.split('T')[0];
                const maxDate = sorted[sorted.length - 1].date.split('T')[0];
                onImportSuccess(minDate, maxDate);
            }

            onClose();
            alert(`Successfully imported ${previewData.length} transactions.`);
        } catch (error) {
            console.error('Import failed:', error);
            alert('Failed to import transactions.');
        } finally {
            setIsImporting(false);
        }
    };

    return (
        <>
            <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={onClose} />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                    <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                        <h3 className="text-xl font-bold dark:text-white">Import Transactions</h3>
                        <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
                            <Icon name="X" size={24} />
                        </button>
                    </div>

                    <div className="p-6 flex-1 overflow-y-auto space-y-6">
                        {/* Template Download */}
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg flex items-start justify-between">
                            <div>
                                <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">Need a template?</h4>
                                <p className="text-sm text-blue-700 dark:text-blue-300">Download our CSV template to ensure your data is formatted correctly.</p>
                            </div>
                            <button onClick={downloadTemplate} className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 rounded-lg shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium">
                                <Icon name="Download" size={16} />
                                Download CSV
                            </button>
                        </div>

                        {/* File Upload */}
                        <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center hover:border-primary dark:hover:border-primary transition-colors cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                accept=".csv"
                                className="hidden"
                            />
                            <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
                                <Icon name="Upload" size={24} />
                            </div>
                            <p className="text-gray-900 dark:text-white font-medium mb-1">
                                {file ? file.name : 'Click to upload or drag and drop'}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">CSV files only</p>
                        </div>

                        {/* Validation Results */}
                        {file && (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h4 className="font-semibold dark:text-white">Preview</h4>
                                    <span className={`text-sm font-medium ${validationErrors.length > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                        {validationErrors.length > 0 ? `${validationErrors.length} Errors Found` : `${previewData.length} Valid Transactions`}
                                    </span>
                                </div>

                                {validationErrors.length > 0 ? (
                                    <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg space-y-2 max-h-40 overflow-y-auto">
                                        {validationErrors.map((err, i) => (
                                            <div key={i} className="flex items-start gap-2 text-sm text-red-700 dark:text-red-300">
                                                <Icon name="AlertCircle" size={16} className="mt-0.5 flex-shrink-0" />
                                                <span>{err}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg overflow-hidden">
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                                                <tr>
                                                    <th className="px-4 py-2">Date</th>
                                                    <th className="px-4 py-2">Description</th>
                                                    <th className="px-4 py-2">Amount</th>
                                                    <th className="px-4 py-2">Account</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                                {previewData.slice(0, 5).map((row, i) => (
                                                    <tr key={i} className="text-gray-700 dark:text-gray-300">
                                                        <td className="px-4 py-2">{row.date.split('T')[0]}</td>
                                                        <td className="px-4 py-2">{row.description}</td>
                                                        <td className="px-4 py-2">{row.amount}</td>
                                                        <td className="px-4 py-2">{accounts.find(a => a.id === row.accountId)?.name}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        {previewData.length > 5 && (
                                            <div className="px-4 py-2 text-xs text-gray-500 text-center border-t border-gray-200 dark:border-gray-700">
                                                And {previewData.length - 5} more...
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
                        <button onClick={onClose} className="px-4 py-2 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                            Cancel
                        </button>
                        <button
                            onClick={handleImport}
                            disabled={!file || validationErrors.length > 0 || isImporting || previewData.length === 0}
                            className="px-4 py-2 bg-primary text-white font-medium rounded-lg shadow-sm hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                        >
                            {isImporting ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Importing...
                                </>
                            ) : (
                                <>
                                    <Icon name="Check" size={18} />
                                    Import Transactions
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};
