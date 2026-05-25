import type { FastifyInstance, preHandlerHookHandler } from 'fastify';
import type { UserRole } from '../../domain/roles.js';
import { authGuard } from './authGuard.js';
import { forbidden } from './httpErrors.js';

export function requireAuth(app: FastifyInstance): preHandlerHookHandler[] {
  return [authGuard.bind(app)];
}

export function requireRoles(app: FastifyInstance, roles: UserRole[]): preHandlerHookHandler[] {
  return [
    authGuard.bind(app),
    async (request) => {
      if (!request.authUser || !roles.includes(request.authUser.rol)) {
        throw forbidden();
      }
    },
  ];
}

