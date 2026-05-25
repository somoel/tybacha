import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import Fastify from 'fastify';
import { ZodError } from 'zod';
import { HttpError } from './httpErrors.js';
import { registerAuditRoutes } from './modules/audit/routes.js';
import { registerAuthRoutes } from './modules/auth/routes.js';
import { registerConsentRoutes } from './modules/consents/routes.js';
import { registerExercisePlanRoutes } from './modules/exercisePlans/routes.js';
import { registerHealthRoutes } from './modules/health/routes.js';
import { registerNotificationRoutes } from './modules/notifications/routes.js';
import { registerOlderAdultRoutes } from './modules/olderAdults/routes.js';
import { registerReportRoutes } from './modules/reports/routes.js';
import { registerSftRoutes } from './modules/sft/routes.js';
import { registerSyncRoutes } from './modules/sync/routes.js';
import { registerTrackingRoutes } from './modules/tracking/routes.js';
import { registerUserRoutes } from './modules/users/routes.js';

export async function buildApp() {
  const app = Fastify({
    logger: true,
  });

  await app.register(cors, {
    origin: true,
    credentials: true,
  });

  await app.register(multipart, {
    limits: {
      fileSize: 5 * 1024 * 1024,
    },
  });

  app.setErrorHandler((error, request, reply) => {
    request.log.error(error);

    if (error instanceof ZodError) {
      return reply.status(400).send({
        code: 'VALIDATION_ERROR',
        message: 'Datos invalidos',
        issues: error.issues,
      });
    }

    if (error instanceof HttpError) {
      return reply.status(error.statusCode).send({
        code: error.code,
        message: error.message,
      });
    }

    return reply.status(500).send({
      code: 'INTERNAL_ERROR',
      message: 'Error interno del servidor',
    });
  });

  await registerHealthRoutes(app);
  await registerAuthRoutes(app);
  await registerUserRoutes(app);
  await registerOlderAdultRoutes(app);
  await registerConsentRoutes(app);
  await registerSftRoutes(app);
  await registerExercisePlanRoutes(app);
  await registerTrackingRoutes(app);
  await registerNotificationRoutes(app);
  await registerReportRoutes(app);
  await registerAuditRoutes(app);
  await registerSyncRoutes(app);

  return app;
}
