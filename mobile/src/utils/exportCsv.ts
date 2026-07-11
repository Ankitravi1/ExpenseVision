import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { api } from '../services/api';

// RFC-4180 style field escaping: doubles embedded quotes, wraps in quotes
// when the value contains a comma, quote, or newline.
export const csvField = (value: unknown): string => {
    const str = value === null || value === undefined ? '' : String(value);
    if (/[",\n\r]/.test(str)) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
};

// Writes an already-built CSV string to disk and opens the native share sheet.
export const shareReportCsv = async (csv: string, fileName: string): Promise<void> => {
    const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
    await FileSystem.writeAsStringAsync(fileUri, csv, { encoding: FileSystem.EncodingType.UTF8 });

    if (!(await Sharing.isAvailableAsync())) {
        throw new Error('Sharing is not available on this device');
    }
    await Sharing.shareAsync(fileUri, { mimeType: 'text/csv', dialogTitle: 'Export report' });
};

// Downloads the user's transactions as CSV and opens the native share sheet
export const shareTransactionsCsv = async (): Promise<void> => {
    const csv = await api.exportTransactionsCsv();
    const fileName = `transactions_${new Date().toISOString().split('T')[0]}.csv`;
    const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
    await FileSystem.writeAsStringAsync(fileUri, csv, { encoding: FileSystem.EncodingType.UTF8 });

    if (!(await Sharing.isAvailableAsync())) {
        throw new Error('Sharing is not available on this device');
    }
    await Sharing.shareAsync(fileUri, { mimeType: 'text/csv', dialogTitle: 'Export transactions' });
};
