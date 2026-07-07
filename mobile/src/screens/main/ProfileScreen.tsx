import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, StyleSheet, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Card, Input, Button, SheetModal, ChipSelector, FieldLabel, OptionSheet } from '../../components/ui';
import { CURRENCIES } from '../../utils/currency';
import { spacing, radius } from '../../theme';

const COMMON_TIMEZONES = [
    'Asia/Kolkata', 'Asia/Dubai', 'Asia/Singapore', 'Asia/Tokyo', 'Asia/Shanghai',
    'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Moscow',
    'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
    'America/Sao_Paulo', 'Australia/Sydney', 'Pacific/Auckland', 'UTC',
];

export default function ProfileScreen() {
    const navigation = useNavigation();
    const { user, updateProfile } = useAuth();
    const { theme } = useTheme();

    const [name, setName] = useState(user?.name || '');
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [showCurrency, setShowCurrency] = useState(false);

    const handleSaveName = async () => {
        if (!name.trim()) return;
        setSaving(true);
        try {
            await updateProfile({ name: name.trim() });
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to update name');
        } finally {
            setSaving(false);
        }
    };

    const handleCurrencyChange = async (code: string) => {
        try {
            await updateProfile({ currency: code });
            setShowCurrency(false);
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to update currency');
        }
    };

    const handleTimezoneChange = async (tz: string) => {
        try {
            await updateProfile({ timezone: tz });
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to update timezone');
        }
    };

    const initials = (user?.name || 'U').trim().charAt(0).toUpperCase();

    const InfoRow = ({
        icon,
        label,
        value,
        onPress,
        last = false,
    }: {
        icon: string;
        label: string;
        value: string;
        onPress?: () => void;
        last?: boolean;
    }) => (
        <TouchableOpacity
            onPress={onPress}
            disabled={!onPress}
            style={[styles.infoRow, { borderBottomColor: last ? 'transparent' : theme.colors.separator }]}
            activeOpacity={onPress ? 0.7 : 1}
        >
            <MaterialCommunityIcons name={icon as any} size={20} color={theme.colors.textSecondary} />
            <View style={{ flex: 1, marginLeft: spacing.md }}>
                <Text style={[styles.infoLabel, { color: theme.colors.textTertiary }]}>{label}</Text>
                <Text style={[styles.infoValue, { color: theme.colors.text }]}>{value}</Text>
            </View>
            {onPress && (
                <MaterialCommunityIcons name="pencil-outline" size={18} color={theme.colors.primary} />
            )}
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={styles.backBtn}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                    <MaterialCommunityIcons name="arrow-left" size={24} color={theme.colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Profile</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={{ padding: spacing.md }}>
                {/* Avatar */}
                <View style={styles.avatarSection}>
                    <View style={[styles.avatarCircle, { backgroundColor: theme.colors.primary }]}>
                        <Text style={styles.avatarText}>{initials}</Text>
                    </View>
                    <Text style={[styles.displayName, { color: theme.colors.text }]}>{user?.name}</Text>
                    <Text style={[styles.displayEmail, { color: theme.colors.textTertiary }]}>{user?.email}</Text>
                </View>

                {/* Edit Name */}
                <Card style={{ marginBottom: spacing.md }}>
                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Display Name</Text>
                    <Input
                        label="Name"
                        value={name}
                        onChangeText={setName}
                        placeholder="Your display name"
                        autoCapitalize="words"
                    />
                    <Button
                        title={saved ? 'Saved ✓' : saving ? 'Saving…' : 'Save Name'}
                        onPress={handleSaveName}
                        loading={saving}
                        style={{ marginTop: spacing.sm }}
                    />
                </Card>

                {/* Account Preferences — editable */}
                <Card style={{ marginBottom: spacing.md, paddingVertical: 0 }}>
                    <View style={{ paddingTop: spacing.sm, paddingHorizontal: spacing.md, paddingBottom: spacing.xs }}>
                        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Preferences</Text>
                    </View>

                    <InfoRow
                        icon="email-outline"
                        label="Email"
                        value={user?.email || ''}
                    />
                    <InfoRow
                        icon="currency-usd"
                        label="Currency"
                        value={user?.currency || 'INR'}
                        onPress={() => setShowCurrency(true)}
                    />
                    <View style={[styles.timezoneRow, { borderBottomColor: 'transparent' }]}>
                        <MaterialCommunityIcons name="earth" size={20} color={theme.colors.textSecondary} />
                        <View style={{ flex: 1, marginLeft: spacing.md }}>
                            <OptionSheet
                                label="Timezone"
                                options={[
                                    ...(user?.timezone && !COMMON_TIMEZONES.includes(user.timezone)
                                        ? [{ value: user.timezone, label: user.timezone }]
                                        : []),
                                    ...COMMON_TIMEZONES.map(tz => ({ value: tz, label: tz })),
                                ]}
                                value={user?.timezone || 'UTC'}
                                onChange={handleTimezoneChange}
                            />
                        </View>
                        <MaterialCommunityIcons name="pencil-outline" size={18} color={theme.colors.primary} />
                    </View>
                </Card>

                <Text style={{ color: theme.colors.textTertiary, textAlign: 'center', fontSize: 12, marginBottom: spacing.xl }}>
                    For AI parsing, import/export, and data options — visit Settings.
                </Text>
            </ScrollView>

            {/* Currency picker */}
            <SheetModal visible={showCurrency} onClose={() => setShowCurrency(false)} title="Currency">
                <FieldLabel>Choose your currency</FieldLabel>
                <ChipSelector
                    options={CURRENCIES.map(c => ({ value: c.code, label: `${c.symbol} ${c.code}` }))}
                    value={user?.currency || 'INR'}
                    onChange={handleCurrencyChange}
                />
            </SheetModal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#334155',
    },
    backBtn: {
        width: 40,
        alignItems: 'flex-start',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    avatarSection: {
        alignItems: 'center',
        paddingVertical: spacing.xl,
    },
    avatarCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.md,
    },
    avatarText: {
        color: '#fff',
        fontSize: 32,
        fontWeight: '800',
    },
    displayName: {
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 4,
    },
    displayEmail: {
        fontSize: 14,
    },
    sectionTitle: {
        fontSize: 15,
        fontWeight: '600',
        marginBottom: spacing.md,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.md,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    timezoneRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    infoLabel: {
        fontSize: 12,
        marginBottom: 2,
    },
    infoValue: {
        fontSize: 15,
        fontWeight: '500',
    },
});
