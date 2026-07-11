import React, { useContext, useMemo, useState } from 'react';
import { AppContext } from '../App';
import { useToast } from '../context/ToastContext';
import { Card } from '../components/Card';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Icon } from '../components/Icon';
import { RecurringFrequency, RecurringRule, Transaction, TransactionType } from '../types';
import { formatCurrency } from '../utils/currency';
import { todayIsoDate, formatTransactionDate } from '../utils/date';

type RuleForm = {
  id?: string;
  note: string;
  amount: string;
  type: TransactionType;
  accountId: string;
  transferToAccountId: string;
  categoryId: string;
  frequency: RecurringFrequency;
  startDate: string;
  endDate: string;
  active: boolean;
};

const emptyForm = (accountId = ''): RuleForm => ({
  note: '',
  amount: '',
  type: 'expense',
  accountId,
  transferToAccountId: '',
  categoryId: '',
  frequency: 'monthly',
  startDate: todayIsoDate(),
  endDate: '',
  active: true,
});

const frequencyLabels: Record<RecurringFrequency, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  yearly: 'Yearly',
};

const RecurringRuleCard: React.FC<{
  rule: RecurringRule;
  transactions: Transaction[];
  currency: string;
  accountName: (id: string) => string;
  categoryName: (id: string) => string;
  updateRecurring: (id: string, rule: Partial<RecurringRule>) => Promise<boolean>;
  runRecurring: (id: string) => Promise<boolean>;
  editRule: (rule: RecurringRule) => void;
  onDelete: (rule: RecurringRule) => void;
}> = ({ rule, transactions, currency, accountName, categoryName, updateRecurring, runRecurring, editRule, onDelete }) => {
  const [showHistory, setShowHistory] = useState(false);
  const [confirmRun, setConfirmRun] = useState(false);

  const ruleTransactions = useMemo(() => {
    return transactions.filter(t => {
      const expectedNote = rule.note ? `${rule.note}, recurring` : 'recurring';
      return t.accountId === rule.accountId &&
        t.amount === rule.amount &&
        (t.note === expectedNote || t.note === rule.note || t.note.startsWith(expectedNote));
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [transactions, rule]);

  return (
    <Card className={`flex flex-col justify-between h-full hover:shadow-md transition-all ${!rule.active ? 'opacity-70 bg-gray-50/50 dark:bg-gray-800/30' : ''}`}>
      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold capitalize ${
            rule.type === 'income'
              ? 'bg-green-200 text-green-800 dark:bg-green-950/40 dark:text-green-300'
              : rule.type === 'transfer'
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400'
                : 'bg-red-200 text-red-800 dark:bg-red-950/40 dark:text-red-300'
          }`}>
            {rule.type}
          </span>
          <span className={`text-[11px] font-bold ${rule.active ? 'text-success' : 'text-gray-400'}`}>
            {rule.active ? 'Active' : 'Paused'}
          </span>
        </div>
        <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 truncate" title={rule.note}>
          {rule.note}
        </h3>
        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 uppercase tracking-wider font-bold">
          {frequencyLabels[rule.frequency]} • next on {rule.nextRun}
          {rule.endDate ? ` • ends ${rule.endDate}` : ''}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
          {rule.type === 'transfer'
            ? `${accountName(rule.accountId)} → ${accountName(rule.transferToAccountId || '')}`
            : `${accountName(rule.accountId)} • ${categoryName(rule.categoryId || '')}`}
        </p>
      </div>

      <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700/60 flex flex-col gap-2">
        <div className="flex justify-between items-center">
          <span className="text-lg font-bold text-gray-900 dark:text-white">
            {formatCurrency(rule.amount, currency)}
          </span>
          
          {ruleTransactions.length > 0 && (
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center gap-0.5 text-xs font-semibold text-primary hover:underline hover:text-primary-600 transition-colors"
              title="View History / Log collapse"
            >
              <span>History ({ruleTransactions.length})</span>
              <Icon name={showHistory ? 'ChevronUp' : 'ChevronDown'} size={14} />
            </button>
          )}
        </div>

        {/* Collapsible execution log/history */}
        {showHistory && ruleTransactions.length > 0 && (
          <div className="mt-2 bg-gray-50 dark:bg-gray-900/30 p-2.5 rounded-lg border border-gray-100 dark:border-gray-700 max-h-[120px] overflow-y-auto space-y-1.5 scrollbar-thin">
            {ruleTransactions.map(t => (
              <div key={t.id} className="flex justify-between items-center text-[10px] text-gray-600 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800 pb-1 last:border-b-0 last:pb-0">
                <span className="font-semibold">{formatTransactionDate(t.date, true)}</span>
                <span className="font-medium text-gray-500 dark:text-gray-400 truncate max-w-[130px]">{t.note}</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100 dark:border-gray-700/40">
          <button
            onClick={() => updateRecurring(rule.id, { active: !rule.active })}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all border ${
              rule.active
                ? 'bg-gray-200 border-gray-200 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-600'
                : 'bg-green-50 border-green-200 text-success hover:bg-green-100 dark:bg-green-950/20 dark:border-green-800 dark:text-green-400'
            }`}
          >
            {rule.active ? 'Pause' : 'Resume'}
          </button>
          
          <div className="flex items-center gap-1.5">
            {confirmRun ? (
              <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/40 px-2 py-0.5 rounded-lg">
                <span className="text-[9px] font-extrabold text-amber-600 dark:text-amber-400 mr-1 animate-pulse">RUN NOW?</span>
                <button
                  onClick={async () => {
                    await runRecurring(rule.id);
                    setConfirmRun(false);
                  }}
                  className="px-1.5 py-0.5 rounded bg-amber-500 hover:bg-amber-600 text-white text-[9px] font-extrabold transition-all"
                >
                  YES
                </button>
                <button
                  onClick={() => setConfirmRun(false)}
                  className="px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-[9px] font-extrabold transition-all"
                >
                  NO
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmRun(true)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/60 text-amber-600 dark:text-amber-400 hover:bg-amber-100 transition-colors"
                title="Run manual execution now"
              >
                <Icon name="Play" size={12} />
                <span>Run Now</span>
              </button>
            )}
            
            <button
              onClick={() => editRule(rule)}
              className="p-1.5 rounded-md text-gray-500 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="Edit rule"
            >
              <Icon name="Pencil" size={16} />
            </button>
            <button
              onClick={() => onDelete(rule)}
              className="p-1.5 rounded-md text-gray-500 hover:text-danger hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              title="Delete rule"
            >
              <Icon name="Trash2" size={16} />
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
};

export const Recurring: React.FC = () => {
  const context = useContext(AppContext)!;
  const { showToast } = useToast();
  const {
    accounts,
    categories,
    recurring,
    transactions,
    currency,
    theme,
    addRecurring,
    updateRecurring,
    deleteRecurring,
    runRecurring,
  } = context;

  // Frozen accounts are rejected by the backend for recurring rules, so keep
  // them out of the account pickers entirely.
  const selectableAccounts = useMemo(() => accounts.filter(a => !a.frozen), [accounts]);

  const [form, setForm] = useState<RuleForm>(() => emptyForm(selectableAccounts[0]?.id || ''));
  const [deleteTarget, setDeleteTarget] = useState<RecurringRule | null>(null);

  const expenseCategories = categories.filter(category => category.type === form.type);
  const sortedRules = useMemo(
    () => [...recurring].sort((a, b) => a.note.localeCompare(b.note)),
    [recurring]
  );

  const accountName = (id: string) => accounts.find(a => a.id === id)?.name || 'Unknown';
  const categoryName = (id: string) => categories.find(c => c.id === id)?.name || 'Unknown';

  const resetForm = () => {
    setForm(emptyForm(selectableAccounts[0]?.id || ''));
  };

  const editRule = (rule: RecurringRule) => {
    setForm({
      id: rule.id,
      note: rule.note,
      amount: String(rule.amount),
      type: rule.type,
      accountId: rule.accountId,
      transferToAccountId: rule.transferToAccountId || '',
      categoryId: rule.categoryId || '',
      frequency: rule.frequency,
      startDate: rule.startDate,
      endDate: rule.endDate || '',
      active: rule.active,
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.note.trim()) {
      showToast('Please enter a note.', 'error');
      return;
    }
    const amount = parseFloat(form.amount);
    if (isNaN(amount) || amount <= 0) {
      showToast('Please enter a positive amount.', 'error');
      return;
    }
    if (!form.accountId) {
      showToast('Please choose an account.', 'error');
      return;
    }
    if (form.type === 'transfer') {
      if (!form.transferToAccountId) {
        showToast('Please choose a destination account.', 'error');
        return;
      }
      if (form.accountId === form.transferToAccountId) {
        showToast('Source and destination accounts must be different.', 'error');
        return;
      }
    } else if (!form.categoryId) {
      showToast('Please choose a category.', 'error');
      return;
    }

    const payload = {
      note: form.note.trim(),
      amount,
      type: form.type,
      accountId: form.accountId,
      transferToAccountId: form.type === 'transfer' ? form.transferToAccountId : null,
      categoryId: form.type === 'transfer' ? null : form.categoryId,
      frequency: form.frequency,
      startDate: form.startDate,
      endDate: form.endDate || null,
      active: form.active,
    };

    // Only reset the form when the save actually succeeds, so a failed save keeps
    // the user's input instead of wiping it.
    const ok = form.id
      ? await updateRecurring(form.id, payload)
      : await addRecurring(payload);
    if (ok) resetForm();
  };

  return (
    <div className="space-y-6">
      {form.id && (
        <div className="flex justify-end">
          <button onClick={resetForm} className="btn flex items-center gap-2 bg-primary hover:bg-primary-hover text-white font-bold px-4 py-2 rounded-xl transition-all shadow-sm">
            <Icon name="Plus" size={18} />
            New Rule
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[380px,1fr] gap-8">
        {/* Form card on left */}
        <Card className={`self-start transition-all border ${form.id ? 'border-amber-300 dark:border-amber-900 bg-amber-50/5 dark:bg-amber-950/5 shadow-md' : 'border-gray-200 dark:border-gray-700'}`}>
          <h3 className="font-semibold text-lg text-gray-darkest dark:text-gray-100 flex items-center gap-2 mb-4">
            {form.id ? (
              <>
                <Icon name="Pencil" className="text-amber-500" size={18} />
                <span>Edit Rule Settings</span>
              </>
            ) : (
              <>
                <Icon name="Plus" className="text-primary" size={18} />
                <span>Add Rule template</span>
              </>
            )}
          </h3>

          {form.id && (
            <div className="p-3 mb-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-xl flex items-center justify-between text-xs text-amber-700 dark:text-amber-300">
              <div className="flex items-center gap-1.5">
                <Icon name="AlertCircle" size={14} className="text-amber-500 animate-pulse" />
                <span className="font-bold">Editing: "{form.note}"</span>
              </div>
              <button 
                type="button"
                onClick={resetForm} 
                className="text-[10px] uppercase font-black tracking-wider text-amber-600 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-200 hover:underline cursor-pointer"
              >
                Cancel
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-3 gap-1 bg-gray-100 dark:bg-gray-900 p-1 rounded-lg">
              {(['expense', 'income', 'transfer'] as TransactionType[]).map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setForm(prev => ({ ...prev, type, categoryId: '', transferToAccountId: '' }))}
                  className={`px-3 py-2 rounded-md capitalize text-sm font-semibold transition-all ${form.type === type
                    ? form.id 
                      ? 'bg-amber-500 text-white shadow-sm'
                      : 'bg-white text-primary shadow-sm dark:bg-gray-700'
                    : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
                    }`}
                >
                  {type}
                </button>
              ))}
            </div>

            <label className="block">
              <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Note</span>
              <input
                value={form.note}
                onChange={event => setForm(prev => ({ ...prev, note: event.target.value }))}
                className="input"
                placeholder="e.g. Home rent"
              />
            </label>

            <label className="block">
              <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.amount}
                onChange={event => setForm(prev => ({ ...prev, amount: event.target.value }))}
                className="input"
                placeholder="0.00"
              />
            </label>

            <label className="block">
              <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {form.type === 'income' ? 'To account' : 'From account'}
              </span>
              <select
                value={form.accountId}
                onChange={event => setForm(prev => ({ ...prev, accountId: event.target.value }))}
                className="input"
              >
                <option value="">Select account</option>
                {selectableAccounts.map(account => (
                  <option key={account.id} value={account.id}>{account.name}</option>
                ))}
                {/* Keep the currently-selected account visible even if it has since been
                    frozen, so editing an existing rule doesn't silently blank the field. */}
                {form.accountId && !selectableAccounts.some(a => a.id === form.accountId) && (
                  <option value={form.accountId}>{accountName(form.accountId)} (frozen)</option>
                )}
              </select>
            </label>

            {form.type === 'transfer' ? (
              <label className="block">
                <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">To account</span>
                <select
                  value={form.transferToAccountId}
                  onChange={event => setForm(prev => ({ ...prev, transferToAccountId: event.target.value }))}
                  className="input"
                >
                  <option value="">Select account</option>
                  {selectableAccounts.filter(account => account.id !== form.accountId).map(account => (
                    <option key={account.id} value={account.id}>{account.name}</option>
                  ))}
                  {form.transferToAccountId && !selectableAccounts.some(a => a.id === form.transferToAccountId) && (
                    <option value={form.transferToAccountId}>{accountName(form.transferToAccountId)} (frozen)</option>
                  )}
                </select>
              </label>
            ) : (
              <label className="block">
                <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</span>
                <select
                  value={form.categoryId}
                  onChange={event => setForm(prev => ({ ...prev, categoryId: event.target.value }))}
                  className="input"
                >
                  <option value="">Select category</option>
                  {expenseCategories.map(category => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
              </label>
            )}

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Frequency</span>
                <select
                  value={form.frequency}
                  onChange={event => setForm(prev => ({ ...prev, frequency: event.target.value as RecurringFrequency }))}
                  className="input"
                >
                  {Object.entries(frequencyLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{form.id ? 'Next occurrence' : 'First occurrence'}</span>
                 <input
                   type="date"
                   value={form.startDate}
                   onChange={event => setForm(prev => ({ ...prev, startDate: event.target.value }))}
                   className="input dark:[color-scheme:dark]"
                   style={{ colorScheme: theme }}
                 />
              </label>
            </div>

            <div className="flex items-center justify-between">
              <span className="block text-sm font-medium text-gray-700 dark:text-gray-300">Ends on a date</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={!!form.endDate}
                  onChange={event => {
                    if (event.target.checked) {
                      setForm(prev => ({ ...prev, endDate: todayIsoDate() }));
                    } else {
                      setForm(prev => ({ ...prev, endDate: '' }));
                    }
                  }}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/30 dark:peer-focus:ring-primary/80 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
              </label>
            </div>
            {form.endDate !== '' && (
              <label className="block mt-3">
                <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End date</span>
                <input
                  type="date"
                  value={form.endDate}
                  onChange={event => setForm(prev => ({ ...prev, endDate: event.target.value }))}
                  className="input dark:[color-scheme:dark]"
                  style={{ colorScheme: theme }}
                />
              </label>
            )}

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={form.active}
                onChange={event => setForm(prev => ({ ...prev, active: event.target.checked }))}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Active</span>
            </label>

            {form.id ? (
              <div className="flex gap-3">
                <button 
                  type="submit" 
                  className="btn flex-1 flex items-center justify-center gap-2 font-bold py-2.5 transition-all duration-300 text-white rounded-xl bg-amber-500 hover:bg-amber-600 hover:shadow-md"
                >
                  <Icon name="Save" size={18} />
                  Update Rule
                </button>
                <button 
                  type="button" 
                  onClick={resetForm}
                  className="btn flex-1 flex items-center justify-center gap-2 font-bold py-2.5 transition-all duration-300 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-900/30 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/40 rounded-xl"
                >
                  <Icon name="X" size={18} />
                  Cancel
                </button>
              </div>
            ) : (
              <button 
                type="submit" 
                className="btn w-full flex items-center justify-center gap-2 font-bold py-2.5 transition-all duration-300 text-white rounded-xl bg-primary hover:bg-primary-hover shadow-sm"
              >
                <Icon name="Plus" size={18} />
                Add Rule Template
              </button>
            )}
          </form>
        </Card>

        {/* Rules Card Grid on right */}
        <div className="flex-1">
          {sortedRules.length === 0 ? (
            <Card className="text-center py-14">
              <Icon name="RefreshCw" size={48} className="mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-semibold text-gray-darkest dark:text-gray-50">No recurring rules yet</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Add rent, salary, EMI, or subscriptions to automate future entries.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sortedRules.map(rule => (
                <RecurringRuleCard
                  key={rule.id}
                  rule={rule}
                  transactions={transactions}
                  currency={currency}
                  accountName={accountName}
                  categoryName={categoryName}
                  updateRecurring={updateRecurring}
                  runRecurring={runRecurring}
                  editRule={editRule}
                  onDelete={setDeleteTarget}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) deleteRecurring(deleteTarget.id);
        }}
        title="Delete Recurring Rule"
        message={`Delete "${deleteTarget?.note || 'this recurring rule'}"? Future transactions will no longer be created from it.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
};
