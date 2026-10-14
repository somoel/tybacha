import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { hashPassword } from '../src/infrastructure/auth/passwords.js';
import { createAccessToken } from '../src/infrastructure/auth/tokens.js';
import { pool } from '../src/infrastructure/db/pool.js';
import { buildApp } from '../src/interfaces/http/app.js';

vi.mock('../src/infrastructure/db/pool.js', () => ({
  pool: { query: vi.fn() },
  pingDatabase: vi.fn(),
}));

const queryMock = vi.mocked(pool.query);

const activeUserRow = {
  id_usuario: 7,
  correo: 'ana@x.com',
  contrasena_hash: '',
  rol: 'profesional',
  estado: 'activo',
};

function body(sql: string): string {
  return String(sql).toLowerCase();
}

describe('auth routes', () => {
  let instance: FastifyInstance;

  beforeAll(async () => {
    instance = await buildApp();
    await instance.ready();
  });

  afterAll(async () => {
    await instance.close();
  });

  beforeEach(() => {
    queryMock.mockReset();
  });

  describe('POST /auth/login', () => {
    it('responde 401 si el usuario no existe', async () => {
      queryMock.mockResolvedValue([[], []] as never);

      const response = await instance.inject({
        method: 'POST',
        url: '/auth/login',
        payload: { correo: 'nadie@x.com', contrasena: 'secreta123' },
      });

      expect(response.statusCode).toBe(401);
      expect(response.json()).toMatchObject({
        code: 'UNAUTHORIZED',
        message: 'Credenciales invalidas o usuario inactivo',
      });
    });

    it('responde 401 si el usuario no está activo', async () => {
      queryMock.mockResolvedValue([
        [{ ...activeUserRow, estado: 'bloqueado' }],
        [],
      ] as never);

      const response = await instance.inject({
        method: 'POST',
        url: '/auth/login',
        payload: { correo: 'ana@x.com', contrasena: 'secreta123' },
      });

      expect(response.statusCode).toBe(401);
      expect(response.json().message).toBe('Credenciales invalidas o usuario inactivo');
    });

    it('responde 401 si la contraseña es incorrecta', async () => {
      queryMock.mockResolvedValue([
        [{ ...activeUserRow, contrasena_hash: await hashPassword('otra-clave') }],
        [],
      ] as never);

      const response = await instance.inject({
        method: 'POST',
        url: '/auth/login',
        payload: { correo: 'ana@x.com', contrasena: 'secreta123' },
      });

      expect(response.statusCode).toBe(401);
      expect(response.json().message).toBe('Credenciales invalidas');
    });

    it('valida el payload con zod', async () => {
      const response = await instance.inject({
        method: 'POST',
        url: '/auth/login',
        payload: { correo: 'no-email', contrasena: 'corta' },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toMatchObject({ code: 'VALIDATION_ERROR' });
      expect(queryMock).not.toHaveBeenCalled();
    });

    it('devuelve tokens y usuario con login correcto', async () => {
      queryMock.mockImplementation((async (sql: string) => {
        if (body(sql).includes('from usuario')) {
          return [[{ ...activeUserRow, contrasena_hash: await hashPassword('secreta123') }], []];
        }
        return [{ affectedRows: 1 }, []];
      }) as never);

      const response = await instance.inject({
        method: 'POST',
        url: '/auth/login',
        payload: {
          correo: 'Ana@X.com',
          contrasena: 'secreta123',
          dispositivo: 'iPhone',
          recordarSesion: true,
        },
      });

      expect(response.statusCode).toBe(200);
      const json = response.json();
      expect(json.user).toEqual({ idUsuario: 7, correo: 'ana@x.com', rol: 'profesional' });
      expect(typeof json.accessToken).toBe('string');
      expect(typeof json.refreshToken).toBe('string');

      const calls = queryMock.mock.calls;
      expect(calls).toHaveLength(3);
      expect(body(calls[0][0])).toContain('from usuario');
      expect(calls[0][1]).toMatchObject({ correo: 'ana@x.com' });
      expect(body(calls[1][0])).toContain('insert into sesion_usuario');
      expect(calls[1][1]).toMatchObject({
        idUsuario: 7,
        dispositivo: 'iPhone',
        recordarSesion: 1,
        days: 30,
      });
      expect(body(calls[2][0])).toContain('update usuario');
    });

    it('usa 7 días de refresh cuando no se pide recordar sesión', async () => {
      queryMock.mockImplementation((async (sql: string) => {
        if (body(sql).includes('from usuario')) {
          return [[{ ...activeUserRow, contrasena_hash: await hashPassword('secreta123') }], []];
        }
        return [{ affectedRows: 1 }, []];
      }) as never);

      await instance.inject({
        method: 'POST',
        url: '/auth/login',
        payload: { correo: 'ana@x.com', contrasena: 'secreta123' },
      });

      expect(queryMock.mock.calls[1][1]).toMatchObject({ days: 7, recordarSesion: 0 });
    });
  });

  describe('POST /auth/refresh', () => {
    it('valida el payload', async () => {
      const response = await instance.inject({
        method: 'POST',
        url: '/auth/refresh',
        payload: { refreshToken: 'corto' },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().code).toBe('VALIDATION_ERROR');
    });

    it('responde 401 con un refresh token inválido', async () => {
      const response = await instance.inject({
        method: 'POST',
        url: '/auth/refresh',
        payload: { refreshToken: 'a'.repeat(32) },
      });

      expect(response.statusCode).toBe(401);
      expect(response.json().message).toBe('Sesion expirada');
      expect(queryMock).not.toHaveBeenCalled();
    });

    it('responde 401 si la sesión no existe o fue revocada', async () => {
      const { createRefreshToken } = await import('../src/infrastructure/auth/tokens.js');
      const refreshToken = await createRefreshToken({
        idUsuario: 7,
        correo: 'ana@x.com',
        rol: 'profesional',
      });
      queryMock.mockResolvedValue([[], []] as never);

      const response = await instance.inject({
        method: 'POST',
        url: '/auth/refresh',
        payload: { refreshToken },
      });

      expect(response.statusCode).toBe(401);
      expect(response.json().message).toBe('Sesion expirada');
    });

    it('responde 401 si el usuario dejó de estar activo', async () => {
      const { createRefreshToken } = await import('../src/infrastructure/auth/tokens.js');
      const refreshToken = await createRefreshToken({
        idUsuario: 7,
        correo: 'ana@x.com',
        rol: 'profesional',
      });
      queryMock.mockResolvedValue([
        [{ id_sesion_usuario: 1, estado: 'inactivo' }],
        [],
      ] as never);

      const response = await instance.inject({
        method: 'POST',
        url: '/auth/refresh',
        payload: { refreshToken },
      });

      expect(response.statusCode).toBe(401);
    });

    it('emite un nuevo access token con sesión válida', async () => {
      const { createRefreshToken, verifyAccessToken } = await import(
        '../src/infrastructure/auth/tokens.js'
      );
      const refreshToken = await createRefreshToken({
        idUsuario: 7,
        correo: 'ana@x.com',
        rol: 'profesional',
      });
      queryMock.mockResolvedValue([
        [{ id_sesion_usuario: 1, estado: 'activo' }],
        [],
      ] as never);

      const response = await instance.inject({
        method: 'POST',
        url: '/auth/refresh',
        payload: { refreshToken },
      });

      expect(response.statusCode).toBe(200);
      const { accessToken } = response.json();
      await expect(verifyAccessToken(accessToken)).resolves.toEqual({
        idUsuario: 7,
        correo: 'ana@x.com',
        rol: 'profesional',
      });
    });
  });

  describe('authGuard integrado', () => {
    it('un token de access válido permite usar rutas protegidas', async () => {
      const token = await createAccessToken({
        idUsuario: 1,
        correo: 'admin@x.com',
        rol: 'administrador',
      });
      queryMock.mockResolvedValue([[], []] as never);

      const response = await instance.inject({
        method: 'GET',
        url: '/audit/changes',
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual([]);
    });
  });
});
