// Shared, timezone-safe date/period helpers for the Reports screen and its
// sub-components. Mirrors the semantics used by web/pages/Reports.tsx.
import { getCurrencySymbol } from '../../utils/currency';

export type ViewMode = 'Daily' | 'Weekly' | 'Monthly' | '3 Month' | 'Yearly' | 'Custom';

// Format a Date as a local YYYY-MM-DD (never use toISOString — that is UTC).
export const getLocalDateString = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// Parse a "YYYY-MM-DD" (or "YYYY-MM-DDTHH:mm") string as LOCAL midnight, so
// period math is timezone-safe. new Date("YYYY-MM-DD") parses as UTC and would
// shift the day in negative-offset timezones.
export const parseLocalDate = (s: string): Date => {
    const [y, m, d] = s.substring(0, 10).split('-').map(Number);
    return new Date(y, (m || 1) - 1, d || 1);
};

// The date component of a transaction date, safe for string comparison against
// range bounds. Transaction dates are "YYYY-MM-DD" OR "YYYY-MM-DDTHH:mm"; we
// always compare on the first 10 chars so timed end-date entries aren't dropped.
export const dayPart = (date: string): string => date.substring(0, 10);

const addDaysToDate = (d: Date, days: number): Date => {
    const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate() + days);
    return copy;
};

// Inclusive list of YYYY-MM-DD strings between start and end (guarded).
export const eachDayInRange = (start: string, end: string): string[] => {
    if (!start || !end || start > end) return [];
    const days: string[] = [];
    let cur = parseLocalDate(start);
    const endDate = parseLocalDate(end);
    let guard = 0;
    while (cur.getTime() <= endDate.getTime() && guard < 1200) {
        days.push(getLocalDateString(cur));
        cur = addDaysToDate(cur, 1);
        guard++;
    }
    return days;
};

// Compute the [start, end] range for a preset view mode anchored at `now`.
// Month-based modes anchor to day 1 first to avoid the 31st-overflow bug.
export const rangeForViewMode = (mode: ViewMode, now: Date = new Date()): { start: string; end: string } => {
    let start: Date;
    let end: Date;
    switch (mode) {
        case 'Daily':
            start = now;
            end = now;
            break;
        case 'Weekly': {
            const day = now.getDay();
            const diffToMonday = now.getDate() - day + (day === 0 ? -6 : 1);
            start = new Date(now.getFullYear(), now.getMonth(), diffToMonday);
            end = new Date(now.getFullYear(), now.getMonth(), diffToMonday + 6);
            break;
        }
        case 'Monthly':
            start = new Date(now.getFullYear(), now.getMonth(), 1);
            end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            break;
        case '3 Month':
            start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
            end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            break;
        case 'Yearly':
            start = new Date(now.getFullYear(), 0, 1);
            end = new Date(now.getFullYear(), 11, 31);
            break;
        default:
            start = new Date(now.getFullYear(), now.getMonth(), 1);
            end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }
    return { start: getLocalDateString(start), end: getLocalDateString(end) };
};

// Shift an existing [start,end] range by one period in `direction`.
// Month-based modes rebuild from day 1 to avoid the 31st-overflow bug.
export const shiftRange = (
    mode: ViewMode,
    start: string,
    end: string,
    direction: -1 | 1,
): { start: string; end: string } => {
    const curStart = parseLocalDate(start);
    let newStart = parseLocalDate(start);
    let newEnd = parseLocalDate(end);

    switch (mode) {
        case 'Daily':
            newStart = addDaysToDate(curStart, direction);
            newEnd = addDaysToDate(parseLocalDate(end), direction);
            break;
        case 'Weekly':
            newStart = addDaysToDate(curStart, direction * 7);
            newEnd = addDaysToDate(parseLocalDate(end), direction * 7);
            break;
        case 'Monthly':
            newStart = new Date(curStart.getFullYear(), curStart.getMonth() + direction, 1);
            newEnd = new Date(curStart.getFullYear(), curStart.getMonth() + direction + 1, 0);
            break;
        case '3 Month':
            newStart = new Date(curStart.getFullYear(), curStart.getMonth() + direction * 3, 1);
            newEnd = new Date(curStart.getFullYear(), curStart.getMonth() + direction * 3 + 3, 0);
            break;
        case 'Yearly':
            newStart = new Date(curStart.getFullYear() + direction, 0, 1);
            newEnd = new Date(curStart.getFullYear() + direction, 11, 31);
            break;
        default:
            return { start, end };
    }
    return { start: getLocalDateString(newStart), end: getLocalDateString(newEnd) };
};

// Human-readable label for the current period.
export const periodLabel = (mode: ViewMode, start: string, end: string): string => {
    const s = parseLocalDate(start);
    const e = parseLocalDate(end);
    const monthName = (d: Date) => d.toLocaleString('default', { month: 'short' });
    switch (mode) {
        case 'Daily':
            return s.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
        case 'Weekly':
            return `${s.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${e.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
        case 'Monthly':
            return s.toLocaleString('default', { month: 'long', year: 'numeric' });
        case '3 Month': {
            const sameYear = s.getFullYear() === e.getFullYear();
            return sameYear
                ? `${monthName(s)} – ${monthName(e)} ${e.getFullYear()}`
                : `${monthName(s)} ${s.getFullYear()} – ${monthName(e)} ${e.getFullYear()}`;
        }
        case 'Yearly':
            return String(s.getFullYear());
        default:
            return `${s.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: '2-digit' })} – ${e.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: '2-digit' })}`;
    }
};

// Compact currency string for tight cells, e.g. ₹1.2k / ₹450.
export const formatCompact = (val: number, currency: string): string => {
    if (val <= 0) return '';
    const symbol = getCurrencySymbol(currency);
    if (val >= 1000) return `${symbol}${(val / 1000).toFixed(1).replace('.0', '')}k`;
    return `${symbol}${Math.round(val)}`;
};

// Axis-friendly short number, e.g. 12k / 450.
export const formatAxis = (v: number): string => {
    if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(v >= 10000 ? 0 : 1).replace('.0', '')}k`;
    return String(Math.round(v));
};

// RFC 4180 field escaping: double embedded quotes; wrap fields containing a
// comma, quote, or newline in quotes.
export const csvField = (value: unknown): string => {
    const str = value == null ? '' : String(value);
    const escaped = str.replace(/"/g, '""');
    return /[",\n\r]/.test(str) ? `"${escaped}"` : escaped;
};

// Distinct palettes for expense vs income breakdowns (mirrors web).
export const EXPENSE_COLORS = ['#4f46e5', '#f43f5e', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899', '#6b7280', '#14b8a6', '#d946ef', '#0ea5e9'];
export const INCOME_COLORS = ['#10b981', '#059669', '#34d399', '#14b8a6', '#0d9488', '#2dd4bf', '#22c55e', '#84cc16', '#06b6d4', '#3b82f6'];
