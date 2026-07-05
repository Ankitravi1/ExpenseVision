import React, { useState } from 'react';
import { Text, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Input, Button } from '../../components/ui';
import { api } from '../../services/api';
import { spacing } from '../../theme';

export default function ForgotPasswordScreen({ navigation }: any) {
    const { theme } = useTheme();
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [sent, setSent] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!email.trim()) {
            setError('Enter your email address.');
            return;
        }
        setError('');
        setLoading(true);
        try {
            await api.forgotPassword(email.trim().toLowerCase());
            setSent(true);
        } catch (err: any) {
            setError(err.message || 'Failed to send reset email');
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView style={{ flex: 1, backgroundColor: theme.colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
                <Text style={[styles.title, { color: theme.colors.text }]}>Reset password</Text>

                {sent ? (
                    <>
                        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
                            If an account exists for {email.trim()}, a reset link is on its way. Open it on this device or on the web to set a new password.
                        </Text>
                        <Button title="Back to sign in" onPress={() => navigation.goBack()} />
                    </>
                ) : (
                    <>
                        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
                            Enter the email you signed up with and we'll send you a reset link.
                        </Text>
                        {error ? <Text style={[styles.error, { color: theme.colors.danger }]}>{error}</Text> : null}
                        <Input
                            label="Email"
                            value={email}
                            onChangeText={setEmail}
                            autoCapitalize="none"
                            keyboardType="email-address"
                            placeholder="you@example.com"
                        />
                        <Button title="Send reset link" onPress={handleSubmit} loading={loading} />
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.link}>
                            <Text style={{ color: theme.colors.primary }}>Back to sign in</Text>
                        </TouchableOpacity>
                    </>
                )}
            </ScrollView>
        </KeyboardAvoidingView>
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
        textAlign: 'center',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 15,
        textAlign: 'center',
        marginBottom: spacing.xl,
        lineHeight: 22,
    },
    error: {
        textAlign: 'center',
        marginBottom: spacing.md,
    },
    link: {
        marginTop: spacing.lg,
        alignItems: 'center',
    },
});
