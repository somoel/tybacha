import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_HOST: z.string().default('0.0.0.0'),
  API_PORT: z.coerce.number().int().positive().default(4001),
  TIDB_HOST: z.string().min(1),
  TIDB_PORT: z.coerce.number().int().positive().default(4000),
  TIDB_USER: z.string().min(1),
  TIDB_PASSWORD: z.string().min(1),
  TIDB_DATABASE: z.string().min(1),
  TIDB_SSL: z.coerce.boolean().default(true),
  JWT_ACCESS_SECRET: z.string().min(24),
  JWT_REFRESH_SECRET: z.string().min(24),
  ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(900),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),
  CORS_ALLOWED_ORIGINS: z.string().optional(),
  CRON_SECRET: z.string().optional(),
  CEREBRAS_API_KEY: z.string().optional(),
  CEREBRAS_MODEL: z.string().default('gpt-oss-120b'),
  SEED_ADMIN_EMAIL: z.string().email().default('admin@tybacha.local'),
  SEED_ADMIN_PASSWORD: z.string().min(8).default('ChangeMe123*'),
  SEED_ADMIN_NAMES: z.string().default('Administrador'),
  SEED_ADMIN_LASTNAMES: z.string().default('Tybacha'),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error(
    JSON.stringify({
      event: 'env_validation_failed',
      issues: parsedEnv.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    }),
  );

  throw parsedEnv.error;
}

export const env = parsedEnv.data;
