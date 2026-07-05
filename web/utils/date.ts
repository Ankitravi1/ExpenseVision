export const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;
export const displayDatePattern = /^\d{2}-\d{2}-\d{4}$/;

export const todayIsoDate = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export const isoDateToDisplay = (value?: string | null) => {
    if (!value) return '';
    const datePart = value.split('T')[0];
    if (!isoDatePattern.test(datePart)) return value;
    const [year, month, day] = datePart.split('-');
    return `${day}-${month}-${year}`;
};

export const displayDateToIso = (value: string) => {
    const trimmed = value.trim().split('T')[0];
    if (isoDatePattern.test(trimmed)) return trimmed;
    if (!displayDatePattern.test(trimmed)) return null;

    const [day, month, year] = trimmed.split('-').map(Number);
    const candidate = new Date(year, month - 1, day);
    if (
        candidate.getFullYear() !== year ||
        candidate.getMonth() !== month - 1 ||
        candidate.getDate() !== day
    ) {
        return null;
    }

    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

export const transactionDateToIso = (value: string) => displayDateToIso(value) || value.split('T')[0];

export const formatTransactionDate = (value: string, includeTime = false) => {
    const [datePart, timePart] = value.split('T');
    const normalized = transactionDateToIso(datePart);
    const displayDate = isoDateToDisplay(normalized);
    if (!includeTime || !timePart) return displayDate;
    return `${displayDate} ${timePart.slice(0, 5)}`;
};
