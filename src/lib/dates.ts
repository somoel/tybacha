import { format } from 'date-fns';

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const NAIVE_DATETIME_PATTERN = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}/;
const HAS_OFFSET_PATTERN = /(Z|[+-]\d{2}:?\d{2})$/;

export function parseDateOnly(value: string): Date {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day);
}

export function parseApiDate(value: string): Date {
    if (DATE_ONLY_PATTERN.test(value)) {
        return parseDateOnly(value);
    }
    if (NAIVE_DATETIME_PATTERN.test(value) && !HAS_OFFSET_PATTERN.test(value)) {
        return new Date(`${value.replace(' ', 'T')}Z`);
    }
    return new Date(value);
}

export function formatDateOnly(date: Date): string {
    return format(date, 'yyyy-MM-dd');
}
