import { SignJWT, jwtVerify } from 'jose';
import { createHash, randomUUID } from 'node:crypto';
import { env } from '../../config/env.js';
import type { UserRole } from '../../domain/roles.js';

const accessSecret = new TextEncoder().encode(env.JWT_ACCESS_SECRET);
const refreshSecret = new TextEncoder().encode(env.JWT_REFRESH_SECRET);

export interface TokenUser {
  idUsuario: number;
  correo: string;
  rol: UserRole;
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export async function createAccessToken(user: TokenUser): Promise<string> {
  return new SignJWT({
    correo: user.correo,
    rol: user.rol,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(String(user.idUsuario))
    .setIssuedAt()
    .setExpirationTime(`${env.ACCESS_TOKEN_TTL_SECONDS}s`)
    .sign(accessSecret);
}

export async function createRefreshToken(user: TokenUser): Promise<string> {
  return new SignJWT({
    correo: user.correo,
    rol: user.rol,
    jti: randomUUID(),
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(String(user.idUsuario))
    .setIssuedAt()
    .setExpirationTime(`${env.REFRESH_TOKEN_TTL_DAYS}d`)
    .sign(refreshSecret);
}

export async function verifyAccessToken(token: string): Promise<TokenUser> {
  const result = await jwtVerify(token, accessSecret);
  return {
    idUsuario: Number(result.payload.sub),
    correo: String(result.payload.correo),
    rol: result.payload.rol as UserRole,
  };
}

