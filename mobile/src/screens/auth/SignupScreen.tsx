import React, { useState } from 'react';
import { Text, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Input, Button } from '../../components/ui';
import { spacing } from '../../theme';

export default function SignupScreen({ navigation }: any) {
    const { signup } = useAuth();
    const { theme } = useTheme();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSignup = async () => {
        if (!name.trim() || !email.trim() || !password) {
            setError('Fill in all fields.');
            return;
        }
        if (password.length < 6) {
            setError('Password must be at least 6 characters.');
            return;
        }
        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }
        setError('');
        setLoading(true);
        try {
            await signup(name.trim(), email.trim().toLowerCase(), password);
            // AuthContext flips isAuthenticated; profile completion is handled by the navigator
        } catch (err: any) {
            setError(err.message || 'Signup failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView style={{ flex: 1, backgroundColor: theme.colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
                <Text style={[styles.logo, { color: theme.colors.primary }]}>Create Account</Text>
                <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>Start tracking your money in minutes</Text>

                {error ? <Text style={[styles.error, { color: theme.colors.danger }]}>{error}</Text> : null}

                <Input label="Name" value={name} onChangeText={setName} placeholder="Your name" />
                <Input label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="you@example.com" />
                <Input label="Password" value={password} onChangeText={setPassword} secureTextEntry placeholder="Min 6 characters" />
                <Input label="Confirm password" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry placeholder="Repeat password" />

                <Button title="Sign Up" onPress={handleSignup} loading={loading} />

                <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.link}>
                    <Text style={{ color: theme.colors.textSecondary }}>
                        Already have an account? <Text style={{ color: theme.colors.primary, fontWeight: '600' }}>Sign in</Text>
                    </Text>
                </TouchableOpacity>
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
        fontSize: 28,
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
