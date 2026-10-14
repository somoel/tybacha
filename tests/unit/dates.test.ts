import { describe, expect, it } from 'vitest';
import { parseApiDate, parseDateOnly, formatDateOnly } from '@/src/lib/dates';

describe('parseDateOnly', () => {
    it('interpreta la fecha en horario local', () => {
        const date = parseDateOnly('1964-05-20');
        expect(date.getFullYear()).toBe(1964);
        expect(date.getMonth()).toBe(4);
        expect(date.getDate()).toBe(20);
    });

    it('devuelve una fecha invalida si el string no es una fecha', () => {
        expect(parseDateOnly('no-fecha').getTime()).toBeNaN();
    });
});

describe('parseApiDate', () => {
    it('convierte date-only sin desplazar el dia', () => {
        const date = parseApiDate('1964-05-20');
        expect(formatDateOnly(date)).toBe('1964-05-20');
    });

    it('trata un datetime sin offset como UTC', () => {
        const date = parseApiDate('2026-03-01T10:30:00');
        expect(date.toISOString()).toBe('2026-03-01T10:30:00.000Z');
    });

    it('acepta el separador de espacio en datetime naive', () => {
        const date = parseApiDate('2026-03-01 10:30:00');
        expect(date.toISOString()).toBe('2026-03-01T10:30:00.000Z');
    });

    it('respeta los offsets explicitos', () => {
        expect(parseApiDate('2026-03-01T10:30:00-05:00').toISOString()).toBe(
            '2026-03-01T15:30:00.000Z',
        );
        expect(parseApiDate('2026-03-01T10:30:00Z').toISOString()).toBe(
            '2026-03-01T10:30:00.000Z',
        );
    });

    it('propaga fechas invalidas', () => {
        expect(parseApiDate('basura').getTime()).toBeNaN();
    });
});

describe('formatDateOnly', () => {
    it('formatea como yyyy-MM-dd', () => {
        expect(formatDateOnly(new Date(2026, 0, 5))).toBe('2026-01-05');
    });

    it('rellena con ceros', () => {
        expect(formatDateOnly(new Date(2026, 8, 3))).toBe('2026-09-03');
    });
});
