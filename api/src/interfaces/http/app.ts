import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import Fastify from 'fastify';
import { ZodError } from 'zod';
import { env } from '../../config/env.js';
import { HttpError } from './httpErrors.js';
import { registerAlertRoutes } from './modules/alerts/routes.js';
import { registerAlertCronRoutes } from './modules/alerts/cron.js';
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
    logger: {
      level: process.env.LOG_LEVEL ?? 'info',
    },
  });

  const allowedOrigins = new Set(
    (env.CORS_ALLOWED_ORIGINS ?? 'https://tybacha.vercel.app,http://localhost:8081,http://localhost:19006,http://localhost:8082')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
  );

  app.log.info(
    {
      event: 'app_boot',
      nodeEnv: env.NODE_ENV,
      allowedOrigins: [...allowedOrigins],
      hasTidbHost: Boolean(env.TIDB_HOST),
      tidbDatabase: env.TIDB_DATABASE,
      hasCerebrasKey: Boolean(env.CEREBRAS_API_KEY),
    },
    'API app booting',
  );

  app.addHook('onRequest', async (request) => {
    request.log.info(
      {
        event: 'request_in',
        method: request.method,
        url: request.url,
        origin: request.headers.origin,
        accessControlRequestMethod: request.headers['access-control-request-method'],
        accessControlRequestHeaders: request.headers['access-control-request-headers'],
      },
      'Incoming request',
    );
  });

  app.addHook('onResponse', async (request, reply) => {
    request.log.info(
      {
        event: 'request_out',
        method: request.method,
        url: request.url,
        statusCode: reply.statusCode,
        origin: request.headers.origin,
        corsAllowOrigin: reply.getHeader('access-control-allow-origin'),
      },
      'Request completed',
    );
  });

  await app.register(cors, {
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.has(origin)) {
        app.log.info({ event: 'cors_allowed', origin }, 'CORS origin allowed');
        callback(null, true);
        return;
      }

      app.log.warn({ event: 'cors_blocked', origin }, 'CORS origin blocked');
      callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  await app.register(multipart, {
    limits: {
      fileSize: 5 * 1024 * 1024,
    },
  });

  app.setErrorHandler((error, request, reply) => {
    const errorDetails =
      error instanceof Error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          }
        : {
            message: String(error),
          };

    request.log.error(
      {
        event: 'request_error',
        method: request.method,
        url: request.url,
        origin: request.headers.origin,
        error: errorDetails,
      },
      'Request failed',
    );

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
  await registerAlertRoutes(app);
  await registerAlertCronRoutes(app);
  await registerReportRoutes(app);
  await registerAuditRoutes(app);
  await registerSyncRoutes(app);

  return app;
}
