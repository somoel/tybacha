// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: [
      'dist/*',
      'api/**',
      'src/config/database.ts',
      'src/lib/mysql.ts',
      'src/lib/databaseTest.ts',
      'src/lib/integrationTest.ts',
      'src/services/**/*MySQL.ts',
    ],
  },
]);
