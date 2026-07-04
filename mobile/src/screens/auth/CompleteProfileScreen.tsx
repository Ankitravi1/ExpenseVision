import React, { useState } from 'react';
import { Text, StyleSheet, ScrollView } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Button, ChipSelector, FieldLabel } from '../../components/ui';
import { CURRENCIES } from '../../utils/currency';
import { spacing } from '../../theme';

export default function CompleteProfileScreen() {
    const { completeProfile, logout } = useAuth();
    const { theme } = useTheme();
    const [currency, setCurrency] = useState('INR');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleContinue = async () => {
        setError('');
        setLoading(true);
        try {
            await completeProfile(currency);
        } catch (err: any) {
            setError(err.message || 'Failed to save profile');
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView
            style={{ flex: 1, backgroundColor: theme.colors.background }}
            contentContainerStyle={styles.container}
        >
            <Text style={[styles.title, { color: theme.colors.text }]}>Almost there!</Text>
            <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
                Pick your currency to finish setting up your account.
            </Text>

            {error ? <Text style={{ color: theme.colors.danger, marginBottom: spacing.md }}>{error}</Text> : null}

            <FieldLabel>Currency</FieldLabel>
            <ChipSelector
                options={CURRENCIES.map(c => ({ value: c.code, label: `${c.symbol} ${c.code}` }))}
                value={currency}
                onChange={setCurrency}
            />

            <Button title="Continue" onPress={handleContinue} loading={loading} />
            <Button title="Log out" variant="secondary" onPress={logout} style={{ marginTop: spacing.md }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: spacing.lg,
    },
    title: {
        fontSize: 26,
        fontWeight: '800',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 15,
        marginBottom: spacing.xl,
    },
});
