import React, { useContext, useMemo, useState } from 'react';
import { AppContext } from '../App';
import { Card } from '../components/Card';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Icon } from '../components/Icon';
import { RecurringFrequency, RecurringRule, TransactionType } from '../types';
import { formatCurrency } from '../utils/currency';
import { todayIsoDate } from '../utils/date';

type RuleForm = {
  id?: string;
  description: string;
  notes: string;
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
  description: '',
  notes: '',
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

export const Recurring: React.FC = () => {
  const context = useContext(AppContext)!;
  const {
    accounts,
    categories,
    recurring,
    currency,
    addRecurring,
    updateRecurring,
    deleteRecurring,
  } = context;

  const [form, setForm] = useState<RuleForm>(() => emptyForm(accounts[0]?.id || ''));
  const [deleteTarget, setDeleteTarget] = useState<RecurringRule | null>(null);

  const expenseCategories = categories.filter(category => category.type === form.type);
  const sortedRules = useMemo(
    () => [...recurring].sort((a, b) => a.nextRun.localeCompare(b.nextRun)),
    [recurring]
  );

  const accountName = (id?: string | null) => accounts.find(account => account.id === id)?.name || 'Unknown account';
  const categoryName = (id?: string | null) => categories.find(category => category.id === id)?.name || 'Transfer';

  const resetForm = () => {
    setForm(emptyForm(accounts[0]?.id || ''));
  };

  const editRule = (rule: RecurringRule) => {
    setForm({
      id: rule.id,
      description: rule.description,
      notes: rule.notes || '',
      amount: String(rule.amount),
      type: rule.type,
      accountId: rule.accountId,
      transferToAccountId: rule.transferToAccountId || '',
      categoryId: rule.categoryId || '',
      frequency: rule.frequency,
      startDate: rule.nextRun,
      endDate: rule.endDate || '',
      active: rule.active,
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const amount = Number(form.amount);
    if (!form.description.trim() || !amount || amount <= 0 || !form.accountId) {
      alert('Please add a description, amount, and account.');
      return;
    }
    if (form.type === 'transfer') {
      if (!form.transferToAccountId || form.accountId === form.transferToAccountId) {
        alert('Please choose a different destination account.');
        return;
      }
    } else if (!form.categoryId) {
      alert('Please choose a category.');
      return;
    }

    const payload = {
      description: form.description.trim(),
      notes: form.notes.trim() || null,
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

    if (form.id) {
      await updateRecurring(form.id, payload);
    } else {
      await addRecurring(payload);
    }
    resetForm();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-darkest dark:text-gray-50">Recurring Transactions</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Rent, EMI, salary, subscriptions, and other scheduled entries.</p>
        </div>
        {form.id && (
          <button onClick={resetForm} className="btn btn-secondary flex items-center gap-2 self-start">
            <Icon name="Plus" size={18} />
            New Rule
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[380px,1fr] gap-6">
        <Card>
          <h3 className="font-semibold text-lg text-gray-darkest dark:text-gray-50 mb-4">
            {form.id ? 'Edit rule' : 'Add rule'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-3 gap-1 bg-gray-100 dark:bg-gray-900 p-1 rounded-lg">
              {(['expense', 'income', 'transfer'] as TransactionType[]).map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setForm(prev => ({ ...prev, type, categoryId: '', transferToAccountId: '' }))}
                  className={`px-3 py-2 rounded-md capitalize text-sm font-semibold ${form.type === type
                    ? 'bg-white text-primary shadow-sm dark:bg-gray-700'
                    : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
                    }`}
                >
                  {type}
                </button>
              ))}
            </div>

            <label className="block">
              <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</span>
              <input
                value={form.description}
                onChange={event => setForm(prev => ({ ...prev, description: event.target.value }))}
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
                {accounts.map(account => (
                  <option key={account.id} value={account.id}>{account.name}</option>
                ))}
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
                  {accounts.filter(account => account.id !== form.accountId).map(account => (
                    <option key={account.id} value={account.id}>{account.name}</option>
                  ))}
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
                <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Next run</span>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={event => setForm(prev => ({ ...prev, startDate: event.target.value }))}
                  className="input"
                />
              </label>
            </div>

            <label className="block">
              <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End date</span>
              <input
                type="date"
                value={form.endDate}
                onChange={event => setForm(prev => ({ ...prev, endDate: event.target.value }))}
                className="input"
              />
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={form.active}
                onChange={event => setForm(prev => ({ ...prev, active: event.target.checked }))}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Active</span>
            </label>

            <label className="block">
              <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes / tags</span>
              <textarea
                value={form.notes}
                onChange={event => setForm(prev => ({ ...prev, notes: event.target.value }))}
                className="input min-h-20"
                placeholder="Optional notes"
              />
            </label>

            <button type="submit" className="btn btn-primary w-full flex items-center justify-center gap-2">
              <Icon name={form.id ? 'Save' : 'Plus'} size={18} />
              {form.id ? 'Save Rule' : 'Add Rule'}
            </button>
          </form>
        </Card>

        <div className="space-y-4">
          {sortedRules.length === 0 ? (
            <Card className="text-center py-14">
              <Icon name="Repeat" size={48} className="mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-semibold text-gray-darkest dark:text-gray-50">No recurring rules yet</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Add rent, salary, EMI, or subscriptions to automate future entries.</p>
            </Card>
          ) : (
            sortedRules.map(rule => (
              <Card key={rule.id} className={!rule.active ? 'opacity-70' : ''}>
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${rule.type === 'income'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                        : rule.type === 'transfer'
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                        }`}>
                        {rule.type}
                      </span>
                      <span className={`text-xs font-semibold ${rule.active ? 'text-success' : 'text-gray-400'}`}>
                        {rule.active ? 'Active' : 'Paused'}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-gray-darkest dark:text-gray-50 truncate">{rule.description}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {frequencyLabels[rule.frequency]} • next on {rule.nextRun}
                      {rule.endDate ? ` • ends ${rule.endDate}` : ''}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {rule.type === 'transfer'
                        ? `${accountName(rule.accountId)} to ${accountName(rule.transferToAccountId)}`
                        : `${accountName(rule.accountId)} • ${categoryName(rule.categoryId)}`}
                    </p>
                    {rule.notes && <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">{rule.notes}</p>}
                  </div>

                  <div className="flex items-center justify-between gap-4 md:flex-col md:items-end">
                    <span className="text-xl font-bold text-gray-darkest dark:text-gray-50">
                      {formatCurrency(rule.amount, currency)}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateRecurring(rule.id, { active: !rule.active })}
                        className="btn btn-secondary px-3 py-2"
                        title={rule.active ? 'Pause rule' : 'Resume rule'}
                      >
                        {rule.active ? 'Pause' : 'Resume'}
                      </button>
                      <button
                        onClick={() => editRule(rule)}
                        className="p-2 rounded-lg text-gray-500 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-700"
                        title="Edit rule"
                      >
                        <Icon name="Pencil" size={18} />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(rule)}
                        className="p-2 rounded-lg text-gray-500 hover:text-danger hover:bg-red-50 dark:hover:bg-red-900/20"
                        title="Delete rule"
                      >
                        <Icon name="Trash2" size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              </Card>
            ))
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
        message={`Delete "${deleteTarget?.description || 'this recurring rule'}"? Future transactions will no longer be created from it.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
};
