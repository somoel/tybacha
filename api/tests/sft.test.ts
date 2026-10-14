import { describe, expect, it } from 'vitest';
import { SFT_TESTS } from '../../src/constants/sftTests.js';
import {
  NORMATIVE_RANGES,
  TEST_NAMES,
  type SFTTestType,
} from '../../shared/constants/normativeRanges.js';
import { ORDER_TO_TEST_TYPE } from '../src/interfaces/http/modules/sft/routes.js';

describe('ORDER_TO_TEST_TYPE', () => {
  it('cubre los órdenes 1-7 de la batería', () => {
    expect(Object.keys(ORDER_TO_TEST_TYPE).map(Number).sort((a, b) => a - b)).toEqual([
      1, 2, 3, 4, 5, 6, 7,
    ]);
  });

  it('mapea cada orden a un tipo conocido con nombre', () => {
    for (const [order, testType] of Object.entries(ORDER_TO_TEST_TYPE)) {
      expect(TEST_NAMES[testType], `orden ${order}`).toBeTruthy();
      expect(NORMATIVE_RANGES[testType], `orden ${order}`).toBeDefined();
    }
  });

  it('el orden 3 sigue siendo six_min_walk (oculto de la app pero en la BD)', () => {
    expect(ORDER_TO_TEST_TYPE[3]).toBe('six_min_walk');
  });

  it('no hay dos órdenes apuntando al mismo tipo', () => {
    const types = Object.values(ORDER_TO_TEST_TYPE);
    expect(new Set(types).size).toBe(types.length);
  });
});

describe('SFT_TESTS de la app vs el mapeo del API', () => {
  const visibleTypes = SFT_TESTS.map((test) => test.type);

  it('la app muestra 6 pruebas (six_min_walk oculta)', () => {
    expect(visibleTypes).toHaveLength(6);
    expect(visibleTypes).not.toContain('six_min_walk');
  });

  it('cada prueba visible existe en ORDER_TO_TEST_TYPE', () => {
    const apiTypes = new Set(Object.values(ORDER_TO_TEST_TYPE));
    for (const type of visibleTypes) {
      expect(apiTypes.has(type as SFTTestType), type).toBe(true);
    }
  });

  it('los tipos de la app coinciden con las claves de TEST_NAMES', () => {
    for (const test of SFT_TESTS) {
      expect(Object.keys(TEST_NAMES)).toContain(test.type);
    }
  });

  it('las unidades de la app son coherentes con la práctica del API', () => {
    const units = Object.fromEntries(SFT_TESTS.map((t) => [t.type, t.unit]));

    expect(units.chair_stand).toBe('reps');
    expect(units.arm_curl).toBe('reps');
    expect(units.two_min_step).toBe('steps');
    expect(units.chair_sit_reach).toBe('cm');
    expect(units.back_scratch).toBe('cm');
    expect(units.up_and_go).toBe('seconds');
  });
});
