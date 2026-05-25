import { env } from './config/env.js';
import { pingDatabase } from './infrastructure/db/pool.js';
import { buildApp } from './interfaces/http/app.js';

const app = await buildApp();

await pingDatabase();

await app.listen({
  host: env.API_HOST,
  port: env.API_PORT,
});

