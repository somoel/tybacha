import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { createAccessToken } from '../src/infrastructure/auth/tokens.js';
import { pingDatabase, pool } from '../src/infrastructure/db/pool.js';
import { buildApp } from '../src/interfaces/http/app.js';
import {
  processExerciseReminders,
  processPendingAlerts,
  processProgressAlerts,
} from '../src/infrastructure/alerts/alertProcessor.js';

vi.mock('../src/infrastructure/db/pool.js', () => ({
  pool: { query: vi.fn() },
  pingDatabase: vi.fn(),
}));

vi.mock('../src/infrastructure/alerts/alertProcessor.js', () => ({
  processPendingAlerts: vi.fn(),
  processExerciseReminders: vi.fn(),
  processProgressAlerts: vi.fn(),
}));

const ALLOWED_ORIGIN = 'https://tybacha.vercel.app';
const BLOCKED_ORIGIN = 'https://evil.example.com';

const adminToken = await createAccessToken({
  idUsuario: 1,
  correo: 'admin@x.com',
  rol: 'administrador',
});
const professionalToken = await createAccessToken({
  idUsuario: 2,
  correo: 'pro@x.com',
  rol: 'profesional',
});

describe('app', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    vi.mocked(pool.query).mockReset();
    vi.mocked(pingDatabase).mockReset();
    vi.mocked(processPendingAlerts).mockReset();
  });

  describe('health', () => {
    it('GET /health responde ok sin tocar la base de datos', async () => {
      const response = await app.inject({ method: 'GET', url: '/health' });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ ok: true });
      expect(pool.query).not.toHaveBeenCalled();
    });

    it('GET /health/db hace ping a la base de datos', async () => {
      vi.mocked(pingDatabase).mockResolvedValue(undefined as never);

      const response = await app.inject({ method: 'GET', url: '/health/db' });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ ok: true });
      expect(pingDatabase).toHaveBeenCalledTimes(1);
    });
  });

  describe('rutas inexistentes', () => {
    it('devuelve 404', async () => {
      const response = await app.inject({ method: 'GET', url: '/no-existe' });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('CORS', () => {
    it('permite el preflight desde un origen permitido', async () => {
      const response = await app.inject({
        method: 'OPTIONS',
        url: '/health',
        headers: {
          origin: ALLOWED_ORIGIN,
          'access-control-request-method': 'GET',
          'access-control-request-headers': 'content-type,authorization',
        },
      });

      expect(response.statusCode).toBeLessThan(300);
      expect(response.headers['access-control-allow-origin']).toBe(ALLOWED_ORIGIN);
    });

    it('bloquea el preflight desde un origen no permitido', async () => {
      const response = await app.inject({
        method: 'OPTIONS',
        url: '/health',
        headers: {
          origin: BLOCKED_ORIGIN,
          'access-control-request-method': 'GET',
        },
      });

      expect(response.headers['access-control-allow-origin']).toBeUndefined();
    });

    it('las peticiones sin origin no necesitan CORS', async () => {
      const response = await app.inject({ method: 'GET', url: '/health' });

      expect(response.statusCode).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBeUndefined();
    });
  });

  describe('autenticación', () => {
    it('401 sin cabecera Authorization', async () => {
      const response = await app.inject({ method: 'GET', url: '/audit/changes' });

      expect(response.statusCode).toBe(401);
      expect(response.json()).toMatchObject({ code: 'UNAUTHORIZED' });
    });

    it('401 con un token inválido', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/audit/changes',
        headers: { authorization: 'Bearer no-valido' },
      });

      expect(response.statusCode).toBe(401);
      expect(response.json().message).toBe('Sesion expirada');
    });

    it('401 con una cabecera que no es Bearer', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/audit/changes',
        headers: { authorization: 'Basic abc' },
      });

      expect(response.statusCode).toBe(401);
    });

    it('403 cuando el rol no está permitido', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/audit/changes',
        headers: { authorization: `Bearer ${professionalToken}` },
      });

      expect(response.statusCode).toBe(403);
      expect(response.json()).toMatchObject({ code: 'FORBIDDEN' });
      expect(pool.query).not.toHaveBeenCalled();
    });
  });

  describe('validación de query params', () => {
    it('400 VALIDATION_ERROR cuando limit supera el máximo', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/audit/changes?limit=999',
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toMatchObject({ code: 'VALIDATION_ERROR' });
      expect(pool.query).not.toHaveBeenCalled();
    });

    it('las queries válidas llegan a la base de datos', async () => {
      vi.mocked(pool.query).mockResolvedValue(
        [
          [
            {
              idAuditoriaCambio: 1,
              tablaAfectada: 'usuario',
              creadoEn: '2026-01-15 10:00:00',
            },
          ],
          [],
        ] as never,
      );

      const response = await app.inject({
        method: 'GET',
        url: '/audit/changes?tabla=usuario&limit=10',
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual([
        expect.objectContaining({
          idAuditoriaCambio: 1,
          tablaAfectada: 'usuario',
          creadoEn: '2026-01-15T10:00:00Z',
        }),
      ]);
      expect(pool.query.mock.calls[0][1]).toMatchObject({ tabla: 'usuario', limit: 10 });
    });
  });

  describe('POST /cron/process-alerts', () => {
    beforeEach(() => {
      vi.mocked(processExerciseReminders).mockReset();
      vi.mocked(processProgressAlerts).mockReset();
    });

    it('401 con un secreto incorrecto', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/cron/process-alerts',
        headers: { authorization: 'Bearer otro-secreto' },
      });

      expect(response.statusCode).toBe(401);
      expect(response.json()).toEqual({ error: 'Unauthorized' });
      expect(processPendingAlerts).not.toHaveBeenCalled();
    });

    it('401 sin cabecera', async () => {
      const response = await app.inject({ method: 'POST', url: '/cron/process-alerts' });

      expect(response.statusCode).toBe(401);
    });

    it('ejecuta los tres procesadores con el secreto correcto', async () => {
      vi.mocked(processPendingAlerts).mockResolvedValue({ processed: 2, errors: 0 } as never);
      vi.mocked(processExerciseReminders).mockResolvedValue({ sent: 3 } as never);
      vi.mocked(processProgressAlerts).mockResolvedValue({ alerts: 1 } as never);

      const response = await app.inject({
        method: 'POST',
        url: '/cron/process-alerts',
        headers: { authorization: 'Bearer test-cron-secret' },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({
        scheduledAlerts: { processed: 2, errors: 0 },
        exerciseReminders: { sent: 3 },
        progressAlerts: { alerts: 1 },
      });
    });

    it('un fallo en un procesador no detiene a los demás', async () => {
      vi.mocked(processPendingAlerts).mockRejectedValue(new Error('boom') as never);
      vi.mocked(processExerciseReminders).mockResolvedValue({ sent: 1 } as never);
      vi.mocked(processProgressAlerts).mockResolvedValue({ alerts: 0 } as never);

      const response = await app.inject({
        method: 'POST',
        url: '/cron/process-alerts',
        headers: { authorization: 'Bearer test-cron-secret' },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({
        scheduledAlerts: { processed: 0, errors: 0 },
        exerciseReminders: { sent: 1 },
        progressAlerts: { alerts: 0 },
      });
    });
  });

  describe('errores internos', () => {
    it('los errores no controlados responden 500 INTERNAL_ERROR', async () => {
      vi.mocked(pool.query).mockRejectedValue(new Error('db down') as never);

      const response = await app.inject({
        method: 'GET',
        url: '/audit/changes',
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(response.statusCode).toBe(500);
      expect(response.json()).toMatchObject({ code: 'INTERNAL_ERROR' });
    });
  });
});
