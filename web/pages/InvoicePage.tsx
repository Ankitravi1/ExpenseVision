import React, { useContext, useMemo, useState } from 'react';
import { AppContext } from '../App';
import { Card } from '../components/Card';
import { Icon } from '../components/Icon';
import { useToast } from '../context/ToastContext';
import { formatCurrency } from '../utils/currency';
import { todayIsoDate } from '../utils/date';

interface LineItem { id: string; description: string; qty: number; rate: number; }

const genId = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `li-${Date.now()}-${Math.random().toString(36).slice(2)}`);

// Invoice generator (Pro feature). Exports via the browser's print-to-PDF (no
// PDF library yet — see plan.md 7.4), and can optionally record the total as an
// income transaction.
export const InvoicePage: React.FC = () => {
    const ctx = useContext(AppContext);
    const { showToast } = useToast();

    const [fromName, setFromName] = useState('');
    const [fromDetails, setFromDetails] = useState('');
    const [toName, setToName] = useState('');
    const [toDetails, setToDetails] = useState('');
    const [invoiceNo, setInvoiceNo] = useState(`INV-${new Date().getFullYear()}-001`);
    const [issueDate, setIssueDate] = useState(todayIsoDate());
    const [dueDate, setDueDate] = useState('');
    const [items, setItems] = useState<LineItem[]>([{ id: genId(), description: '', qty: 1, rate: 0 }]);
    const [taxPct, setTaxPct] = useState(0);
    const [notes, setNotes] = useState('');
    const [recordAccountId, setRecordAccountId] = useState('');
    const [recorded, setRecorded] = useState(false);

    if (!ctx) return null;
    const { currency, accounts, categories, addTransaction } = ctx;

    const subtotal = useMemo(() => items.reduce((s, i) => s + (Number(i.qty) || 0) * (Number(i.rate) || 0), 0), [items]);
    const taxAmount = useMemo(() => subtotal * (Number(taxPct) || 0) / 100, [subtotal, taxPct]);
    const total = subtotal + taxAmount;

    const updateItem = (id: string, patch: Partial<LineItem>) => setItems(prev => prev.map(i => i.id === id ? { ...i, ...patch } : i));
    const addItem = () => setItems(prev => [...prev, { id: genId(), description: '', qty: 1, rate: 0 }]);
    const removeItem = (id: string) => setItems(prev => (prev.length > 1 ? prev.filter(i => i.id !== id) : prev));

    const handlePrint = () => window.print();

    const handleRecordIncome = async () => {
        if (total <= 0) { showToast('Add at least one line item first.', 'error'); return; }
        const accountId = recordAccountId || accounts.filter(a => !a.frozen)[0]?.id;
        if (!accountId) { showToast('Create an account first to record income.', 'error'); return; }
        const incomeCategory = categories.find(c => c.type === 'income');
        const ok = await addTransaction({
            type: 'income',
            date: `${issueDate}T12:00`,
            amount: Math.round(total * 100) / 100,
            note: `Invoice ${invoiceNo}${toName ? ` — ${toName}` : ''}`,
            accountId,
            categoryId: incomeCategory?.id,
        } as any);
        if (ok) { setRecorded(true); showToast('Recorded invoice total as income.', 'success'); }
    };

    const inputCls = 'w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary dark:text-gray-100';

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 no-print">
                <div>
                    <h2 className="text-3xl font-bold text-gray-darkest dark:text-gray-50">Invoice Generator</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Create an invoice, download it as PDF, and optionally record it as income.</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={handleRecordIncome} disabled={recorded} className="btn btn-secondary flex items-center gap-1.5 disabled:opacity-50">
                        <Icon name={recorded ? 'Check' : 'TrendingUp'} size={16} />
                        {recorded ? 'Recorded' : 'Record as Income'}
                    </button>
                    <button onClick={handlePrint} className="btn btn-primary flex items-center gap-1.5">
                        <Icon name="Download" size={16} />
                        Download / Print
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* ---- Editor (hidden when printing) ---- */}
                <Card className="no-print space-y-4">
                    <h3 className="font-bold text-gray-900 dark:text-white">Details</h3>
                    <div className="grid grid-cols-2 gap-3">
                        <div><label className="text-xs font-semibold text-gray-500 dark:text-gray-400">Invoice #</label><input className={inputCls} value={invoiceNo} onChange={e => setInvoiceNo(e.target.value)} /></div>
                        <div><label className="text-xs font-semibold text-gray-500 dark:text-gray-400">Tax %</label><input type="number" className={inputCls} value={taxPct} onChange={e => setTaxPct(parseFloat(e.target.value) || 0)} /></div>
                        <div><label className="text-xs font-semibold text-gray-500 dark:text-gray-400">Issue date</label><input type="date" className={inputCls} value={issueDate} onChange={e => setIssueDate(e.target.value)} /></div>
                        <div><label className="text-xs font-semibold text-gray-500 dark:text-gray-400">Due date</label><input type="date" className={inputCls} value={dueDate} onChange={e => setDueDate(e.target.value)} /></div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">From (you)</label>
                            <input className={inputCls} placeholder="Your name / business" value={fromName} onChange={e => setFromName(e.target.value)} />
                            <textarea className={`${inputCls} mt-2`} rows={2} placeholder="Address, email, tax id…" value={fromDetails} onChange={e => setFromDetails(e.target.value)} />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">Bill to (client)</label>
                            <input className={inputCls} placeholder="Client name" value={toName} onChange={e => setToName(e.target.value)} />
                            <textarea className={`${inputCls} mt-2`} rows={2} placeholder="Address, email…" value={toDetails} onChange={e => setToDetails(e.target.value)} />
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">Line items</label>
                        <div className="space-y-2 mt-1">
                            {items.map(item => (
                                <div key={item.id} className="flex gap-2 items-center">
                                    <input className={`${inputCls} flex-1`} placeholder="Description" value={item.description} onChange={e => updateItem(item.id, { description: e.target.value })} />
                                    <input type="number" className={`${inputCls} w-16`} title="Qty" value={item.qty} onChange={e => updateItem(item.id, { qty: parseFloat(e.target.value) || 0 })} />
                                    <input type="number" className={`${inputCls} w-24`} title="Rate" value={item.rate} onChange={e => updateItem(item.id, { rate: parseFloat(e.target.value) || 0 })} />
                                    <button onClick={() => removeItem(item.id)} className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg" aria-label="Remove line"><Icon name="Trash2" size={15} /></button>
                                </div>
                            ))}
                        </div>
                        <button onClick={addItem} className="mt-2 text-sm font-semibold text-primary hover:underline flex items-center gap-1"><Icon name="Plus" size={14} /> Add line</button>
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">Notes</label>
                        <textarea className={inputCls} rows={2} placeholder="Payment terms, thank-you note…" value={notes} onChange={e => setNotes(e.target.value)} />
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">Record income to account</label>
                        <select className={inputCls} value={recordAccountId} onChange={e => setRecordAccountId(e.target.value)}>
                            <option value="">First available account</option>
                            {accounts.filter(a => !a.frozen).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                        </select>
                    </div>
                </Card>

                {/* ---- Live preview (this is what prints) ---- */}
                <div className="invoice-print-area">
                    <Card className="!p-8">
                        <div className="flex justify-between items-start mb-8">
                            <div>
                                <h1 className="text-2xl font-black text-gray-900 dark:text-white">INVOICE</h1>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{invoiceNo}</p>
                            </div>
                            <div className="text-right text-xs text-gray-600 dark:text-gray-300">
                                <p><span className="text-gray-400">Issued:</span> {issueDate}</p>
                                {dueDate && <p><span className="text-gray-400">Due:</span> {dueDate}</p>}
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-6 mb-8 text-sm">
                            <div>
                                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1">From</p>
                                <p className="font-semibold text-gray-900 dark:text-white">{fromName || 'Your name'}</p>
                                <p className="text-gray-500 dark:text-gray-400 whitespace-pre-line">{fromDetails}</p>
                            </div>
                            <div>
                                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1">Bill to</p>
                                <p className="font-semibold text-gray-900 dark:text-white">{toName || 'Client'}</p>
                                <p className="text-gray-500 dark:text-gray-400 whitespace-pre-line">{toDetails}</p>
                            </div>
                        </div>
                        <table className="w-full text-sm mb-6">
                            <thead>
                                <tr className="border-b-2 border-gray-200 dark:border-gray-700 text-left text-gray-500 dark:text-gray-400">
                                    <th className="py-2 font-semibold">Description</th>
                                    <th className="py-2 font-semibold text-right w-12">Qty</th>
                                    <th className="py-2 font-semibold text-right w-24">Rate</th>
                                    <th className="py-2 font-semibold text-right w-28">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map(item => (
                                    <tr key={item.id} className="border-b border-gray-100 dark:border-gray-800">
                                        <td className="py-2 text-gray-900 dark:text-gray-100">{item.description || '—'}</td>
                                        <td className="py-2 text-right text-gray-600 dark:text-gray-300">{item.qty}</td>
                                        <td className="py-2 text-right text-gray-600 dark:text-gray-300">{formatCurrency(item.rate, currency)}</td>
                                        <td className="py-2 text-right font-medium text-gray-900 dark:text-white">{formatCurrency((item.qty || 0) * (item.rate || 0), currency)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div className="flex justify-end">
                            <div className="w-56 space-y-1 text-sm">
                                <div className="flex justify-between text-gray-500 dark:text-gray-400"><span>Subtotal</span><span>{formatCurrency(subtotal, currency)}</span></div>
                                {taxPct > 0 && <div className="flex justify-between text-gray-500 dark:text-gray-400"><span>Tax ({taxPct}%)</span><span>{formatCurrency(taxAmount, currency)}</span></div>}
                                <div className="flex justify-between font-bold text-lg text-gray-900 dark:text-white border-t border-gray-200 dark:border-gray-700 pt-2 mt-1"><span>Total</span><span>{formatCurrency(total, currency)}</span></div>
                            </div>
                        </div>
                        {notes && <div className="mt-8 pt-4 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-500 dark:text-gray-400 whitespace-pre-line">{notes}</div>}
                    </Card>
                </div>
            </div>
        </div>
    );
};
