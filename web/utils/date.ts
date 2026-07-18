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

// Fixed DD-MM-YYYY. Use this ONLY for exported files (the CSV/Excel import
// template expects DD-MM-YYYY), never for on-screen display.
export const formatTransactionDate = (value: string, includeTime = false) => {
    const [datePart, timePart] = value.split('T');
    const normalized = transactionDateToIso(datePart);
    const displayDate = isoDateToDisplay(normalized);
    if (!includeTime || !timePart) return displayDate;
    return `${displayDate} ${timePart.slice(0, 5)}`;
};

// Locale-aware display formatting (uses the viewer's browser locale so US users
// see MM/DD/YYYY, UK/IN see DD/MM/YYYY, etc.). Use this for all on-screen dates;
// keep `formatTransactionDate` for exports.
export const formatDisplayDate = (value: string, includeTime = false) => {
    const [datePart, timePart] = (value || '').split('T');
    const iso = transactionDateToIso(datePart || '');
    const [y, m, d] = iso.split('-').map(Number);
    if (!y || !m || !d) return isoDateToDisplay(iso); // fall back if unparseable
    // Construct at local midday to avoid any timezone off-by-one on the date.
    const dt = new Date(y, m - 1, d, 12);
    const dateStr = new Intl.DateTimeFormat(undefined, { year: 'numeric', month: '2-digit', day: '2-digit' }).format(dt);
    if (!includeTime || !timePart) return dateStr;
    return `${dateStr} ${timePart.slice(0, 5)}`;
};
