import { describe, expect, it } from 'vitest';
import { SFT_TESTS, getSFTTest } from '@/src/constants/sftTests';

const REQUIRED_TYPES = [
    'chair_stand',
    'arm_curl',
    'two_min_step',
    'chair_sit_reach',
    'back_scratch',
    'up_and_go',
] as const;

describe('SFT_TESTS', () => {
    it('contiene exactamente las 6 pruebas activas', () => {
        expect(SFT_TESTS).toHaveLength(6);
        expect(SFT_TESTS.map((test) => test.type).sort()).toEqual([...REQUIRED_TYPES].sort());
    });

    it('mantiene oculta la caminata de 6 minutos', () => {
        expect(SFT_TESTS.some((test) => test.type === 'six_min_walk')).toBe(false);
    });

    it('tiene tipos y nombres unicos', () => {
        const types = SFT_TESTS.map((test) => test.type);
        const names = SFT_TESTS.map((test) => test.name);
        expect(new Set(types).size).toBe(types.length);
        expect(new Set(names).size).toBe(names.length);
    });

    it('cada prueba tiene procedimiento, seguridad y etiqueta de entrada', () => {
        for (const test of SFT_TESTS) {
            expect(test.name.length, test.type).toBeGreaterThan(0);
            expect(test.shortName.length, test.type).toBeGreaterThan(0);
            expect(test.description.length, test.type).toBeGreaterThan(0);
            expect(test.inputLabel.length, test.type).toBeGreaterThan(0);
            expect(test.procedure!.length, test.type).toBeGreaterThan(0);
            expect(test.safetyTips!.length, test.type).toBeGreaterThan(0);
            expect(test.unit, test.type).toMatch(/^(reps|steps|cm|seconds)$/);
        }
    });

    it('los modos de cronometro/contador son coherentes con la unidad', () => {
        const timerTests = SFT_TESTS.filter((test) => test.timerMode === 'countdown');
        expect(timerTests.map((test) => test.type).sort()).toEqual(['arm_curl', 'chair_stand', 'two_min_step']);

        const stopwatch = SFT_TESTS.filter((test) => test.timerMode === 'stopwatch');
        expect(stopwatch.map((test) => test.type)).toEqual(['up_and_go']);

        const manual = SFT_TESTS.filter((test) => test.counterMode === 'manual_input');
        expect(manual.map((test) => test.type).sort()).toEqual(['back_scratch', 'chair_sit_reach']);
    });

    it('solo las flexibilidades admiten valores negativos', () => {
        const negative = SFT_TESTS.filter((test) => test.allowNegative);
        expect(negative.map((test) => test.type).sort()).toEqual(['back_scratch', 'chair_sit_reach']);
    });

    it('los umbrales legacy estan en el sentido correcto del test', () => {
        for (const test of SFT_TESTS) {
            const r = test.normativeRanges!;
            const ordered = r.higherIsBetter
                ? [r.belowBelowAvg, r.belowAvg, r.avg, r.aboveAvg, r.excellent]
                : [r.excellent, r.aboveAvg, r.avg, r.belowAvg, r.belowBelowAvg];

            for (let i = 1; i < ordered.length; i++) {
                expect(ordered[i], `${test.type}[${i}]`).toBeGreaterThan(ordered[i - 1]);
            }
        }
    });

    it('up_and_go es la unica prueba donde menor es mejor', () => {
        const lowerIsBetter = SFT_TESTS.filter((test) => !test.normativeRanges!.higherIsBetter);
        expect(lowerIsBetter.map((test) => test.type)).toEqual(['up_and_go']);
    });

    it('los cronometros tienen una duracion positiva', () => {
        for (const test of SFT_TESTS) {
            if (test.timerMode === 'countdown') {
                expect(test.timerSeconds, test.type).toBeGreaterThan(0);
            }
        }
    });
});

describe('getSFTTest', () => {
    it('devuelve la definicion por tipo', () => {
        expect(getSFTTest('up_and_go')?.name).toBe('Levantarse, caminar y volverse a sentar');
    });

    it('devuelve undefined para tipos desconocidos', () => {
        expect(getSFTTest('six_min_walk')).toBeUndefined();
        expect(getSFTTest('otro')).toBeUndefined();
    });
});
