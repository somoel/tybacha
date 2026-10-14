import { describe, expect, it } from 'vitest';
import { SignJWT } from 'jose';
import { env } from '../src/config/env.js';
import {
  createAccessToken,
  createRefreshToken,
  hashToken,
  verifyAccessToken,
  verifyRefreshToken,
} from '../src/infrastructure/auth/tokens.js';

const user = { idUsuario: 7, correo: 'ana@x.com', rol: 'profesional' } as const;
const accessSecret = new TextEncoder().encode(env.JWT_ACCESS_SECRET);
const refreshSecret = new TextEncoder().encode(env.JWT_REFRESH_SECRET);

describe('hashToken', () => {
  it('es sha256 en hex y es estable', () => {
    expect(hashToken('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    expect(hashToken('abc')).toBe(hashToken('abc'));
    expect(hashToken('abc')).not.toBe(hashToken('abd'));
  });
});

describe('access tokens', () => {
  it('round-trip con los claims correctos', async () => {
    const token = await createAccessToken(user);
    const parsed = await verifyAccessToken(token);

    expect(parsed).toEqual(user);
  });

  it('usa un secreto distinto al del refresh token', async () => {
    const accessToken = await createAccessToken(user);

    await expect(verifyRefreshToken(accessToken)).rejects.toThrow();
  });

  it('rechaza tokens firmados con otro secreto', async () => {
    const forged = await new SignJWT({ correo: user.correo, rol: user.rol })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(String(user.idUsuario))
      .setIssuedAt()
      .setExpirationTime('15m')
      .sign(new TextEncoder().encode('otro-secreto-completamente-distinto'));

    await expect(verifyAccessToken(forged)).rejects.toThrow();
  });

  it('rechaza tokens expirados', async () => {
    const expired = await new SignJWT({ correo: user.correo, rol: user.rol })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(String(user.idUsuario))
      .setIssuedAt(Math.floor(Date.now() / 1000) - 3600)
      .setExpirationTime(Math.floor(Date.now() / 1000) - 1800)
      .sign(accessSecret);

    await expect(verifyAccessToken(expired)).rejects.toThrow();
  });

  it('rechaza tokens basura', async () => {
    await expect(verifyAccessToken('no-es-un-jwt')).rejects.toThrow();
  });
});

describe('refresh tokens', () => {
  it('round-trip con los claims correctos', async () => {
    const token = await createRefreshToken(user);
    const parsed = await verifyRefreshToken(token);

    expect(parsed).toEqual(user);
  });

  it('el refresh token no sirve como access token', async () => {
    const refreshToken = await createRefreshToken(user);

    await expect(verifyAccessToken(refreshToken)).rejects.toThrow();
  });

  it('cada emisión produce un token distinto (jti aleatorio)', async () => {
    const [a, b] = await Promise.all([createRefreshToken(user), createRefreshToken(user)]);
    expect(a).not.toBe(b);
  });
});
