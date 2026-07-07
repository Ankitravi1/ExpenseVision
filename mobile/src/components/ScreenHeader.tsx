import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { DrawerActions, useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { spacing } from '../theme';

interface Props {
    title: string;
    subtitle?: string;
    right?: React.ReactNode;
}

export const ScreenHeader: React.FC<Props> = ({ title, subtitle, right }) => {
    const navigation = useNavigation();
    const { theme } = useTheme();

    const openDrawer = () => {
        navigation.dispatch(DrawerActions.openDrawer());
    };

    return (
        <View style={styles.row}>
            <TouchableOpacity
                onPress={openDrawer}
                style={styles.drawerToggle}
                hitSlop={{ top: 12, bottom: 12, left: 8, right: 12 }}
            >
                <MaterialCommunityIcons name="menu" size={26} color={theme.colors.text} />
            </TouchableOpacity>
            <View style={styles.center}>
                {subtitle ? (
                    <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>{subtitle}</Text>
                ) : null}
                <Text style={[styles.title, { color: theme.colors.text }]}>{title}</Text>
            </View>
            <View style={styles.right}>{right ?? <View style={styles.rightPlaceholder} />}</View>
        </View>
    );
};

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    drawerToggle: {
        padding: spacing.xs,
    },
    center: {
        flex: 1,
        paddingHorizontal: spacing.sm,
    },
    subtitle: {
        fontSize: 14,
    },
    title: {
        fontSize: 26,
        fontWeight: '800',
    },
    right: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    rightPlaceholder: {
        width: 34,
    },
});
