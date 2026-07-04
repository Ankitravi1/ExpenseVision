import React from 'react';
import { View, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

// Categories store lucide icon names (shared with web) — map them to
// MaterialCommunityIcons equivalents for native rendering.
const ICON_MAP: Record<string, keyof typeof MaterialCommunityIcons.glyphMap> = {
    Wallet: 'wallet',
    Briefcase: 'briefcase',
    TrendingUp: 'trending-up',
    Home: 'home',
    ShoppingCart: 'cart',
    Zap: 'flash',
    Coffee: 'coffee',
    Car: 'car',
    Film: 'filmstrip',
    Activity: 'heart-pulse',
    ShoppingBag: 'shopping',
    Book: 'book-open-variant',
    Plane: 'airplane',
    PiggyBank: 'piggy-bank',
    Tags: 'tag',
    Gift: 'gift',
    Music: 'music',
    Smartphone: 'cellphone',
    Wifi: 'wifi',
    Heart: 'heart',
    DollarSign: 'currency-usd',
    CreditCard: 'credit-card',
    Landmark: 'bank',
    Banknote: 'cash',
};

interface Props {
    name?: string | null;
    size?: number;
    color?: string;
    backgroundColor?: string;
}

export const CategoryIcon: React.FC<Props> = ({ name, size = 20, color, backgroundColor }) => {
    const { theme } = useTheme();
    const iconName = (name && ICON_MAP[name]) || 'tag';
    const bg = backgroundColor || theme.colors.primaryLight;
    const fg = color || theme.colors.primary;
    const boxSize = size * 2;

    return (
        <View style={[styles.box, { width: boxSize, height: boxSize, borderRadius: boxSize / 2, backgroundColor: bg }]}>
            <MaterialCommunityIcons name={iconName} size={size} color={fg} />
        </View>
    );
};

const styles = StyleSheet.create({
    box: {
        alignItems: 'center',
        justifyContent: 'center',
    },
});
