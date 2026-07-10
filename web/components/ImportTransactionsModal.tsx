import React, { useState, useContext, useRef } from 'react';
import { AppContext } from '../App';
import { Icon } from './Icon';
import { api } from '../services/api';
import { displayDateToIso, formatTransactionDate } from '../utils/date';
import { formatCurrency } from '../utils/currency';

interface ImportTransactionsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImportSuccess?: (minDate: string, maxDate: string) => void;
}

export const ImportTransactionsModal: React.FC<ImportTransactionsModalProps> = ({ isOpen, onClose, onImportSuccess }) => {
    const context = useContext(AppContext);
    const [activeTab, setActiveTab] = useState<'csv' | 'ai'>('csv');
    const [file, setFile] = useState<File | null>(null);
    const [previewData, setPreviewData] = useState<any[]>([]);
    const [validationErrors, setValidationErrors] = useState<string[]>([]);
    const [isImporting, setIsImporting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // AI Statement States
    const [aiText, setAiText] = useState('');
    const [isAiParsing, setIsAiParsing] = useState(false);
    const [aiDrafts, setAiDrafts] = useState<any[]>([]);
    const [selectedAiDraftIndexes, setSelectedAiDraftIndexes] = useState<number[]>([]);
    const aiFileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen || !context) return null;

    const { accounts, categories, refreshData, transactions, currency } = context;

    // Load PDF.js dynamically from CDN for client-side text extraction
    const loadPdfJs = () => {
        return new Promise<any>((resolve, reject) => {
            if ((window as any).pdfjsLib) {
                resolve((window as any).pdfjsLib);
                return;
            }
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js';
            script.onload = () => {
                const pdfjsLib = (window as any).pdfjsLib;
                pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
                resolve(pdfjsLib);
            };
            script.onerror = reject;
            document.head.appendChild(script);
        });
    };

    const extractTextFromPdf = async (pdfFile: File): Promise<string> => {
        const pdfjsLib = await loadPdfJs();
        const arrayBuffer = await pdfFile.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = '';
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map((item: any) => item.str).join(' ');
            fullText += `\n--- Page ${i} ---\n` + pageText;
        }
        return fullText;
    };

    const handleAiFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            setIsAiParsing(true);
            try {
                let text = '';
                if (selectedFile.type === 'application/pdf' || selectedFile.name.endsWith('.pdf')) {
                    text = await extractTextFromPdf(selectedFile);
                } else {
                    text = await selectedFile.text();
                }
                setAiText(text);
            } catch (err: any) {
                alert('Failed to extract text from file: ' + err.message);
            } finally {
                setIsAiParsing(false);
            }
        }
    };

    const handleAiParse = async () => {
        if (!aiText.trim()) {
            alert('Please paste some text or upload a statement file.');
            return;
        }
        setIsAiParsing(true);
        try {
            const result = await api.parseStatement(aiText);
            const drafts = result.drafts || [];
            setAiDrafts(drafts);

            // Select only non-duplicate drafts by default
            const autoSelectIndices: number[] = [];
            drafts.forEach((draft: any, index: number) => {
                if (!checkIsDuplicate(draft)) {
                    autoSelectIndices.push(index);
                }
            });
            setSelectedAiDraftIndexes(autoSelectIndices);
        } catch (err: any) {
            alert('AI Extraction failed: ' + err.message);
        } finally {
            setIsAiParsing(false);
        }
    };

    const checkIsDuplicate = (row: any) => {
        const rowDate = row.date.substring(0, 10);
        return transactions.some(t => 
            t.date === rowDate &&
            Math.abs(t.amount - row.amount) < 0.01 &&
            t.type === row.type &&
            t.note.toLowerCase().includes(row.note.toLowerCase())
        );
    };

    const downloadTemplate = () => {
        const headers = ['Date', 'Time', 'Note', 'Amount', 'Account', 'Type', 'Category', 'Transfer To'];
        const csvContent = headers.join(',') + '\n' +
            '01-01-2025,12:00,Groceries,50.00,Savings Account,expense,Groceries,\n' +
            '02-01-2025,09:00,Salary,2000.00,Savings Account,income,Salary,\n' +
            '03-01-2025,18:30,Transfer to SBI Card,1000.00,Savings Account,transfer,,Credit Card\n';

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

            const getIndex = (name: string) => headers.findIndex(h => h.includes(name.toLowerCase()));

            const typeIdx = getIndex('type');
            const dateIdx = getIndex('date');
            const timeIdx = getIndex('time');
            const amountIdx = getIndex('amount');
            const noteIdx = getIndex('note');
            const accIdx = getIndex('account');
            const catIdx = getIndex('category');
            const transferIdx = getIndex('transfer to');

            if (typeIdx === -1 || dateIdx === -1 || amountIdx === -1 || accIdx === -1) {
                setValidationErrors(['Invalid CSV format. Missing required columns: Type, Date, Amount, Account']);
                return;
            }

            const formatDateToISO = (dateStr: string) => {
                if (!dateStr) return null;
                return displayDateToIso(dateStr);
            };

            const parseTime = (timeStr: string) => {
                if (!timeStr) return '00:00';
                const cleanStr = String(timeStr).trim();
                if (/^\d{3,4}$/.test(cleanStr)) {
                    const padded = cleanStr.padStart(4, '0');
                    return `${padded.slice(0, 2)}:${padded.slice(2)}`;
                }
                if (cleanStr.toLowerCase().includes('pm') || cleanStr.toLowerCase().includes('am')) {
                    const d = new Date(`2000-01-01 ${cleanStr}`);
                    if (!isNaN(d.getTime())) {
                        return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
                    }
                }
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
                const note = cols[noteIdx] || '';
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
                    note,
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

    const handleImportCSV = async () => {
        if (previewData.length === 0) return;

        setIsImporting(true);
        try {
            await api.importTransactions(previewData);
            await refreshData();

            if (onImportSuccess && previewData.length > 0) {
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

    const handleImportAiDrafts = async () => {
        const selectedDrafts = aiDrafts.filter((_, idx) => selectedAiDraftIndexes.includes(idx));
        if (selectedDrafts.length === 0) {
            alert('Please select at least one transaction to import.');
            return;
        }

        setIsImporting(true);
        try {
            // Map drafts to expected import format
            const payload = selectedDrafts.map(d => ({
                type: d.type,
                date: `${d.date}T12:00`,
                amount: d.amount,
                note: d.note,
                accountId: d.accountId || accounts[0]?.id || '',
                categoryId: d.type === 'transfer' ? undefined : (d.categoryId || categories.find(c => c.type === d.type)?.id || undefined),
                transferToAccountId: d.type === 'transfer' ? (d.transferToAccountId || undefined) : undefined
            }));

            await api.importTransactions(payload);
            await refreshData();

            if (onImportSuccess && payload.length > 0) {
                const sorted = [...payload].sort((a, b) => a.date.localeCompare(b.date));
                const minDate = sorted[0].date.split('T')[0];
                const maxDate = sorted[sorted.length - 1].date.split('T')[0];
                onImportSuccess(minDate, maxDate);
            }

            onClose();
            alert(`Successfully imported ${payload.length} transactions using AI.`);
        } catch (error) {
            console.error('AI Import failed:', error);
            alert('Failed to import transactions.');
        } finally {
            setIsImporting(false);
        }
    };

    const toggleSelectAiDraft = (index: number) => {
        setSelectedAiDraftIndexes(prev =>
            prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
        );
    };

    return (
        <>
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={onClose} />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col pointer-events-auto transform transition-all border border-gray-150 dark:border-gray-700">
                    
                    {/* Header with tabs */}
                    <div className="p-6 border-b border-gray-150 dark:border-gray-700 flex flex-col gap-4 shrink-0 bg-gray-50/50 dark:bg-gray-800/50">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xl font-bold dark:text-white flex items-center gap-2">
                                <Icon name="Upload" className="text-primary dark:text-indigo-400" />
                                <span>Import Transactions</span>
                            </h3>
                            <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-205 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 transition-colors">
                                <Icon name="X" size={20} />
                            </button>
                        </div>

                        <div className="flex border-b border-gray-200 dark:border-gray-700">
                            <button
                                onClick={() => setActiveTab('csv')}
                                className={`px-4 py-2 text-sm font-bold border-b-2 transition-all -mb-px ${
                                    activeTab === 'csv'
                                        ? 'border-primary text-primary dark:border-indigo-400 dark:text-indigo-400'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                                }`}
                            >
                                Standard CSV Import
                            </button>
                            <button
                                onClick={() => setActiveTab('ai')}
                                className={`px-4 py-2 text-sm font-bold border-b-2 transition-all -mb-px flex items-center gap-1.5 ${
                                    activeTab === 'ai'
                                        ? 'border-primary text-primary dark:border-indigo-400 dark:text-indigo-400'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                                }`}
                            >
                                <Icon name="Sparkles" size={14} className="text-amber-500 animate-pulse" />
                                AI Bank Statement PDF/Text
                            </button>
                        </div>
                    </div>

                    <div className="p-6 flex-1 overflow-y-auto space-y-6 scrollbar-thin">
                        {activeTab === 'csv' ? (
                            <>
                                {/* CSV Template Download */}
                                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg flex items-start justify-between">
                                    <div>
                                        <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-1 text-sm">Need a CSV template?</h4>
                                        <p className="text-xs text-blue-700 dark:text-blue-300">Download our CSV template to match the required columns: Date, Time, Note, Amount, Type, Category, Account, Transfer To.</p>
                                    </div>
                                    <button onClick={downloadTemplate} className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 rounded-lg shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-all text-xs font-bold border border-gray-100 dark:border-gray-700">
                                        <Icon name="Download" size={14} />
                                        Template
                                    </button>
                                </div>

                                {/* CSV Drag and Drop */}
                                <div className="border-2 border-dashed border-gray-300 dark:border-gray-650 rounded-xl p-8 text-center hover:border-primary transition-all cursor-pointer bg-gray-50/20 dark:bg-gray-850/10" onClick={() => fileInputRef.current?.click()}>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileChange}
                                        accept=".csv"
                                        className="hidden"
                                    />
                                    <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-3">
                                        <Icon name="FileSpreadsheet" size={24} />
                                    </div>
                                    <p className="text-gray-900 dark:text-white font-bold mb-1 text-sm">
                                        {file ? file.name : 'Click to select CSV File'}
                                    </p>
                                    <p className="text-xs text-gray-400 dark:text-gray-500">Comma-separated files only</p>
                                </div>

                                {/* CSV Preview Table & Errors */}
                                {file && (
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h4 className="font-bold text-sm dark:text-white">CSV Preview</h4>
                                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${validationErrors.length > 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                                {validationErrors.length > 0 ? `${validationErrors.length} Errors Found` : `${previewData.length} Valid Rows`}
                                            </span>
                                        </div>

                                        {validationErrors.length > 0 ? (
                                            <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg space-y-2 max-h-40 overflow-y-auto">
                                                {validationErrors.map((err, i) => (
                                                    <div key={i} className="flex items-start gap-2 text-xs text-red-700 dark:text-red-300">
                                                        <Icon name="AlertCircle" size={14} className="mt-0.5 flex-shrink-0" />
                                                        <span>{err}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="bg-gray-50 dark:bg-gray-800/40 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                                                <table className="w-full text-xs text-left">
                                                    <thead className="bg-gray-100 dark:bg-gray-700 text-gray-550 dark:text-gray-300 font-bold">
                                                        <tr>
                                                            <th className="px-4 py-2">Date</th>
                                                            <th className="px-4 py-2">Note</th>
                                                            <th className="px-4 py-2">Amount</th>
                                                            <th className="px-4 py-2">Account</th>
                                                            <th className="px-4 py-2">Category</th>
                                                            <th className="px-4 py-2">Duplicates</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-200 dark:divide-gray-750">
                                                        {previewData.map((row, i) => {
                                                            const isDup = checkIsDuplicate(row);
                                                            return (
                                                                <tr key={i} className="text-gray-700 dark:text-gray-300">
                                                                    <td className="px-4 py-2">{formatTransactionDate(row.date)}</td>
                                                                    <td className="px-4 py-2 font-medium truncate max-w-[120px]">{row.note}</td>
                                                                    <td className="px-4 py-2 font-bold">{formatCurrency(row.amount, currency)}</td>
                                                                    <td className="px-4 py-2">{accounts.find(a => a.id === row.accountId)?.name}</td>
                                                                    <td className="px-4 py-2">{categories.find(c => c.id === row.categoryId)?.name || 'Transfer'}</td>
                                                                    <td className="px-4 py-2">
                                                                        {isDup && (
                                                                            <span className="text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 px-2 py-0.5 rounded font-extrabold flex items-center gap-1 w-max">
                                                                                ⚠️ Duplicate
                                                                            </span>
                                                                        )}
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </>
                        ) : (
                            <>
                                {/* AI Bank Statement upload instructions */}
                                <div className="space-y-4">
                                    <div className="bg-amber-50/50 dark:bg-amber-950/10 p-4 border border-amber-200 dark:border-amber-900/40 rounded-xl">
                                        <h4 className="font-extrabold text-amber-850 dark:text-amber-400 mb-1 text-sm flex items-center gap-1.5">
                                            <Icon name="Sparkles" size={16} />
                                            AI Bank Statement Extraction
                                        </h4>
                                        <p className="text-xs text-amber-700 dark:text-amber-300/80 leading-normal">
                                            Upload a statement file (.pdf, .txt, .csv) or paste the statement text directly. 
                                            We will automatically parse all transactions, match categories, detect existing accounts, and highlight duplicates.
                                        </p>
                                    </div>

                                    {/* Document upload for AI */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="border border-dashed border-gray-300 dark:border-gray-650 rounded-xl p-6 text-center hover:border-amber-400 transition-all cursor-pointer bg-gray-50/10 dark:bg-gray-800/10 flex flex-col items-center justify-center min-h-[160px]" onClick={() => aiFileInputRef.current?.click()}>
                                            <input
                                                type="file"
                                                ref={aiFileInputRef}
                                                onChange={handleAiFileChange}
                                                accept=".pdf,.txt,.csv"
                                                className="hidden"
                                            />
                                            <div className="w-10 h-10 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-full flex items-center justify-center mb-3">
                                                <Icon name="FileText" size={20} />
                                            </div>
                                            <p className="text-xs font-bold text-gray-700 dark:text-gray-250">
                                                Upload PDF / Text Statement
                                            </p>
                                            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">PDF & text files accepted</p>
                                        </div>

                                        <div className="flex flex-col">
                                            <label htmlFor="ai-pasted-text" className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase">Or Paste Statement Text</label>
                                            <textarea
                                                id="ai-pasted-text"
                                                value={aiText}
                                                onChange={e => setAiText(e.target.value)}
                                                placeholder="Paste text copied from PDF statement here..."
                                                className="input text-xs font-medium w-full flex-1 min-h-[130px] rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-3 leading-normal outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 scrollbar-thin resize-none"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex justify-end pt-2">
                                        <button
                                            type="button"
                                            onClick={handleAiParse}
                                            disabled={isAiParsing || !aiText.trim()}
                                            className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-white text-xs font-extrabold flex items-center gap-1.5 shadow-sm"
                                        >
                                            {isAiParsing ? (
                                                <>
                                                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                    <span>Analyzing statement...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Icon name="Sparkles" size={14} />
                                                    <span>Extract Transactions</span>
                                                </>
                                            )}
                                        </button>
                                    </div>

                                    {/* AI Preview Drafts List */}
                                    {aiDrafts.length > 0 && (
                                        <div className="space-y-3 pt-4 border-t border-gray-150 dark:border-gray-700">
                                            <div className="flex items-center justify-between">
                                                <h4 className="font-extrabold text-sm text-gray-700 dark:text-gray-200">Extracted drafts ({aiDrafts.length})</h4>
                                                <span className="text-xs font-bold text-gray-400 dark:text-gray-500">Uncheck duplicates before import</span>
                                            </div>

                                            <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-gray-50/30 dark:bg-gray-800/40">
                                                <table className="w-full text-xs text-left">
                                                    <thead className="bg-gray-100 dark:bg-gray-700 text-gray-550 dark:text-gray-300 font-bold">
                                                        <tr>
                                                            <th className="px-4 py-2 w-[5%] text-center">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={selectedAiDraftIndexes.length === aiDrafts.length}
                                                                    onChange={() => {
                                                                        if (selectedAiDraftIndexes.length === aiDrafts.length) {
                                                                            setSelectedAiDraftIndexes([]);
                                                                        } else {
                                                                            setSelectedAiDraftIndexes(aiDrafts.map((_, i) => i));
                                                                        }
                                                                    }}
                                                                    className="w-4 h-4 rounded text-primary focus:ring-primary border-gray-300 dark:border-gray-650 focus:ring-2 cursor-pointer"
                                                                />
                                                            </th>
                                                            <th className="px-4 py-2">Date</th>
                                                            <th className="px-4 py-2">Description</th>
                                                            <th className="px-4 py-2">Amount</th>
                                                            <th className="px-4 py-2">Category</th>
                                                            <th className="px-4 py-2">Account</th>
                                                            <th className="px-4 py-2 text-right">Duplicate?</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-200 dark:divide-gray-750">
                                                        {aiDrafts.map((row, i) => {
                                                            const isSelected = selectedAiDraftIndexes.includes(i);
                                                            const isDup = checkIsDuplicate(row);
                                                            return (
                                                                <tr key={i} className={`text-gray-700 dark:text-gray-300 ${isDup ? 'opacity-65' : ''}`}>
                                                                    <td className="px-4 py-2 text-center">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={isSelected}
                                                                            onChange={() => toggleSelectAiDraft(i)}
                                                                            className="w-4 h-4 rounded text-primary focus:ring-primary border-gray-300 dark:border-gray-650 focus:ring-2 cursor-pointer"
                                                                        />
                                                                    </td>
                                                                    <td className="px-4 py-2">{row.date}</td>
                                                                    <td className="px-4 py-2 truncate max-w-[150px] font-medium" title={row.note}>{row.note}</td>
                                                                    <td className="px-4 py-2 font-bold">{formatCurrency(row.amount, currency)}</td>
                                                                    <td className="px-4 py-2">
                                                                        {row.type === 'transfer' ? (
                                                                            <span className="text-[10px] px-2 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400 font-bold uppercase">
                                                                                Transfer
                                                                            </span>
                                                                        ) : (
                                                                            row.categoryName || 'Uncategorized'
                                                                        )}
                                                                    </td>
                                                                    <td className="px-4 py-2">{row.accountName || 'Unknown Account'}</td>
                                                                    <td className="px-4 py-2 text-right">
                                                                        {isDup && (
                                                                            <span className="inline-flex text-[10px] bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400 px-2 py-0.5 rounded font-extrabold align-middle">
                                                                                ⚠️ Duplicate
                                                                            </span>
                                                                        )}
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>

                    <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3 shrink-0">
                        <button onClick={onClose} className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 font-bold hover:bg-gray-105 dark:hover:bg-gray-700 rounded-lg transition-colors border border-gray-205 dark:border-gray-700">
                            Cancel
                        </button>
                        {activeTab === 'csv' ? (
                            <button
                                onClick={handleImportCSV}
                                disabled={!file || validationErrors.length > 0 || isImporting || previewData.length === 0}
                                className="px-4 py-2 bg-primary text-white text-sm font-bold rounded-lg shadow-sm hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                            >
                                {isImporting ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        <span>Importing...</span>
                                    </>
                                ) : (
                                    <>
                                        <Icon name="Check" size={18} />
                                        <span>Import Transactions</span>
                                    </>
                                )}
                            </button>
                        ) : (
                            <button
                                onClick={handleImportAiDrafts}
                                disabled={selectedAiDraftIndexes.length === 0 || isImporting}
                                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold rounded-lg shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 animate-fadeIn"
                            >
                                {isImporting ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        <span>Importing...</span>
                                    </>
                                ) : (
                                    <>
                                        <Icon name="Check" size={18} />
                                        <span>Import Selected ({selectedAiDraftIndexes.length})</span>
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};
