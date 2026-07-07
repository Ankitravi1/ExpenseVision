import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { GOOGLE_CLIENT_ID } from '../config';
import { useTheme } from '../context/ThemeContext';
import { spacing, radius } from '../theme';

WebBrowser.maybeCompleteAuthSession();

interface Props {
    onToken: (idToken: string) => Promise<void>;
    loading?: boolean;
    label?: string;
}

export const GoogleSignInButton: React.FC<Props> = ({ onToken, loading, label = 'Continue with Google' }) => {
    const { theme } = useTheme();
    const [busy, setBusy] = useState(false);

    const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
        clientId: GOOGLE_CLIENT_ID || 'unused',
    });

    useEffect(() => {
        if (response?.type !== 'success' || !response.params.id_token) return;
        setBusy(true);
        onToken(response.params.id_token)
            .catch(() => {})
            .finally(() => setBusy(false));
    }, [response, onToken]);

    if (!GOOGLE_CLIENT_ID) return null;

    const disabled = !request || loading || busy;

    return (
        <>
            <View style={styles.dividerRow}>
                <View style={[styles.divider, { backgroundColor: theme.colors.separator }]} />
                <Text style={{ color: theme.colors.textTertiary, fontSize: 13, marginHorizontal: spacing.sm }}>or</Text>
                <View style={[styles.divider, { backgroundColor: theme.colors.separator }]} />
            </View>
            <TouchableOpacity
                onPress={() => promptAsync()}
                disabled={disabled}
                style={[
                    styles.googleBtn,
                    {
                        borderColor: theme.colors.cardBorder,
                        backgroundColor: theme.colors.card,
                        opacity: disabled ? 0.6 : 1,
                    },
                ]}
            >
                {busy || loading ? (
                    <ActivityIndicator color={theme.colors.text} />
                ) : (
                    <>
                        <MaterialCommunityIcons name="google" size={20} color={theme.colors.text} />
                        <Text style={{ color: theme.colors.text, fontWeight: '600', fontSize: 15 }}>{label}</Text>
                    </>
                )}
            </TouchableOpacity>
        </>
    );
};

const styles = StyleSheet.create({
    dividerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: spacing.lg,
    },
    divider: {
        flex: 1,
        height: StyleSheet.hairlineWidth,
    },
    googleBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        paddingVertical: 14,
        borderRadius: radius.md,
        borderWidth: 1,
    },
});
