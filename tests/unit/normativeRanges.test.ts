import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    NORMATIVE_RANGES,
    TEST_NAMES,
    calculateAgeBand,
    calculateNormativePercentage,
    getNormativeRange,
    getPerformanceCategory,
    type AgeBand,
    type SFTTestType,
} from '@shared/constants/normativeRanges';

const TEST_TYPES: SFTTestType[] = [
    'chair_stand',
    'arm_curl',
    'six_min_walk',
    'two_min_step',
    'chair_sit_reach',
    'back_scratch',
    'up_and_go',
];

const GENDERS = ['M', 'F'] as const;
const BANDS: AgeBand[] = ['60-64', '65-69', '70-74', '75-79', '80-84', '85-89', '90-94'];

describe('tabla normativa', () => {
    it('define nombre canónico para los 7 tests', () => {
        expect(Object.keys(TEST_NAMES).sort()).toEqual([...TEST_TYPES].sort());
        for (const testType of TEST_TYPES) {
            expect(TEST_NAMES[testType].length).toBeGreaterThan(0);
        }
    });

    it('cubre los 7 tests × 2 géneros × 7 franjas etarias', () => {
        expect(Object.keys(NORMATIVE_RANGES).sort()).toEqual([...TEST_TYPES].sort());

        for (const testType of TEST_TYPES) {
            for (const gender of GENDERS) {
                expect(Object.keys(NORMATIVE_RANGES[testType][gender]).sort()).toEqual(
                    [...BANDS].sort(),
                );
            }
        }
    });

    it('todas las franjas tienen low <= high (p25 <= p75)', () => {
        for (const testType of TEST_TYPES) {
            for (const gender of GENDERS) {
                for (const band of BANDS) {
                    const range = NORMATIVE_RANGES[testType][gender][band];
                    expect(range.low, `${testType}/${gender}/${band}`).toBeLessThanOrEqual(range.high);
                }
            }
        }
    });

    it('los valores son finitos', () => {
        for (const testType of TEST_TYPES) {
            for (const gender of GENDERS) {
                for (const band of BANDS) {
                    const range = NORMATIVE_RANGES[testType][gender][band];
                    expect(Number.isFinite(range.low)).toBe(true);
                    expect(Number.isFinite(range.high)).toBe(true);
                }
            }
        }
    });
});

describe('getNormativeRange', () => {
    it('devuelve el rango esperado', () => {
        expect(getNormativeRange('chair_stand', 'M', '60-64')).toEqual({ low: 14, high: 19 });
        expect(getNormativeRange('up_and_go', 'F', '90-94')).toEqual({ low: 7.3, high: 11.5 });
    });

    it('devuelve null para combinaciones desconocidas', () => {
        expect(
            getNormativeRange('chair_stand' as SFTTestType, 'M', '95-99' as AgeBand),
        ).toBeNull();
        expect(
            getNormativeRange('no_existe' as SFTTestType, 'M', '60-64'),
        ).toBeNull();
    });
});

describe('calculateAgeBand', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-06-15T12:00:00Z'));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it.each([
        ['1966-01-01', '60-64'],
        ['1961-01-01', '65-69'],
        ['1956-01-01', '70-74'],
        ['1951-01-01', '75-79'],
        ['1946-01-01', '80-84'],
        ['1941-01-01', '85-89'],
        ['1932-01-01', '90-94'],
    ])('devuelve %s → %s', (birthDate, expected) => {
        expect(calculateAgeBand(birthDate)).toBe(expected);
    });

    it('devuelve null por debajo de los 60 años', () => {
        expect(calculateAgeBand('1967-01-01')).toBeNull();
        expect(calculateAgeBand('1990-05-10')).toBeNull();
    });

    it('devuelve null por encima de los 94 años', () => {
        expect(calculateAgeBand('1931-01-01')).toBeNull();
        expect(calculateAgeBand('1920-01-01')).toBeNull();
    });

    it('devuelve null con una fecha invalida', () => {
        expect(calculateAgeBand('no-fecha')).toBeNull();
        expect(calculateAgeBand('')).toBeNull();
    });

    it('ignora la hora si viene un datetime', () => {
        expect(calculateAgeBand('1966-01-01T23:59:59Z')).toBe('60-64');
    });
});

describe('getPerformanceCategory (mas alto es mejor)', () => {
    const range = { low: 10, high: 15 };

    it('clasifica por debajo del percentil 25', () => {
        expect(getPerformanceCategory(9.9, range, true)).toBe('Bajo promedio');
        expect(getPerformanceCategory(0, range, true)).toBe('Bajo promedio');
    });

    it('clasifica dentro del rango normal como Promedio', () => {
        expect(getPerformanceCategory(10, range, true)).toBe('Promedio');
        expect(getPerformanceCategory(12.5, range, true)).toBe('Promedio');
        expect(getPerformanceCategory(15, range, true)).toBe('Promedio');
    });

    it('clasifica por encima del percentil 75', () => {
        expect(getPerformanceCategory(17.5, range, true)).toBe('Por encima del promedio');
    });

    it('clasifica excelente mas alla del 50% del rango superior', () => {
        expect(getPerformanceCategory(17.6, range, true)).toBe('Excelente');
        expect(getPerformanceCategory(100, range, true)).toBe('Excelente');
    });
});

