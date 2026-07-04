// Mirrors web/utils/currency.ts. Hermes' Intl support covers NumberFormat,
// but fall back to a simple symbol+number if it ever throws.
const LOCALES: Record<string, string> = {
    USD: 'en-US',
    EUR: 'de-DE',
    GBP: 'en-GB',
    JPY: 'ja-JP',
    AUD: 'en-AU',
    CAD: 'en-CA',
    INR: 'en-IN',
};

export const getCurrencySymbol = (currencyCode: string = 'INR'): string => {
    switch (currencyCode) {
        case 'USD': return '$';
        case 'EUR': return '€';
        case 'GBP': return '£';
        case 'JPY': return '¥';
        case 'AUD': return '$';
        case 'CAD': return '$';
        case 'INR':
        default: return '₹';
    }
};

export const formatCurrency = (amount: number, currencyCode: string = 'INR'): string => {
    const code = LOCALES[currencyCode] ? currencyCode : 'INR';
    try {
        return new Intl.NumberFormat(LOCALES[code], {
            style: 'currency',
            currency: code,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(amount);
    } catch {
        return `${getCurrencySymbol(code)}${amount.toFixed(2)}`;
    }
};

export const CURRENCIES = [
    { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
    { code: 'USD', name: 'US Dollar', symbol: '$' },
    { code: 'EUR', name: 'Euro', symbol: '€' },
    { code: 'GBP', name: 'British Pound', symbol: '£' },
    { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
    { code: 'AUD', name: 'Australian Dollar', symbol: '$' },
    { code: 'CAD', name: 'Canadian Dollar', symbol: '$' },
];
