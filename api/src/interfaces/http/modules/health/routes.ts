import type { FastifyInstance } from 'fastify';
import { pingDatabase } from '../../../../infrastructure/db/pool.js';

export async function registerHealthRoutes(app: FastifyInstance): Promise<void> {
  app.get('/health', async () => ({ ok: true }));

  app.get('/health/db', async () => {
    await pingDatabase();
    return { ok: true };
  });
}

