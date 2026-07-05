import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { api } from '../services/api';

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
