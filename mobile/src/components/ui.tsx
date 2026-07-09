import React, { useState } from 'react';
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
    Keyboard,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../context/ThemeContext';
import { CategoryIcon } from './CategoryIcon';
import { isoDateToDisplay } from '../utils/date';
import { radius, spacing } from '../theme';

export const lightHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
};

export const successHaptic = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
};

export const warningHaptic = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
};

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
            onPress={() => {
                lightHaptic();
                onPress();
            }}
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
    disabled?: boolean;
}> = ({ options, value, onChange, disabled }) => {
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
                            disabled={disabled}
                            style={[
                                styles.chip,
                                {
                                    backgroundColor: selected ? theme.colors.primary : theme.colors.inputBg,
                                    borderColor: selected ? theme.colors.primary : theme.colors.inputBorder,
                                    opacity: disabled ? 0.6 : 1,
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

// Tappable field that opens a bottom-sheet list. Better than chip rows once
// there are more than a few options (all options visible, supports icons).
export interface SheetOption {
    value: string;
    label: string;
    icon?: string; // lucide icon name, rendered via CategoryIcon
    sublabel?: string;
}

export const OptionSheet: React.FC<{
    label?: string;
    placeholder?: string;
    options: SheetOption[];
    value: string | null | undefined;
    onChange: (value: string) => void;
    disabled?: boolean;
}> = ({ label, placeholder = 'Select...', options, value, onChange, disabled }) => {
    const { theme } = useTheme();
    const [open, setOpen] = useState(false);
    const selected = options.find(o => o.value === value);

    return (
        <View style={{ marginBottom: spacing.md }}>
            {label ? <FieldLabel>{label}</FieldLabel> : null}
            <TouchableOpacity
                onPress={() => {
                    if (disabled) return;
                    Keyboard.dismiss();
                    lightHaptic();
                    setOpen(true);
                }}
                activeOpacity={0.7}
                style={[
                    styles.pickerField,
                    {
                        backgroundColor: theme.colors.inputBg,
                        borderColor: theme.colors.inputBorder,
                        opacity: disabled ? 0.6 : 1,
                    },
                ]}
            >
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: spacing.sm }}>
                    {selected?.icon ? <CategoryIcon name={selected.icon} size={15} /> : null}
                    <Text
                        style={{ color: selected ? theme.colors.text : theme.colors.textTertiary, fontSize: 16 }}
                        numberOfLines={1}
                    >
                        {selected?.label || placeholder}
                    </Text>
                </View>
                <MaterialCommunityIcons name="chevron-down" size={20} color={theme.colors.textTertiary} />
            </TouchableOpacity>

            <SheetModal visible={open} title={label || 'Select'} onClose={() => setOpen(false)}>
                {options.length === 0 ? (
                    <Text style={{ color: theme.colors.textTertiary, paddingVertical: spacing.md }}>No options available.</Text>
                ) : (
                    options.map(opt => {
                        const isSelected = opt.value === value;
                        return (
                            <TouchableOpacity
                                key={opt.value}
                                onPress={() => {
                                    lightHaptic();
                                    onChange(opt.value);
                                    setOpen(false);
                                }}
                                style={[
                                    styles.optionRow,
                                    { borderBottomColor: theme.colors.separator },
                                    isSelected && { backgroundColor: theme.colors.primaryLight, borderRadius: radius.md },
                                ]}
                            >
                                {opt.icon ? <CategoryIcon name={opt.icon} size={16} /> : null}
                                <View style={{ flex: 1, marginLeft: opt.icon ? spacing.sm : 0 }}>
                                    <Text style={{ color: theme.colors.text, fontSize: 16, fontWeight: isSelected ? '700' : '400' }}>
                                        {opt.label}
                                    </Text>
                                    {opt.sublabel ? (
                                        <Text style={{ color: theme.colors.textTertiary, fontSize: 12 }}>{opt.sublabel}</Text>
                                    ) : null}
                                </View>
                                {isSelected ? (
                                    <MaterialCommunityIcons name="check" size={20} color={theme.colors.primary} />
                                ) : null}
                            </TouchableOpacity>
                        );
                    })
                )}
            </SheetModal>
        </View>
    );
};

// Tappable date field that opens the platform's native date picker
export const DateField: React.FC<{
    label?: string;
    value: string; // YYYY-MM-DD
    onChange: (iso: string) => void;
    disabled?: boolean;
    maximumDate?: Date;
}> = ({ label, value, onChange, disabled, maximumDate }) => {
    const { theme } = useTheme();
    const [open, setOpen] = useState(false);

    const parsed = (() => {
        const [y, m, d] = value.split('-').map(Number);
        const date = new Date(y, (m || 1) - 1, d || 1);
        return isNaN(date.getTime()) ? new Date() : date;
    })();

    return (
        <View style={{ marginBottom: spacing.md }}>
            {label ? <FieldLabel>{label}</FieldLabel> : null}
            <TouchableOpacity
                onPress={() => {
                    if (disabled) return;
                    Keyboard.dismiss();
                    lightHaptic();
                    setOpen(true);
                }}
                activeOpacity={0.7}
                style={[
                    styles.pickerField,
                    {
                        backgroundColor: theme.colors.inputBg,
                        borderColor: theme.colors.inputBorder,
                        opacity: disabled ? 0.6 : 1,
                    },
                ]}
            >
                <Text style={{ color: theme.colors.text, fontSize: 16 }}>{isoDateToDisplay(value)}</Text>
                <MaterialCommunityIcons name="calendar-outline" size={20} color={theme.colors.textTertiary} />
            </TouchableOpacity>
            {open ? (
                <DateTimePicker
                    value={parsed}
                    mode="date"
                    display="default"
                    maximumDate={maximumDate}
                    onChange={(event, date) => {
                        setOpen(false);
                        if (event.type === 'set' && date) {
                            const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                            onChange(iso);
                        }
                    }}
                />
            ) : null}
        </View>
    );
};

export const TimeField: React.FC<{
    label?: string;
    value: string; // HH:mm
    onChange: (time: string) => void;
    disabled?: boolean;
}> = ({ label, value, onChange, disabled }) => {
    const { theme } = useTheme();
    const [open, setOpen] = useState(false);

    const parsed = (() => {
        const [h, m] = value.split(':').map(Number);
        const date = new Date();
        date.setHours(h || 0);
        date.setMinutes(m || 0);
        return date;
    })();

    return (
        <View style={{ marginBottom: spacing.md }}>
            {label ? <FieldLabel>{label}</FieldLabel> : null}
            <TouchableOpacity
                onPress={() => {
                    if (disabled) return;
                    Keyboard.dismiss();
                    lightHaptic();
                    setOpen(true);
                }}
                activeOpacity={0.7}
                style={[
                    styles.pickerField,
                    {
                        backgroundColor: theme.colors.inputBg,
                        borderColor: theme.colors.inputBorder,
                        opacity: disabled ? 0.6 : 1,
                    },
                ]}
            >
                <Text style={{ color: theme.colors.text, fontSize: 16 }}>{value}</Text>
                <MaterialCommunityIcons name="clock-outline" size={20} color={theme.colors.textTertiary} />
            </TouchableOpacity>
            {open ? (
                <DateTimePicker
                    value={parsed}
                    mode="time"
                    display="default"
                    is24Hour={true}
                    onChange={(event, date) => {
                        setOpen(false);
                        if (event.type === 'set' && date) {
                            const timeStr = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
                            onChange(timeStr);
                        }
                    }}
                />
            ) : null}
        </View>
    );
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
    pickerField: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderRadius: radius.md,
        paddingHorizontal: 14,
        paddingVertical: 12,
    },
    optionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: spacing.sm,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
});
