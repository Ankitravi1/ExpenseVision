import React, { useContext, useEffect, useRef, useState } from 'react';
import { AppContext } from '../../App';
import { useToast } from '../../context/ToastContext';
import { Icon } from '../Icon';
import { ConfirmDialog } from '../ConfirmDialog';
import { api } from '../../services/api';
import { loadTesseract, loadXlsx, extractTextFromPdf } from './fileLoaders';

type WizardStep = 'input' | 'bank' | 'parsing' | 'preview' | 'success';

interface DraftRow {
    localId: string;
    date: string; // YYYY-MM-DD
    time: string; // HH:mm
    note: string;
    amount: number;
    type: 'income' | 'expense' | 'transfer';
    accountId: string;
    categoryId: string;
    transferToAccountId: string;
    included: boolean;
    isDuplicate: boolean;
}

const genId = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `row-${Date.now()}-${Math.random().toString(36).slice(2)}`);

export const ImportWizard: React.FC = () => {
    const context = useContext(AppContext);
    const { showToast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [step, setStep] = useState<WizardStep>('input');
    const [inputMode, setInputMode] = useState<'file' | 'paste'>('file');
    const [file, setFile] = useState<File | null>(null);
    const [pastedText, setPastedText] = useState('');
    const [extractedText, setExtractedText] = useState('');
    const [bankName, setBankName] = useState('');
    const [statementDetails, setStatementDetails] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [processStatus, setProcessStatus] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    const [aiSettings, setAiSettings] = useState<any>(null);
    const [isSettingsLoading, setIsSettingsLoading] = useState(true);

    const [drafts, setDrafts] = useState<DraftRow[]>([]);
    const [duplicatesChecked, setDuplicatesChecked] = useState(false);
    const [colFilters, setColFilters] = useState({ note: '', account: '', type: '', category: '' });
    const [isImporting, setIsImporting] = useState(false);
    const [importedCount, setImportedCount] = useState(0);
    const [isRemoveConfirmOpen, setIsRemoveConfirmOpen] = useState(false);
    const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

    // Inline PDF password prompt state (mirrors ImportTransactionsModal)
    const [pdfPasswordPrompt, setPdfPasswordPrompt] = useState<{ attempt: number } | null>(null);
    const [pdfPasswordInput, setPdfPasswordInput] = useState('');
    const passwordResolverRef = useRef<((value: string | null) => void) | null>(null);

    useEffect(() => {
        api.fetch('/ai-settings')
            .then(r => r.ok ? r.json() : null)
            .then(data => {
                setAiSettings(data);
                setIsSettingsLoading(false);
            })
            .catch(() => setIsSettingsLoading(false));
    }, []);

    if (!context) return null;
    const { accounts, categories, transactions, refreshData } = context;

    // A user can use AI import if the feature isn't turned off AND a key is
    // available — either their own (advanced) or the host/platform key (default).
    const hasOwnKey = (aiSettings?.keys?.[aiSettings?.provider]?.length ?? 0) > 0;
    const canUseAi = aiSettings?.useOwnKey ? hasOwnKey : (aiSettings?.platformAvailable === true || hasOwnKey);
    const isAiImportEnabled = aiSettings?.importEnabled !== false && canUseAi;
    const isAdvancedAiUser = aiSettings?.useOwnKey === true;

    const requestPdfPassword = (attempt: number): Promise<string | null> => {
        return new Promise(resolve => {
            passwordResolverRef.current = resolve;
            setPdfPasswordInput('');
            setPdfPasswordPrompt({ attempt });
        });
    };

    const submitPdfPassword = () => {
        const resolver = passwordResolverRef.current;
        passwordResolverRef.current = null;
        setPdfPasswordPrompt(null);
        if (resolver) resolver(pdfPasswordInput);
    };

    const cancelPdfPassword = () => {
        const resolver = passwordResolverRef.current;
        passwordResolverRef.current = null;
        setPdfPasswordPrompt(null);
        if (resolver) resolver(null);
    };

    const resetWizard = () => {
        setStep('input');
        setInputMode('file');
        setFile(null);
        setPastedText('');
        setExtractedText('');
        setBankName('');
        setStatementDetails('');
        setIsProcessing(false);
        setProcessStatus('');
        setErrorMsg('');
        setDrafts([]);
        setDuplicatesChecked(false);
        setColFilters({ note: '', account: '', type: '', category: '' });
        setIsImporting(false);
        setImportedCount(0);
        setPdfPasswordPrompt(null);
        if (passwordResolverRef.current) {
            passwordResolverRef.current(null);
            passwordResolverRef.current = null;
        }
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // ---- Step 1: file/text -> extracted text ----

    const processFile = async (selectedFile: File) => {
        setFile(selectedFile);
        setIsProcessing(true);
        setErrorMsg('');
        const fileName = selectedFile.name.toLowerCase();

        try {
            let text = '';
            if (fileName.endsWith('.csv') || fileName.endsWith('.txt')) {
                setProcessStatus('Reading file text...');
                text = await selectedFile.text();
            } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
                setProcessStatus('Loading spreadsheet engine...');
                const XLSX = await loadXlsx();
                const arrayBuffer = await selectedFile.arrayBuffer();
                const workbook = XLSX.read(arrayBuffer, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                text = XLSX.utils.sheet_to_csv(worksheet);
            } else if (fileName.endsWith('.pdf')) {
                setProcessStatus('Extracting text from PDF...');
                text = await extractTextFromPdf(selectedFile, requestPdfPassword);
            } else if (/\.(png|jpe?g|webp)$/i.test(fileName)) {
                setProcessStatus('Loading OCR engine...');
                const Tesseract = await loadTesseract();
                setProcessStatus('Running OCR scan on image...');
                const resultOcr = await Tesseract.recognize(selectedFile, 'eng');
                text = resultOcr.data.text;
                if (!text || text.trim().length < 10) {
                    throw new Error('Could not read legible text from image. Please ensure image has high contrast.');
                }
            } else {
                setProcessStatus('Reading file as text...');
                text = await selectedFile.text();
            }

            if (!text || text.trim().length < 5) {
                throw new Error('No readable text could be extracted from this file.');
            }

            setExtractedText(text);
            setStep('bank');
        } catch (err: any) {
            setErrorMsg(err.message || 'Failed to process file');
        } finally {
            setIsProcessing(false);
            setProcessStatus('');
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            processFile(e.target.files[0]);
        }
    };

    // Sample rows shared by the CSV and Excel templates so users have a
    // correctly-shaped file to fill in and re-import.
    const TEMPLATE_HEADERS = ['Date', 'Time', 'Note', 'Amount', 'Account', 'Type', 'Category', 'Transfer To'];
    const TEMPLATE_ROWS = [
        ['01-01-2025', '12:00', 'Groceries', '50.00', 'Savings Account', 'expense', 'Groceries', ''],
        ['02-01-2025', '09:00', 'Salary', '2000.00', 'Savings Account', 'income', 'Salary', ''],
        ['03-01-2025', '18:30', 'Transfer to Credit Card', '1000.00', 'Savings Account', 'transfer', '', 'Credit Card'],
    ];

    const triggerDownload = (blob: Blob, filename: string) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    };

    const downloadCsvTemplate = () => {
        const csvContent = [TEMPLATE_HEADERS, ...TEMPLATE_ROWS]
            .map(row => row.join(','))
            .join('\n') + '\n';
        triggerDownload(new Blob([csvContent], { type: 'text/csv' }), 'transaction_import_template.csv');
    };

    const downloadExcelTemplate = async () => {
        try {
            const XLSX = await loadXlsx();
            const worksheet = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS, ...TEMPLATE_ROWS]);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Transactions');
            const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
            triggerDownload(
                new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
                'transaction_import_template.xlsx'
            );
        } catch (err: any) {
            showToast(err.message || 'Failed to generate Excel template', 'error');
        }
    };

    const handleUsePastedText = () => {
        if (!pastedText.trim()) {
            showToast('Please paste some text first.', 'error');
            return;
        }
        setFile(null);
        setExtractedText(pastedText);
        setErrorMsg('');
        setStep('bank');
    };

    // ---- Step 2 -> 3: bank details + AI parse ----

    const checkIsDuplicate = (row: { date: string; amount: number }) => {
        const rowDate = row.date.substring(0, 10);
        return transactions.some(t =>
            t.date.substring(0, 10) === rowDate &&
            Math.abs(t.amount - row.amount) < 0.01
        );
    };

    const handleParseWithAi = async () => {
        if (!isAiImportEnabled) {
            showToast('AI Statement Import is disabled or has no API key configured. Please enable it in Settings first.', 'error');
            return;
        }
        setStep('parsing');
        setIsProcessing(true);
        setProcessStatus('Analyzing statement with AI...');
        setErrorMsg('');

        try {
            const contextLines = [
                bankName.trim() ? `Bank / card issuer: ${bankName.trim()}` : '',
                statementDetails.trim() ? `Additional details from the user: ${statementDetails.trim()}` : '',
            ].filter(Boolean);
            const textForAi = contextLines.length > 0
                ? `${contextLines.join('\n')}\n\n${extractedText}`
                : extractedText;
            const result = await api.parseStatement(textForAi);
            const rawDrafts = result.drafts || [];
            // Duplicate detection is a separate, on-demand step (the "Detect
            // Duplicates" button below) — freshly parsed rows are never
            // auto-flagged or auto-unchecked.
            const mapped: DraftRow[] = rawDrafts.map((d: any) => ({
                localId: genId(),
                date: d.date || '',
                time: '12:00',
                note: d.note || '',
                amount: Number(d.amount) || 0,
                type: ['income', 'expense', 'transfer'].includes(d.type) ? d.type : 'expense',
                accountId: d.accountId || accounts[0]?.id || '',
                categoryId: d.type === 'transfer' ? '' : (d.categoryId || categories.find(c => c.type === d.type)?.id || ''),
                transferToAccountId: d.type === 'transfer' ? (d.transferToAccountId || '') : '',
                included: true,
                isDuplicate: false,
            }));

            setDuplicatesChecked(false);

            if (mapped.length === 0) {
                setErrorMsg('AI did not find any transactions in this statement.');
                setStep('bank');
                return;
            }

            setDrafts(mapped);
            setStep('preview');
        } catch (err: any) {
            setErrorMsg(err.message || 'AI Statement parsing failed');
            setStep('bank');
        } finally {
            setIsProcessing(false);
            setProcessStatus('');
        }
    };

    // ---- Step 4: preview / edit ----

    const updateRow = (localId: string, patch: Partial<DraftRow>) => {
        setDrafts(prev => prev.map(r => r.localId === localId ? { ...r, ...patch } : r));
    };

    const toggleRowIncluded = (localId: string) => {
        setDrafts(prev => prev.map(r => r.localId === localId ? { ...r, included: !r.included } : r));
    };

    const toggleSelectAll = () => {
        const allIncluded = drafts.length > 0 && drafts.every(r => r.included);
        setDrafts(prev => prev.map(r => ({ ...r, included: !allIncluded })));
    };

    // On-demand duplicate check: important (it prevents double-importing
    // statement lines that already exist) but optional — nothing runs it
    // automatically. Matches on the same date (ignoring time) + amount.
    const runDuplicateDetection = () => {
        const updated = drafts.map(r => {
            const dup = checkIsDuplicate(r);
            return { ...r, isDuplicate: dup, included: dup ? false : r.included };
        });
        const dupCount = updated.filter(r => r.isDuplicate).length;
        setDrafts(updated);
        setDuplicatesChecked(true);
        showToast(
            dupCount > 0
                ? `Found ${dupCount} possible duplicate${dupCount === 1 ? '' : 's'} — unchecked below for review.`
                : 'No possible duplicates found.',
            dupCount > 0 ? 'info' : 'success'
        );
    };

    const filteredDrafts = drafts.filter(r => {
        if (colFilters.note && !r.note.toLowerCase().includes(colFilters.note.toLowerCase())) return false;
        if (colFilters.account) {
            const accName = accounts.find(a => a.id === r.accountId)?.name || '';
            if (accName !== colFilters.account) return false;
        }
        if (colFilters.type && r.type !== colFilters.type) return false;
        if (colFilters.category) {
            const catName = r.type === 'transfer' ? 'Transfer' : (categories.find(c => c.id === r.categoryId)?.name || '');
            if (catName !== colFilters.category) return false;
        }
        return true;
    });

    const removeSelected = () => {
        const idsToRemove = new Set(drafts.filter(r => r.included).map(r => r.localId));
        if (idsToRemove.size === 0) {
            showToast('No rows selected to remove.', 'info');
            return;
        }
        setDrafts(prev => prev.filter(r => !idsToRemove.has(r.localId)));
        setIsRemoveConfirmOpen(false);
        showToast(`Removed ${idsToRemove.size} row(s) from preview.`, 'success');
    };

    const includedCount = drafts.filter(r => r.included).length;
    const duplicateCount = drafts.filter(r => r.isDuplicate).length;

    const handleCommitImport = async () => {
        const rowsToImport = drafts.filter(r => r.included);
        if (rowsToImport.length === 0) {
            showToast('Please select at least one transaction to import.', 'error');
            return;
        }
        if (rowsToImport.length > 500) {
            showToast('Bulk import limited to 500 transactions per batch. Please deselect some rows and import in smaller batches.', 'error');
            return;
        }

        setIsImporting(true);
        try {
            const payload = rowsToImport.map(r => ({
                type: r.type,
                date: `${r.date}T${r.time || '12:00'}`,
                amount: r.amount,
                note: r.note,
                accountId: r.accountId || accounts[0]?.id || '',
                categoryId: r.type === 'transfer' ? undefined : (r.categoryId || undefined),
                transferToAccountId: r.type === 'transfer' ? (r.transferToAccountId || undefined) : undefined,
            }));

            await api.importTransactions(payload);
            await refreshData();

            setImportedCount(payload.length);
            setStep('success');
            showToast(`Successfully imported ${payload.length} transactions.`, 'success');
        } catch (error: any) {
            console.error('Import failed:', error);
            showToast(error.message || 'Failed to import transactions.', 'error');
        } finally {
            setIsImporting(false);
        }
    };

    const stepIndex = { input: 1, bank: 2, parsing: 3, preview: 4, success: 5 }[step];

    const StepBadge: React.FC<{ n: number; label: string }> = ({ n, label }) => (
        <div className={`flex items-center gap-2 ${stepIndex === n ? 'text-primary dark:text-indigo-400' : stepIndex > n ? 'text-emerald-500' : 'text-gray-300 dark:text-gray-600'}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold border-2 ${
                stepIndex === n ? 'border-primary dark:border-indigo-400' : stepIndex > n ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-gray-300 dark:border-gray-600'
            }`}>
                {stepIndex > n ? <Icon name="Check" size={12} /> : n}
            </div>
            <span className="text-xs font-bold hidden sm:inline">{label}</span>
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Stepper */}
            <div className="flex items-center gap-3 sm:gap-6 flex-wrap border-b border-gray-100 dark:border-gray-800 pb-4">
                <StepBadge n={1} label="File to Text" />
                <Icon name="ChevronRight" size={14} className="text-gray-300 dark:text-gray-700" />
                <StepBadge n={2} label="Statement Details" />
                <Icon name="ChevronRight" size={14} className="text-gray-300 dark:text-gray-700" />
                <StepBadge n={3} label="AI Formatting" />
                <Icon name="ChevronRight" size={14} className="text-gray-300 dark:text-gray-700" />
                <StepBadge n={4} label="Review & Import" />
            </div>

            {!isSettingsLoading && !isAiImportEnabled && step !== 'success' && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex items-start gap-3">
                    <Icon name="AlertTriangle" className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" size={18} />
                    <p className="text-sm text-amber-800 dark:text-amber-300">
                        {isAdvancedAiUser ? (
                            <>AI Statement Import is disabled or has no API key configured. Enable it and add an API key in <span className="font-bold">Settings → AI Settings</span> before parsing a statement.</>
                        ) : (
                            <>AI-assisted import is temporarily unavailable. You can still add transactions manually, or download a CSV/Excel template above to fill in and import.</>
                        )}
                    </p>
                </div>
            )}

            {/* STEP 1: File to text */}
            {step === 'input' && (
                <div className="space-y-4">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-900/40">
                        <p className="text-sm text-blue-800 dark:text-blue-200">
                            Upload your bank/card statement in any format — we'll convert it to text first.
                        </p>
                    </div>

                    <div className="flex gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl border border-gray-200 dark:border-gray-700 w-fit">
                        <button
                            onClick={() => setInputMode('file')}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${inputMode === 'file' ? 'bg-white dark:bg-gray-700 text-primary dark:text-indigo-400 shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}
                        >
                            Upload File
                        </button>
                        <button
                            onClick={() => setInputMode('paste')}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${inputMode === 'paste' ? 'bg-white dark:bg-gray-700 text-primary dark:text-indigo-400 shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}
                        >
                            Paste Text
                        </button>
                    </div>

                    {isProcessing && !pdfPasswordPrompt && (
                        <div className="py-16 flex flex-col items-center justify-center gap-4 text-center">
                            <div className="w-10 h-10 border-4 border-primary/20 border-t-primary dark:border-indigo-400/20 dark:border-t-indigo-400 rounded-full animate-spin" />
                            <p className="text-sm font-bold text-gray-700 dark:text-gray-300">{processStatus}</p>
                        </div>
                    )}

                    {pdfPasswordPrompt && (
                        <div className="py-10 flex flex-col items-center justify-center gap-4 text-center">
                            <div className="w-12 h-12 bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-full flex items-center justify-center">
                                <Icon name="Lock" size={24} />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-gray-900 dark:text-white">
                                    {pdfPasswordPrompt.attempt === 0 ? 'This PDF is password-protected' : 'Incorrect password, please try again'}
                                </p>
                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Attempt {pdfPasswordPrompt.attempt + 1} of 3</p>
                            </div>
                            <div className="w-full max-w-xs flex flex-col gap-3">
                                <input
                                    type="password"
                                    autoFocus
                                    value={pdfPasswordInput}
                                    onChange={e => setPdfPasswordInput(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') submitPdfPassword(); }}
                                    placeholder="Enter PDF password"
                                    className="input text-sm w-full rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-3 outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
                                />
                                <div className="flex justify-center gap-3">
                                    <button type="button" onClick={cancelPdfPassword} className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 font-bold hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors border border-gray-200 dark:border-gray-700">
                                        Cancel
                                    </button>
                                    <button type="button" onClick={submitPdfPassword} className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold transition-all">
                                        Unlock
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {!isProcessing && !pdfPasswordPrompt && inputMode === 'file' && (
                        <div
                            className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center hover:border-primary dark:hover:border-indigo-400 transition-all cursor-pointer bg-gray-50/20 dark:bg-gray-800/10 flex flex-col items-center justify-center min-h-[160px]"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                accept=".csv,.xlsx,.xls,.pdf,.png,.jpg,.jpeg,.webp,.txt"
                                className="hidden"
                            />
                            <div className="w-12 h-12 bg-primary/10 text-primary dark:text-indigo-400 rounded-full flex items-center justify-center mx-auto mb-3">
                                <Icon name="FileSpreadsheet" size={24} />
                            </div>
                            <p className="text-gray-900 dark:text-white font-bold mb-1 text-sm">
                                Select CSV, Excel, PDF, Receipt Image, or Text file
                            </p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Automatic OCR & text extraction, password-protected PDFs supported</p>
                        </div>
                    )}

                    {/* Template download — for users who'd rather fill in a clean
                        spreadsheet than import a bank statement. */}
                    {!isProcessing && !pdfPasswordPrompt && inputMode === 'file' && (
                        <div className="bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-start gap-2.5 min-w-0">
                                <Icon name="FileSpreadsheet" size={18} className="text-primary dark:text-indigo-400 mt-0.5 flex-shrink-0" />
                                <div className="min-w-0">
                                    <p className="text-sm font-bold text-gray-800 dark:text-gray-200">Prefer to start from a template?</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                        Download our standard format, fill it in, and upload it above. If your file doesn't match this layout, the AI parser will still map the columns for you.
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <button
                                    type="button"
                                    onClick={downloadCsvTemplate}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-gray-800 text-primary dark:text-indigo-400 rounded-lg shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-all text-xs font-bold border border-gray-200 dark:border-gray-700"
                                >
                                    <Icon name="Download" size={14} />
                                    CSV
                                </button>
                                <button
                                    type="button"
                                    onClick={downloadExcelTemplate}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-gray-800 text-primary dark:text-indigo-400 rounded-lg shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-all text-xs font-bold border border-gray-200 dark:border-gray-700"
                                >
                                    <Icon name="Download" size={14} />
                                    Excel
                                </button>
                            </div>
                        </div>
                    )}

                    {!isProcessing && !pdfPasswordPrompt && inputMode === 'paste' && (
                        <div className="flex flex-col gap-3">
                            <textarea
                                value={pastedText}
                                onChange={e => setPastedText(e.target.value)}
                                placeholder="Paste raw bank statement text or receipt transcripts here..."
                                className="input text-xs font-medium w-full min-h-[180px] rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-3 leading-normal outline-none focus:ring-1 focus:ring-primary focus:border-primary resize-none scrollbar-thin"
                            />
                            <div className="flex justify-end">
                                <button
                                    type="button"
                                    onClick={handleUsePastedText}
                                    disabled={!pastedText.trim()}
                                    className="btn btn-primary flex items-center gap-1.5 text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Icon name="ChevronRight" size={14} />
                                    Continue
                                </button>
                            </div>
                        </div>
                    )}

                    {errorMsg && (
                        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl space-y-2 border border-red-200 dark:border-red-900/40">
                            <h4 className="font-bold text-red-800 dark:text-red-300 text-sm flex items-center gap-1.5">
                                <Icon name="AlertCircle" size={16} />
                                <span>{errorMsg}</span>
                            </h4>
                        </div>
                    )}
                </div>
            )}

            {/* STEP 2: Bank details & mapping guidance */}
            {step === 'bank' && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h4 className="font-bold text-sm dark:text-white flex items-center gap-1.5">
                            <Icon name="FileText" size={16} className="text-primary dark:text-indigo-400" />
                            Text extracted from {file ? file.name : 'pasted text'}
                        </h4>
                        <button onClick={() => setStep('input')} className="text-xs text-rose-500 hover:text-rose-700 font-bold hover:underline flex items-center gap-1">
                            <Icon name="X" size={12} />
                            Start Over
                        </button>
                    </div>

                    <div>
                        <label htmlFor="bank-name" className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase">Bank / Card Issuer (optional)</label>
                        <input
                            id="bank-name"
                            type="text"
                            value={bankName}
                            onChange={e => setBankName(e.target.value)}
                            placeholder="e.g. HDFC Bank, Chase, American Express..."
                            className="input w-full rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-3 text-sm outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                        />
                    </div>

                    <div>
                        <label htmlFor="statement-details" className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase">Anything else the AI should know (optional)</label>
                        <textarea
                            id="statement-details"
                            value={statementDetails}
                            onChange={e => setStatementDetails(e.target.value)}
                            placeholder="e.g. This statement covers two accounts — only import the Rewards Credit Card (ending 4821), not the Savings account. Or: amounts in parentheses are refunds/credits."
                            rows={3}
                            className="input w-full rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-3 text-sm outline-none focus:ring-1 focus:ring-primary focus:border-primary resize-none"
                        />
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                            If this statement lists <strong className="font-semibold text-gray-500 dark:text-gray-400">multiple accounts or card numbers</strong>, say which one to use here — otherwise the AI may mix transactions from all of them together. Both fields above are optional context for the AI and won't block the import if left blank.
                        </p>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-1.5">
                        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">How the AI will map fields</p>
                        <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1 leading-relaxed">
                            <li><strong className="text-gray-800 dark:text-gray-200">Expense</strong> = Money Out (debit entries)</li>
                            <li><strong className="text-gray-800 dark:text-gray-200">Income</strong> = Money In (credit entries)</li>
                            <li><strong className="text-gray-800 dark:text-gray-200">Category</strong> = decided by AI from your existing categories</li>
                            <li><strong className="text-gray-800 dark:text-gray-200">Note</strong> = transaction detail / summary line</li>
                            <li><strong className="text-gray-800 dark:text-gray-200">Date</strong> = transaction date</li>
                            <li><strong className="text-gray-800 dark:text-gray-200">Time</strong> = AI-extracted if present, otherwise defaults to 12:00</li>
                            <li><strong className="text-gray-800 dark:text-gray-200">Account</strong> = matched to one of your existing accounts by name, or the one you specify above</li>
                        </ul>
                    </div>

                    {errorMsg && (
                        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl border border-red-200 dark:border-red-900/40 text-xs text-red-700 dark:text-red-300 flex items-start gap-1.5">
                            <Icon name="AlertCircle" size={14} className="mt-0.5 flex-shrink-0" />
                            <span>{errorMsg}</span>
                        </div>
                    )}

                    <div className="flex justify-end">
                        <button
                            onClick={handleParseWithAi}
                            disabled={!isAiImportEnabled || isSettingsLoading}
                            className="btn btn-primary flex items-center gap-1.5 text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Icon name="Sparkles" size={14} />
                            Format with AI
                        </button>
                    </div>
                </div>
            )}

            {/* STEP 3: parsing loading */}
            {step === 'parsing' && (
                <div className="py-20 flex flex-col items-center justify-center gap-4 text-center">
                    <div className="w-10 h-10 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
                    <p className="text-sm font-bold text-gray-700 dark:text-gray-300">{processStatus || 'Analyzing statement with AI...'}</p>
                </div>
            )}

            {/* STEP 4: preview / edit / commit */}
            {step === 'preview' && (
                <div className="space-y-4">
                    {/* Primary actions up top: Start Over / Import, plus the live count */}
                    <div className="flex flex-wrap items-center justify-between gap-3 bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                        <div>
                            <h4 className="font-bold text-sm dark:text-white flex items-center gap-1.5">
                                <Icon name="Sparkles" size={16} className="text-amber-500" />
                                Review Extracted Transactions ({drafts.length})
                            </h4>
                            <p className="text-xs text-gray-400 mt-0.5">
                                {includedCount} of {drafts.length} selected for import. Nothing is saved yet — edit, filter, or remove rows below first.
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setIsResetConfirmOpen(true)}
                                className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 font-bold hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                            >
                                Start Over
                            </button>
                            <button
                                onClick={handleCommitImport}
                                disabled={includedCount === 0 || isImporting}
                                className="btn btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isImporting ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        <span>Importing...</span>
                                    </>
                                ) : (
                                    <>
                                        <Icon name="Check" size={16} />
                                        <span>Import {includedCount} Transaction{includedCount === 1 ? '' : 's'}</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Toolbar: duplicate detection (important, optional) + remove selected */}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2 flex-wrap">
                            <button
                                onClick={runDuplicateDetection}
                                className="px-3.5 py-2 bg-amber-50 dark:bg-amber-950/20 border-2 border-amber-300 dark:border-amber-800/60 text-amber-700 dark:text-amber-400 rounded-lg text-xs font-bold hover:bg-amber-100 dark:hover:bg-amber-950/40 transition-colors flex items-center gap-1.5 shadow-sm"
                                title="Optional — checks the rows below against your existing transactions by date and amount"
                            >
                                <Icon name="AlertTriangle" size={14} />
                                Detect Duplicates
                            </button>
                            {duplicatesChecked && (
                                <span className={`text-xs font-bold px-2.5 py-1.5 rounded-lg ${
                                    duplicateCount > 0
                                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                                        : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400'
                                }`}>
                                    {duplicateCount > 0 ? `⚠️ ${duplicateCount} possible duplicate${duplicateCount === 1 ? '' : 's'}` : '✓ No duplicates found'}
                                </span>
                            )}
                        </div>
                        <button
                            onClick={() => setIsRemoveConfirmOpen(true)}
                            disabled={includedCount === 0}
                            className="px-3 py-1.5 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 rounded-lg text-xs font-bold hover:bg-rose-100 dark:hover:bg-rose-950/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            title="Removes the checked rows from this preview only"
                        >
                            Remove Selected
                        </button>
                    </div>

                    <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-xl">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-xs">
                            <thead className="bg-gray-100 dark:bg-gray-900">
                                <tr>
                                    <th className="px-3 py-2 text-center w-[3%]">
                                        <input
                                            type="checkbox"
                                            checked={drafts.length > 0 && drafts.every(r => r.included)}
                                            onChange={toggleSelectAll}
                                            className="w-4 h-4 rounded text-primary focus:ring-primary border-gray-300 dark:border-gray-600 focus:ring-2 cursor-pointer"
                                        />
                                    </th>
                                    <th className="px-3 py-2 text-left font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Date</th>
                                    <th className="px-3 py-2 text-left font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Note</th>
                                    <th className="px-3 py-2 text-left font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Amount</th>
                                    <th className="px-3 py-2 text-left font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Account</th>
                                    <th className="px-3 py-2 text-left font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Type</th>
                                    <th className="px-3 py-2 text-left font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Category</th>
                                    <th className="px-3 py-2 text-left font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Transfer To</th>
                                </tr>
                                <tr className="bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                                    <th className="px-3 py-1.5"></th>
                                    <th className="px-3 py-1.5"></th>
                                    <th className="px-3 py-1.5">
                                        <input
                                            type="text"
                                            placeholder="Filter Note..."
                                            value={colFilters.note}
                                            onChange={e => setColFilters(prev => ({ ...prev, note: e.target.value }))}
                                            className="input text-xs py-1 px-2 w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md outline-none focus:ring-1 focus:ring-primary"
                                        />
                                    </th>
                                    <th className="px-3 py-1.5"></th>
                                    <th className="px-3 py-1.5">
                                        <select
                                            value={colFilters.account}
                                            onChange={e => setColFilters(prev => ({ ...prev, account: e.target.value }))}
                                            className="input text-xs py-1 px-2 w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md outline-none cursor-pointer"
                                        >
                                            <option value="">All Accounts</option>
                                            {accounts.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
                                        </select>
                                    </th>
                                    <th className="px-3 py-1.5">
                                        <select
                                            value={colFilters.type}
                                            onChange={e => setColFilters(prev => ({ ...prev, type: e.target.value }))}
                                            className="input text-xs py-1 px-2 w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md outline-none cursor-pointer"
                                        >
                                            <option value="">All Types</option>
                                            <option value="income">Income</option>
                                            <option value="expense">Expense</option>
                                            <option value="transfer">Transfer</option>
                                        </select>
                                    </th>
                                    <th className="px-3 py-1.5">
                                        <select
                                            value={colFilters.category}
                                            onChange={e => setColFilters(prev => ({ ...prev, category: e.target.value }))}
                                            className="input text-xs py-1 px-2 w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md outline-none cursor-pointer"
                                        >
                                            <option value="">All Categories</option>
                                            <option value="Transfer">Transfer</option>
                                            {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                        </select>
                                    </th>
                                    <th className="px-3 py-1.5"></th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                                {filteredDrafts.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                                            No rows match the current filters.
                                        </td>
                                    </tr>
                                ) : filteredDrafts.map(row => (
                                    <tr key={row.localId} className={`hover:bg-gray-50 dark:hover:bg-gray-700/40 ${row.isDuplicate ? 'bg-amber-50/60 dark:bg-amber-950/10' : ''}`}>
                                        <td className="px-3 py-2 text-center">
                                            <input
                                                type="checkbox"
                                                checked={row.included}
                                                onChange={() => toggleRowIncluded(row.localId)}
                                                className="w-4 h-4 rounded text-primary focus:ring-primary border-gray-300 dark:border-gray-600 focus:ring-2 cursor-pointer"
                                            />
                                        </td>
                                        <td className="px-3 py-2">
                                            <div className="flex flex-col gap-1">
                                                <input
                                                    type="date"
                                                    value={row.date}
                                                    onChange={e => updateRow(row.localId, { date: e.target.value })}
                                                    className="input text-xs py-1 px-1.5 w-32 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded"
                                                />
                                                <input
                                                    type="time"
                                                    value={row.time}
                                                    onChange={e => updateRow(row.localId, { time: e.target.value })}
                                                    className="input text-xs py-1 px-1.5 w-32 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded"
                                                />
                                            </div>
                                            {row.isDuplicate && (
                                                <span className="mt-1 inline-flex text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 px-1.5 py-0.5 rounded font-extrabold w-max">
                                                    ⚠️ Possible duplicate
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-3 py-2">
                                            <input
                                                type="text"
                                                value={row.note}
                                                onChange={e => updateRow(row.localId, { note: e.target.value })}
                                                className="input text-xs py-1 px-1.5 w-40 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded"
                                            />
                                        </td>
                                        <td className="px-3 py-2">
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={row.amount}
                                                onChange={e => updateRow(row.localId, { amount: parseFloat(e.target.value) || 0 })}
                                                className="input text-xs py-1 px-1.5 w-24 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded font-bold"
                                            />
                                        </td>
                                        <td className="px-3 py-2">
                                            <select
                                                value={row.accountId}
                                                onChange={e => updateRow(row.localId, { accountId: e.target.value })}
                                                className="input text-xs py-1 px-1.5 w-32 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded cursor-pointer"
                                            >
                                                <option value="">Select...</option>
                                                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                            </select>
                                        </td>
                                        <td className="px-3 py-2">
                                            <select
                                                value={row.type}
                                                onChange={e => {
                                                    const newType = e.target.value as DraftRow['type'];
                                                    updateRow(row.localId, {
                                                        type: newType,
                                                        categoryId: newType === 'transfer' ? '' : (categories.find(c => c.type === newType)?.id || ''),
                                                        transferToAccountId: newType === 'transfer' ? row.transferToAccountId : '',
                                                    });
                                                }}
                                                className="input text-xs py-1 px-1.5 w-24 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded cursor-pointer"
                                            >
                                                <option value="expense">Expense</option>
                                                <option value="income">Income</option>
                                                <option value="transfer">Transfer</option>
                                            </select>
                                        </td>
                                        <td className="px-3 py-2">
                                            {row.type === 'transfer' ? (
                                                <span className="text-gray-300 dark:text-gray-600">—</span>
                                            ) : (
                                                <select
                                                    value={row.categoryId}
                                                    onChange={e => updateRow(row.localId, { categoryId: e.target.value })}
                                                    className="input text-xs py-1 px-1.5 w-32 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded cursor-pointer"
                                                >
                                                    <option value="">Uncategorized</option>
                                                    {categories.filter(c => c.type === row.type).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                                </select>
                                            )}
                                        </td>
                                        <td className="px-3 py-2">
                                            {row.type === 'transfer' ? (
                                                <select
                                                    value={row.transferToAccountId}
                                                    onChange={e => updateRow(row.localId, { transferToAccountId: e.target.value })}
                                                    className="input text-xs py-1 px-1.5 w-32 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded cursor-pointer"
                                                >
                                                    <option value="">Select...</option>
                                                    {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                                </select>
                                            ) : (
                                                <span className="text-gray-300 dark:text-gray-600">—</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* STEP 5: success */}
            {step === 'success' && (
                <div className="py-16 flex flex-col items-center justify-center gap-4 text-center">
                    <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center">
                        <Icon name="CheckCircle" size={32} />
                    </div>
                    <div>
                        <p className="text-lg font-bold text-gray-900 dark:text-white">Imported {importedCount} transaction{importedCount === 1 ? '' : 's'}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Your transactions have been added.</p>
                    </div>
                    <button onClick={resetWizard} className="btn btn-primary flex items-center gap-1.5 mt-2">
                        <Icon name="Upload" size={14} />
                        Import Another Statement
                    </button>
                </div>
            )}

            <ConfirmDialog
                isOpen={isRemoveConfirmOpen}
                onClose={() => setIsRemoveConfirmOpen(false)}
                onConfirm={removeSelected}
                title="Remove Selected Rows"
                message={`Remove the ${includedCount} selected row(s) from this preview? This only affects the preview — no real transactions have been created yet.`}
                confirmText="Remove Selected"
                cancelText="Cancel"
                variant="danger"
            />

            <ConfirmDialog
                isOpen={isResetConfirmOpen}
                onClose={() => setIsResetConfirmOpen(false)}
                onConfirm={resetWizard}
                title="Start Over"
                message="This will discard the current file/text, extracted data, and all edits made to the preview. Nothing has been imported yet. Continue?"
                confirmText="Start Over"
                cancelText="Cancel"
                variant="warning"
            />
        </div>
    );
};
