import { describe, expect, it } from 'vitest';
import {
  ahoraEnColombia,
  diaDeSemanaEnColombia,
  formatFechaColombia,
  hoyEnColombia,
  toMysqlDatetime,
  toUtcIso,
} from '../src/infrastructure/db/datetime.js';

describe('toUtcIso', () => {
  it('convierte el datetime naive de MySQL a ISO con Z', () => {
    expect(toUtcIso('2026-01-15 10:30:00')).toBe('2026-01-15T10:30:00Z');
  });

  it('conserva los strings que ya traen zona horaria', () => {
    expect(toUtcIso('2026-01-15T10:30:00Z')).toBe('2026-01-15T10:30:00Z');
    expect(toUtcIso('2026-01-15T05:30:00-05:00')).toBe('2026-01-15T05:30:00-05:00');
  });

  it('devuelve null para valores vacíos', () => {
    expect(toUtcIso(null)).toBeNull();
    expect(toUtcIso('')).toBeNull();
  });
});

describe('toMysqlDatetime', () => {
  it('elimina T y Z para el driver de MySQL', () => {
    expect(toMysqlDatetime('2026-01-15T10:30:00.000Z')).toBe('2026-01-15 10:30:00.000');
  });

  it('rechaza fechas inválidas', () => {
    expect(() => toMysqlDatetime('no-es-fecha')).toThrow('Campo invalido: fecha');
  });
});

describe('ahoraEnColombia / hoyEnColombia / diaDeSemanaEnColombia', () => {
  it('corre el reloj 5 horas atrás (UTC-5)', () => {
    const now = new Date('2026-01-15T12:00:00.000Z');
    expect(ahoraEnColombia(now).toISOString()).toBe('2026-01-15T07:00:00.000Z');
  });

  it('hoyEnColombia devuelve la fecha local colombiana', () => {
    // 02:00 UTC = 21:00 del día anterior en Colombia
    expect(hoyEnColombia(new Date('2026-01-16T02:00:00.000Z'))).toBe('2026-01-15');
    expect(hoyEnColombia(new Date('2026-01-15T12:00:00.000Z'))).toBe('2026-01-15');
  });

  it('diaDeSemanaEnColombia usa el día local', () => {
    // 2026-01-18 es domingo (0) en UTC; a las 02:00 UTC en Colombia sigue siendo sábado (6)
    expect(diaDeSemanaEnColombia(new Date('2026-01-18T02:00:00.000Z'))).toBe(6);
    expect(diaDeSemanaEnColombia(new Date('2026-01-18T12:00:00.000Z'))).toBe(0);
  });
});

describe('formatFechaColombia', () => {
  it('las columnas DATE se imprimen sin corrimiento', () => {
    expect(formatFechaColombia('2026-03-09', false)).toBe('09/03/2026');
    expect(formatFechaColombia('2026-03-09', true)).toBe('09/03/2026 00:00');
  });

  it('las columnas DATETIME se convierten de UTC a Colombia', () => {
    expect(formatFechaColombia('2026-03-09 15:45:00', true)).toBe('09/03/2026 10:45');
  });

  it('devuelve el valor original si no se puede parsear', () => {
    expect(formatFechaColombia('garbage', false)).toBe('garbage');
  });

  it('respeta los offsets ya presentes', () => {
    expect(formatFechaColombia('2026-03-09T10:45:00-05:00', true)).toBe('09/03/2026 10:45');
  });
});
