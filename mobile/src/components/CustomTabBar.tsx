import React, { useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Animated, Easing } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { spacing } from '../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const CustomTabBar: React.FC<any> = ({ state, navigation }) => {
    const { theme } = useTheme();
    const { index } = state;
    const insets = useSafeAreaInsets();

    const tabs = [
        { name: 'Dashboard', icon: 'view-dashboard-outline', label: 'Dashboard' },
        { name: 'Transactions', icon: 'swap-horizontal', label: 'Transactions' },
        { name: 'AddTransaction', icon: 'plus', label: 'Add' },
        { name: 'Budgets', icon: 'target', label: 'Budgets' },
        { name: 'Accounts', icon: 'wallet-outline', label: 'Accounts' },
    ];

    const addScale = useRef(new Animated.Value(1)).current;

    const handleTabPress = (tabName: string) => {
        navigation.navigate(tabName);
    };

    const handleAddPress = () => {
        Animated.sequence([
            Animated.timing(addScale, { toValue: 0.9, duration: 80, easing: Easing.out(Easing.ease), useNativeDriver: true }),
            Animated.timing(addScale, { toValue: 1, duration: 100, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        ]).start();
        navigation.navigate('Transactions', { openForm: true });
    };

    return (
        <View style={[
            styles.container,
            {
                backgroundColor: theme.colors.tabBar,
                borderTopColor: theme.colors.cardBorder,
                height: 72 + insets.bottom,
                paddingBottom: insets.bottom || spacing.xs,
            }
        ]}>
            {tabs.map((tab) => {
                if (tab.name === 'AddTransaction') {
                    return (
                        <Animated.View key={tab.name} style={{ transform: [{ scale: addScale }] }}>
                            <TouchableOpacity
                                onPress={handleAddPress}
                                style={[styles.tab, styles.addTab, { backgroundColor: theme.colors.primary }]}
                                activeOpacity={0.85}
                                hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}
                            >
                                <MaterialCommunityIcons name="plus" size={26} color="#fff" />
                            </TouchableOpacity>
                        </Animated.View>
                    );
                }

                const routeIndex = state.routes.findIndex((route: any) => route.name === tab.name);
                const isFocused = index === routeIndex;
                const color = isFocused ? theme.colors.primary : theme.colors.textTertiary;
                return (
                    <TouchableOpacity
                        key={tab.name}
                        onPress={() => handleTabPress(tab.name)}
                        style={styles.tab}
                        hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}
                    >
                        <MaterialCommunityIcons
                            name={tab.icon as keyof typeof MaterialCommunityIcons.glyphMap}
                            size={24}
                            color={color}
                        />
                        <Animated.View
                            style={[styles.indicator, { backgroundColor: theme.colors.primary, opacity: isFocused ? 1 : 0 }]}
                        />
                    </TouchableOpacity>
                );
            })}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        height: 72,
        paddingHorizontal: spacing.md,
        paddingBottom: spacing.xs,
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    tab: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 4,
        width: 56,
        height: 56,
        borderRadius: 28,
    },
    indicator: {
        position: 'absolute',
        bottom: 5,
        left: 20,
        right: 20,
        height: 3,
        borderRadius: 2,
    },
    addTab: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.18,
        shadowRadius: 6,
        elevation: 6,
    },
});

export default CustomTabBar;
