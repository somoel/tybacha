import type { FastifyReply, FastifyRequest } from 'fastify';
import { verifyAccessToken, type TokenUser } from '../../infrastructure/auth/tokens.js';
import { unauthorized } from './httpErrors.js';

declare module 'fastify' {
  interface FastifyRequest {
    authUser?: TokenUser;
  }
}

export async function authGuard(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
  const header = request.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    throw unauthorized();
  }

  request.authUser = await verifyAccessToken(header.slice('Bearer '.length));
}