describe('getPerformanceCategory (mas bajo es mejor: up_and_go)', () => {
    // p25 = 3.8s (rapido), p75 = 5.6s (lento)
    const range = { low: 3.8, high: 5.6 };

    it('tiempo por encima del percentil 75 es Bajo promedio', () => {
        expect(getPerformanceCategory(6.5, range, false)).toBe('Bajo promedio');
        expect(getPerformanceCategory(5.61, range, false)).toBe('Bajo promedio');
    });

    it('tiempo dentro del rango normal es Promedio', () => {
        expect(getPerformanceCategory(5.6, range, false)).toBe('Promedio');
        expect(getPerformanceCategory(4.7, range, false)).toBe('Promedio');
        expect(getPerformanceCategory(3.8, range, false)).toBe('Promedio');
    });

    it('tiempo por debajo del percentil 25 es Por encima del promedio', () => {
        expect(getPerformanceCategory(3.2, range, false)).toBe('Por encima del promedio');
        expect(getPerformanceCategory(2.9, range, false)).toBe('Por encima del promedio');
    });

    it('tiempo excepcionalmente bajo es Excelente', () => {
        expect(getPerformanceCategory(2.8, range, false)).toBe('Excelente');
        expect(getPerformanceCategory(1, range, false)).toBe('Excelente');
    });
});

describe('calculateNormativePercentage (mas alto es mejor)', () => {
    const range = { low: 10, high: 15 };

    it('mapea el tramo inferior a 0-25', () => {
        expect(calculateNormativePercentage(5, range, true)).toBe(0);
        expect(calculateNormativePercentage(7.5, range, true)).toBeCloseTo(12.5, 5);
    });

    it('mapea el rango normal a 25-75', () => {
        expect(calculateNormativePercentage(10, range, true)).toBeCloseTo(25, 5);
        expect(calculateNormativePercentage(12.5, range, true)).toBeCloseTo(50, 5);
        expect(calculateNormativePercentage(15, range, true)).toBeCloseTo(75, 5);
    });

    it('mapea el tramo superior a 75-100', () => {
        expect(calculateNormativePercentage(17.5, range, true)).toBeCloseTo(100, 5);
        expect(calculateNormativePercentage(40, range, true)).toBe(100);
    });

    it('nunca sale de 0-100', () => {
        expect(calculateNormativePercentage(-1000, range, true)).toBe(0);
        expect(calculateNormativePercentage(1000, range, true)).toBe(100);
    });

    it('rango degenerado devuelve 50', () => {
        expect(calculateNormativePercentage(12, { low: 10, high: 10 }, true)).toBe(50);
        expect(calculateNormativePercentage(12, { low: 15, high: 10 }, true)).toBe(50);
    });
});

describe('calculateNormativePercentage (mas bajo es mejor: up_and_go)', () => {
    const range = { low: 3.8, high: 5.6 };

    it('es monotona decreciente respecto al tiempo', () => {
        const pctWorst = calculateNormativePercentage(6.5, range, false);
        const pctP75 = calculateNormativePercentage(5.6, range, false);
        const pctMid = calculateNormativePercentage(4.7, range, false);
        const pctP25 = calculateNormativePercentage(3.8, range, false);
        const pctBest = calculateNormativePercentage(2.5, range, false);

        expect(pctWorst).toBeLessThan(pctP75);
        expect(pctP75).toBeLessThan(pctMid);
        expect(pctMid).toBeLessThan(pctP25);
        expect(pctP25).toBeLessThan(pctBest);
    });

    it('ancla los percentiles en 25 y 75', () => {
        expect(calculateNormativePercentage(5.6, range, false)).toBeCloseTo(25, 5);
        expect(calculateNormativePercentage(3.8, range, false)).toBeCloseTo(75, 5);
    });

    it('mapea los extremos a 0 y 100', () => {
        expect(calculateNormativePercentage(6.5, range, false)).toBeCloseTo(12.5, 5);
        expect(calculateNormativePercentage(7.4, range, false)).toBeCloseTo(0, 5);
        expect(calculateNormativePercentage(9, range, false)).toBe(0);
        expect(calculateNormativePercentage(2.9, range, false)).toBeCloseTo(100, 5);
        expect(calculateNormativePercentage(1, range, false)).toBe(100);
    });

    it('nunca sale de 0-100', () => {
        for (const value of [-10, 0, 1, 3, 4, 5, 6, 7, 8, 100]) {
            const pct = calculateNormativePercentage(value, range, false);
            expect(pct).toBeGreaterThanOrEqual(0);
            expect(pct).toBeLessThanOrEqual(100);
        }
    });

    it('rango degenerado devuelve 50', () => {
        expect(calculateNormativePercentage(4, { low: 4, high: 4 }, false)).toBe(50);
    });
});
