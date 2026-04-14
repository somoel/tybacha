import type { MySQLConfig } from '../lib/mysql';

// Database configuration
export const databaseConfig: MySQLConfig = {
  host: process.env.MYSQL_HOST || 'localhost',
  port: parseInt(process.env.MYSQL_PORT || '3306'),
  database: process.env.MYSQL_DATABASE || 'tybacha',
  username: process.env.MYSQL_USERNAME || 'tybacha_user',
  password: process.env.MYSQL_PASSWORD || 'tybacha_password',
  ssl: process.env.MYSQL_SSL === 'true',
};

// Development configuration for testing
export const developmentConfig: MySQLConfig = {
  host: 'localhost',
  port: 3001, // Backend API server port
  database: 'tybacha',
  username: 'root',
  password: '',
  ssl: false,
};

// Production configuration
export const productionConfig: MySQLConfig = {
  host: process.env.MYSQL_HOST || 'localhost',
  port: parseInt(process.env.MYSQL_PORT || '3306'),
  database: process.env.MYSQL_DATABASE || 'tybacha',
  username: process.env.MYSQL_USERNAME || 'tybacha_user',
  password: process.env.MYSQL_PASSWORD || 'tybacha_password',
  ssl: true,
};

// Get configuration based on environment
export function getDatabaseConfig(): MySQLConfig {
  if (__DEV__) {
    return developmentConfig;
  }
  return productionConfig;
}

// Database connection settings
export const connectionSettings = {
  maxRetries: 3,
  retryDelay: 1000,
  timeout: 10000,
  keepAlive: true,
};

// Cache settings
export const cacheSettings = {
  defaultTTL: 5 * 60 * 1000, // 5 minutes
  maxSize: 100, // Maximum number of cached items
  cleanupInterval: 60 * 1000, // 1 minute
};

// Query settings
export const querySettings = {
  defaultLimit: 20,
  maxLimit: 100,
  timeout: 30000, // 30 seconds
};
