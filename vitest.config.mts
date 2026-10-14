import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const fromRoot = (target: string): string => path.resolve(projectRoot, target);

export default defineConfig({
  resolve: {
    alias: [
      // Mismos aliases que tsconfig.json
      { find: /^@\/(.*)$/, replacement: fromRoot('$1') },
      { find: /^@shared\/(.*)$/, replacement: fromRoot('shared/$1') },
      // Modulos nativos de Expo/React Native sustituidos por dobles de prueba
      { find: /^react-native$/, replacement: fromRoot('tests/mocks/react-native.ts') },
      { find: /^expo-secure-store$/, replacement: fromRoot('tests/mocks/expo-secure-store.ts') },
      { find: /^expo-sqlite$/, replacement: fromRoot('tests/mocks/expo-sqlite.ts') },
      {
        find: /^expo-image-manipulator$/,
        replacement: fromRoot('tests/mocks/expo-image-manipulator.ts'),
      },
      {
        find: /^@react-native-async-storage\/async-storage$/,
        replacement: fromRoot('tests/mocks/async-storage.ts'),
      },
    ],
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    setupFiles: ['./tests/setup.ts'],
    clearMocks: true,
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      reportsDirectory: './coverage',
      reporter: ['text-summary', 'html', 'lcov'],
      include: ['src/**/*.ts', 'shared/**/*.ts'],
      exclude: [
        'src/components/**',
        'src/types/**',
        'tests/**',
        '**/*.d.ts',
        'src/config/database.ts',
        'src/lib/mysql.ts',
        'src/lib/databaseTest.ts',
        'src/lib/integrationTest.ts',
        'src/services/**/*MySQL.ts',
      ],
    },
  },
});
