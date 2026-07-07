import React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { spacing } from '../theme';

interface Props {
    children: React.ReactNode;
}

export const AuthScreenLayout: React.FC<Props> = ({ children }) => {
    const { theme } = useTheme();

    return (
        <KeyboardAvoidingView
            style={{ flex: 1, backgroundColor: theme.colors.background }}
            behavior="padding"
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
        >
            <ScrollView
                contentContainerStyle={styles.container}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                {children}
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: spacing.lg,
        paddingBottom: spacing.xl * 4,
    },
});
