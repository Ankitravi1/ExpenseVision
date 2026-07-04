import React, { useState } from 'react';
import { Text, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Input, Button } from '../../components/ui';
import { spacing } from '../../theme';

export default function LoginScreen({ navigation }: any) {
    const { login, login2FA } = useAuth();
    const { theme } = useTheme();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [twoFACode, setTwoFACode] = useState('');
    const [twoFAUserId, setTwoFAUserId] = useState<string | null>(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        if (!email.trim() || !password) {
            setError('Enter your email and password.');
            return;
        }
        setError('');
        setLoading(true);
        try {
            const res = await login(email.trim().toLowerCase(), password);
            if (res.require2FA && res.userId) {
                setTwoFAUserId(res.userId);
            }
            // On success AuthContext flips isAuthenticated and the navigator switches
        } catch (err: any) {
            setError(err.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    const handle2FA = async () => {
        if (!twoFACode.trim() || !twoFAUserId) return;
        setError('');
        setLoading(true);
        try {
            await login2FA(twoFAUserId, twoFACode.trim());
        } catch (err: any) {
            setError(err.message || '2FA verification failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView style={{ flex: 1, backgroundColor: theme.colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
                <Text style={[styles.logo, { color: theme.colors.primary }]}>ExpenseVision</Text>
                <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>Welcome back — sign in to continue</Text>

                {error ? <Text style={[styles.error, { color: theme.colors.danger }]}>{error}</Text> : null}

                {twoFAUserId ? (
                    <>
                        <Input
                            label="Two-factor code"
                            value={twoFACode}
                            onChangeText={setTwoFACode}
                            keyboardType="number-pad"
                            placeholder="123456"
                            maxLength={6}
                        />
                        <Button title="Verify" onPress={handle2FA} loading={loading} />
                        <TouchableOpacity onPress={() => setTwoFAUserId(null)} style={styles.link}>
                            <Text style={{ color: theme.colors.primary }}>Back to login</Text>
                        </TouchableOpacity>
                    </>
                ) : (
                    <>
                        <Input
                            label="Email"
                            value={email}
                            onChangeText={setEmail}
                            autoCapitalize="none"
                            keyboardType="email-address"
                            placeholder="you@example.com"
                        />
                        <Input
                            label="Password"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                            placeholder="••••••••"
                        />
                        <Button title="Sign In" onPress={handleLogin} loading={loading} />
                        <TouchableOpacity onPress={() => navigation.navigate('Signup')} style={styles.link}>
                            <Text style={{ color: theme.colors.textSecondary }}>
                                Don't have an account? <Text style={{ color: theme.colors.primary, fontWeight: '600' }}>Sign up</Text>
                            </Text>
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
    logo: {
        fontSize: 32,
        fontWeight: '800',
        textAlign: 'center',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 15,
        textAlign: 'center',
        marginBottom: spacing.xl,
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
