import React from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    Modal,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    TextInputProps,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { radius, spacing } from '../theme';

export const Card: React.FC<{ children: React.ReactNode; style?: object }> = ({ children, style }) => {
    const { theme } = useTheme();
    return (
        <View
            style={[
                {
                    backgroundColor: theme.colors.card,
                    borderRadius: radius.lg,
                    borderWidth: 1,
                    borderColor: theme.colors.cardBorder,
                    padding: spacing.md,
                },
                style,
            ]}
        >
            {children}
        </View>
    );
};

interface ButtonProps {
    title: string;
    onPress: () => void;
    variant?: 'primary' | 'secondary' | 'danger';
    loading?: boolean;
    disabled?: boolean;
    style?: object;
}

export const Button: React.FC<ButtonProps> = ({ title, onPress, variant = 'primary', loading, disabled, style }) => {
    const { theme } = useTheme();
    const bg =
        variant === 'primary' ? theme.colors.primary :
        variant === 'danger' ? theme.colors.danger :
        theme.colors.card;
    const fg = variant === 'secondary' ? theme.colors.text : '#ffffff';

    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={disabled || loading}
            activeOpacity={0.8}
            style={[
                styles.button,
                {
                    backgroundColor: bg,
                    opacity: disabled || loading ? 0.6 : 1,
                    borderWidth: variant === 'secondary' ? 1 : 0,
                    borderColor: theme.colors.cardBorder,
                },
                style,
            ]}
        >
            {loading ? (
                <ActivityIndicator color={fg} />
            ) : (
                <Text style={[styles.buttonText, { color: fg }]}>{title}</Text>
            )}
        </TouchableOpacity>
    );
};

interface InputProps extends TextInputProps {
    label?: string;
}

export const Input: React.FC<InputProps> = ({ label, style, ...props }) => {
    const { theme } = useTheme();
    return (
        <View style={{ marginBottom: spacing.md }}>
            {label ? <Text style={[styles.label, { color: theme.colors.textSecondary }]}>{label}</Text> : null}
            <TextInput
                placeholderTextColor={theme.colors.textTertiary}
                {...props}
                style={[
                    styles.input,
                    {
                        backgroundColor: theme.colors.inputBg,
                        borderColor: theme.colors.inputBorder,
                        color: theme.colors.text,
                    },
                    style,
                ]}
            />
        </View>
    );
};

export const EmptyState: React.FC<{ icon?: keyof typeof MaterialCommunityIcons.glyphMap; title: string; subtitle?: string }> = ({
    icon = 'inbox-outline',
    title,
    subtitle,
}) => {
    const { theme } = useTheme();
    return (
        <View style={styles.empty}>
            <MaterialCommunityIcons name={icon} size={44} color={theme.colors.textTertiary} />
            <Text style={[styles.emptyTitle, { color: theme.colors.textSecondary }]}>{title}</Text>
            {subtitle ? <Text style={[styles.emptySubtitle, { color: theme.colors.textTertiary }]}>{subtitle}</Text> : null}
        </View>
    );
};

// Bottom-sheet style modal used for all add/edit forms
export const SheetModal: React.FC<{
    visible: boolean;
    title: string;
    onClose: () => void;
    children: React.ReactNode;
}> = ({ visible, title, onClose, children }) => {
    const { theme } = useTheme();
    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={styles.sheetOverlay}
            >
                <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
                <View style={[styles.sheet, { backgroundColor: theme.colors.card }]}>
                    <View style={styles.sheetHeader}>
                        <Text style={[styles.sheetTitle, { color: theme.colors.text }]}>{title}</Text>
                        <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                            <MaterialCommunityIcons name="close" size={24} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                    </View>
                    <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                        {children}
                        <View style={{ height: spacing.xl }} />
                    </ScrollView>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

// Horizontal chip selector (type pickers, account pickers, currency, ...)
export const ChipSelector: React.FC<{
    options: { value: string; label: string }[];
    value: string | null | undefined;
    onChange: (value: string) => void;
}> = ({ options, value, onChange }) => {
    const { theme } = useTheme();
    return (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md, height: 48, flexGrow: 0 }}>
            <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }}>
                {options.map(opt => {
                    const selected = opt.value === value;
                    return (
                        <TouchableOpacity
                            key={opt.value}
                            onPress={() => onChange(opt.value)}
                            style={[
                                styles.chip,
                                {
                                    backgroundColor: selected ? theme.colors.primary : theme.colors.inputBg,
                                    borderColor: selected ? theme.colors.primary : theme.colors.inputBorder,
                                },
                            ]}
                        >
                            <Text style={{ color: selected ? '#fff' : theme.colors.text, fontWeight: selected ? '600' : '400' }}>
                                {opt.label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </ScrollView>
    );
};

export const FieldLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { theme } = useTheme();
    return <Text style={[styles.label, { color: theme.colors.textSecondary }]}>{children}</Text>;
};

const styles = StyleSheet.create({
    button: {
        paddingVertical: 14,
        paddingHorizontal: spacing.lg,
        borderRadius: radius.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonText: {
        fontSize: 16,
        fontWeight: '600',
    },
    label: {
        fontSize: 13,
        fontWeight: '500',
        marginBottom: 6,
    },
    input: {
        borderWidth: 1,
        borderRadius: radius.md,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 16,
    },
    empty: {
        alignItems: 'center',
        paddingVertical: 48,
        gap: 8,
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: '600',
    },
    emptySubtitle: {
        fontSize: 13,
        textAlign: 'center',
        paddingHorizontal: 32,
    },
    sheetOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'flex-end',
    },
    sheet: {
        borderTopLeftRadius: radius.xl,
        borderTopRightRadius: radius.xl,
        padding: spacing.lg,
        maxHeight: '88%',
    },
    sheetHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    sheetTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    chip: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 999,
        borderWidth: 1,
    },
});
