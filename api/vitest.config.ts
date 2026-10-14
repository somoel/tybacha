import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const repoRoot = fileURLToPath(new URL('../', import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@shared': fileURLToPath(new URL('../shared', import.meta.url)),
      '@': repoRoot,
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    env: {
      NODE_ENV: 'test',
      LOG_LEVEL: 'silent',
      TIDB_HOST: '127.0.0.1',
      TIDB_PORT: '4000',
      TIDB_USER: 'test-user',
      TIDB_PASSWORD: 'test-password',
      TIDB_DATABASE: 'tybacha_test',
      TIDB_SSL: 'false',
      JWT_ACCESS_SECRET: 'test-access-secret-should-be-long-24',
      JWT_REFRESH_SECRET: 'test-refresh-secret-should-be-long-24',
      ACCESS_TOKEN_TTL_SECONDS: '900',
      REFRESH_TOKEN_TTL_DAYS: '30',
      CRON_SECRET: 'test-cron-secret',
      CORS_ALLOWED_ORIGINS: 'https://tybacha.vercel.app,http://localhost:8081',
    },
  },
});
