import type { FastifyInstance } from 'fastify';
import { env } from '../../../../config/env.js';
import { processPendingAlerts, processExerciseReminders, processProgressAlerts } from '../../../../infrastructure/alerts/alertProcessor.js';

export async function registerAlertCronRoutes(app: FastifyInstance): Promise<void> {
  app.post('/cron/process-alerts', async (request, reply) => {
    const authHeader = request.headers.authorization;
    const cronSecret = env.CRON_SECRET;

    if (!cronSecret) {
      reply.status(503);
      return { error: 'CRON_SECRET not configured' };
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      reply.status(401);
      return { error: 'Unauthorized' };
    }

    const results = {
      scheduledAlerts: { processed: 0, errors: 0 },
      exerciseReminders: { sent: 0 },
      progressAlerts: { alerts: 0 },
    };

    try {
      results.scheduledAlerts = await processPendingAlerts();
    } catch (error) {
      app.log.error({ err: error }, 'Failed to process scheduled alerts');
    }

    try {
      results.exerciseReminders = await processExerciseReminders();
    } catch (error) {
      app.log.error({ err: error }, 'Failed to process exercise reminders');
    }

    try {
      results.progressAlerts = await processProgressAlerts();
    } catch (error) {
      app.log.error({ err: error }, 'Failed to process progress alerts');
    }

    return results;
  });
}
