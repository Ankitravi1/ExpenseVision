export const formatCurrency = (amount: number, currencyCode: string = 'INR'): string => {
    let locale = 'en-IN';
    let currency = 'INR';

    switch (currencyCode) {
        case 'USD':
            locale = 'en-US';
            currency = 'USD';
            break;
        case 'EUR':
            locale = 'de-DE';
            currency = 'EUR';
            break;
        case 'GBP':
            locale = 'en-GB';
            currency = 'GBP';
            break;
        case 'JPY':
            locale = 'ja-JP';
            currency = 'JPY';
            break;
        case 'AUD':
            locale = 'en-AU';
            currency = 'AUD';
            break;
        case 'CAD':
            locale = 'en-CA';
            currency = 'CAD';
            break;
        case 'INR':
        default:
            locale = 'en-IN';
            currency = 'INR';
            break;
    }

    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount);
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

export const CURRENCIES = [
    { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
    { code: 'USD', name: 'US Dollar', symbol: '$' },
    { code: 'EUR', name: 'Euro', symbol: '€' },
    { code: 'GBP', name: 'British Pound', symbol: '£' },
    { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
    { code: 'AUD', name: 'Australian Dollar', symbol: '$' },
    { code: 'CAD', name: 'Canadian Dollar', symbol: '$' },
];
