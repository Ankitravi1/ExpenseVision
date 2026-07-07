import React, { useState, useEffect } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SheetModal, Input, Button, ChipSelector, FieldLabel, OptionSheet, DateField, successHaptic } from './ui';
import { useData } from '../context/DataContext';
import { useTheme } from '../context/ThemeContext';
import { Transaction, TransactionType } from '../types';
import { api } from '../services/api';
import { getAiSettings } from '../services/aiSettings';
import { radius, spacing } from '../theme';
import { displayDateToIso, isoDateToDisplay, todayIsoDate } from '../utils/date';

interface Props {
    visible: boolean;
    onClose: () => void;
    editing?: Transaction | null;
}

export const TransactionForm: React.FC<Props> = ({ visible, onClose, editing }) => {
    const { accounts, categories, addTransaction, updateTransaction } = useData();
    const { theme } = useTheme();
    const [type, setType] = useState<TransactionType>('expense');
    const [amount, setAmount] = useState('');
    const [note, setNote] = useState('');
    const [date, setDate] = useState(todayIsoDate());
    const [accountId, setAccountId] = useState<string | null>(null);
    const [transferToAccountId, setTransferToAccountId] = useState<string | null>(null);
    const [categoryId, setCategoryId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [quickEntry, setQuickEntry] = useState('');
    const [parsing, setParsing] = useState(false);
    const [parseMessage, setParseMessage] = useState('');
    const [aiSettings, setAiSettings] = useState<{ enabled: boolean; apiKey: string } | null>(null);

    useEffect(() => {
        getAiSettings().then(setAiSettings).catch(console.error);
    }, []);

    useEffect(() => {
        if (visible) {
            if (editing) {
                setType(editing.type);
                setAmount(String(editing.amount));
                setNote(editing.note);
                setDate(editing.date.split('T')[0]);
                setAccountId(editing.accountId);
                setTransferToAccountId(editing.transferToAccountId || null);
                setCategoryId(editing.categoryId || null);
            } else {
                setType('expense');
                setAmount('');
                setNote('');
                setQuickEntry('');
                setParseMessage('');
                setDate(todayIsoDate());
                setAccountId(accounts[0]?.id || null);
                setTransferToAccountId(null);
                setCategoryId(null);
            }
        }
    }, [visible, editing, accounts]);

    useEffect(() => {
        if (!visible || editing) return;
        if (type === 'transfer') {
            setAccountId(null);
            setTransferToAccountId(null);
            setCategoryId(null);
        } else if (!accountId && accounts[0]) {
            setAccountId(accounts[0].id);
        }
    }, [type, visible, editing, accounts, accountId]);

    const typeCategories = categories.filter(c => c.type === type);

    const handleParseQuickEntry = async () => {
        const aiSettings = await getAiSettings();
        if (!aiSettings.enabled) return Alert.alert('AI disabled', 'Enable AI transaction parsing in Settings first.');
        if (!aiSettings.apiKey.trim()) return Alert.alert('Missing API key', 'Add your AI API key in Settings first.');
        if (!quickEntry.trim()) return Alert.alert('Missing note', 'Type or dictate a transaction note first.');

        setParsing(true);
        setParseMessage('');
        try {
            const draft = await api.parseTransactionText({ text: quickEntry, preferredType: type });
            setType(draft.type);
            setAmount(draft.amount ? String(draft.amount) : '');
            setNote(draft.note || quickEntry);
            setDate((draft.date || todayIsoDate()).split('T')[0]);
            setAccountId(draft.accountId || accounts[0]?.id || null);
            setCategoryId(draft.categoryId || null);
            setTransferToAccountId(draft.transferToAccountId || null);

            if (draft.missingFields?.length) {
                setParseMessage(`Review missing fields: ${draft.missingFields.join(', ')}.`);
            } else {
                setParseMessage('Draft filled. Review and save.');
            }
        } catch (err: any) {
            Alert.alert('Could not parse note', err.message || 'Failed to parse transaction note.');
        } finally {
            setParsing(false);
        }
    };

    const handleSave = async () => {
        const value = parseFloat(amount);
        if (!value || value <= 0) return Alert.alert('Invalid amount', 'Enter an amount greater than zero.');
        if (!note.trim()) return Alert.alert('Missing note', 'Enter a note.');
        if (!accountId) return Alert.alert('Missing account', 'Select an account.');
        const isoDate = displayDateToIso(date);
        if (!isoDate) return Alert.alert('Invalid date', 'Pick a valid date.');
        if (type === 'transfer' && !transferToAccountId) return Alert.alert('Missing account', 'Select a destination account.');
        if (type === 'transfer' && transferToAccountId === accountId) return Alert.alert('Invalid transfer', 'Source and destination must differ.');

        setSaving(true);
        try {
            const payload = {
                type,
                amount: value,
                note: note.trim(),
                date: isoDate,
                accountId,
                categoryId: type === 'transfer' ? null : categoryId,
                transferToAccountId: type === 'transfer' ? transferToAccountId : null,
            };
            if (editing) {
                await updateTransaction(editing.id, payload);
            } else {
                await addTransaction(payload as Omit<Transaction, 'id'>);
            }
            successHaptic();
            onClose();
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to save transaction');
        } finally {
            setSaving(false);
        }
    };

    return (
        <SheetModal visible={visible} onClose={onClose} title={editing ? 'Edit Transaction' : 'New Transaction'}>
            <FieldLabel>Type</FieldLabel>
            <ChipSelector
                options={[
                    { value: 'expense', label: 'Expense' },
                    { value: 'income', label: 'Income' },
                    { value: 'transfer', label: 'Transfer' },
                ]}
                value={type}
                disabled={parsing}
                onChange={v => {
                    setType(v as TransactionType);
                    setCategoryId(null);
                    if (v === 'transfer') {
                        setAccountId(null);
                        setTransferToAccountId(null);
                    }
                }}
            />

            {!editing && aiSettings?.enabled ? (
                <View style={[styles.quickEntry, { backgroundColor: theme.colors.primaryLight, borderColor: theme.colors.cardBorder }]}>
                    <View style={styles.quickEntryHeader}>
                        <MaterialCommunityIcons name="microphone-outline" size={18} color={theme.colors.primary} />
                        <Text style={[styles.quickEntryTitle, { color: theme.colors.text }]}>Quick Entry</Text>
                    </View>
                    <Input
                        value={quickEntry}
                        onChangeText={value => {
                            setQuickEntry(value);
                            setParseMessage('');
                        }}
                        placeholder="Spent 20 on food from SBI savings"
                        multiline
                        editable={!parsing}
                        numberOfLines={3}
                        textAlignVertical="top"
                        style={{ minHeight: 82 }}
                    />
                    {parseMessage ? <Text style={[styles.parseMessage, { color: theme.colors.warning }]}>{parseMessage}</Text> : null}
                    <Button
                        title={parsing ? 'Parsing...' : 'Parse with AI'}
                        onPress={handleParseQuickEntry}
                        loading={parsing}
                        variant="secondary"
                    />
                </View>
            ) : null}

            <Input label="Amount" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0.00" editable={!parsing} />
            <Input label="Description / note" value={note} onChangeText={setNote} placeholder="e.g. Groceries" editable={!parsing} />

            <OptionSheet
                label={type === 'transfer' ? 'From account' : 'Account'}
                options={accounts.map(a => ({ value: a.id, label: a.name, sublabel: a.type }))}
                value={accountId}
                disabled={parsing}
                onChange={setAccountId}
            />

            {type === 'transfer' ? (
                <OptionSheet
                    label="To account"
                    options={accounts.filter(a => a.id !== accountId).map(a => ({ value: a.id, label: a.name, sublabel: a.type }))}
                    value={transferToAccountId}
                    disabled={parsing}
                    onChange={setTransferToAccountId}
                />
            ) : typeCategories.length === 0 ? (
                <Text style={{ marginBottom: 16, opacity: 0.6 }}>No {type} categories yet.</Text>
            ) : (
                <OptionSheet
                    label="Category"
                    options={typeCategories.map(c => ({ value: c.id, label: c.name, icon: c.icon }))}
                    value={categoryId}
                    disabled={parsing}
                    onChange={setCategoryId}
                />
            )}

            <Button title={editing ? 'Save Changes' : 'Add Transaction'} onPress={handleSave} loading={saving} disabled={parsing} />
        </SheetModal>
    );
};

const styles = StyleSheet.create({
    quickEntry: {
        borderWidth: 1,
        borderRadius: radius.md,
        padding: spacing.md,
        marginBottom: spacing.md,
    },
    quickEntryHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginBottom: spacing.sm,
    },
    quickEntryTitle: {
        fontSize: 14,
        fontWeight: '700',
    },
    parseMessage: {
        fontSize: 12,
        marginBottom: spacing.sm,
    },
});
