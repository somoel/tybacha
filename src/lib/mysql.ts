import AsyncStorage from '@react-native-async-storage/async-storage';

// MySQL Database Configuration
export interface MySQLConfig {
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  database?: string;
  charset?: string;
  ssl?: {
    rejectUnauthorized?: boolean;
  };
}

// Default configuration - should be moved to environment variables
const defaultConfig: MySQLConfig = {
  host: 'localhost',
  port: 3001, // Backend API server port
  database: 'tybacha',
  user: 'tybacha_user',
  password: 'tybacha_password',
  ssl: {
    rejectUnauthorized: false
  },
};

// Cache configuration
const CACHE_PREFIX = 'mysql_cache_';
const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes

interface CachedData<T> {
  data: T;
  timestamp: number;
  expiry: number;
}

/**
 * MySQL Database Service for React Native
 * Uses HTTP API calls to interact with MySQL database
 */
export class MySQLService {
  private config: MySQLConfig;
  private baseUrl: string;
  private isConnected: boolean = false;

  constructor(config?: Partial<MySQLConfig>) {
    this.config = { ...defaultConfig, ...config };
    // This should point to your backend API that handles MySQL operations
    // Always use HTTP for localhost backend, SSL is for database connection only
    this.baseUrl = `http://${this.config.host}:${this.config.port}/api`;
  }

  /**
   * Test database connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.fetch('/test', { method: 'GET' });
      this.isConnected = response.ok;
      return response.ok;
    } catch (error) {
      console.error('Database connection test failed:', error);
      this.isConnected = false;
      return false;
    }
  }

  /**
   * Execute a MySQL query through the API
   */
  async query<T = any>(sql: string, params?: any[]): Promise<T[]> {
    const cacheKey = this.getCacheKey(sql, params);
    
    // Try to get from cache first for SELECT queries
    if (sql.trim().toUpperCase().startsWith('SELECT')) {
      const cached = await this.getCachedData<T[]>(cacheKey);
      if (cached) return cached;
    }

    try {
      const response = await this.fetch('/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sql,
          params: params || [],
        }),
      });

      if (!response.ok) {
        throw new Error(`Query failed: ${response.statusText}`);
      }

      const result = await response.json();
      
      // Cache SELECT query results
      if (sql.trim().toUpperCase().startsWith('SELECT')) {
        await this.setCachedData(cacheKey, result);
      }

      return result;
    } catch (error) {
      console.error('Query execution failed:', error);
      throw error;
    }
  }

  /**
   * Execute a prepared statement
   */
  async execute<T = any>(sql: string, params?: any[]): Promise<{ insertId?: number; affectedRows: number; data?: T[] }> {
    try {
      const response = await this.fetch('/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sql,
          params: params || [],
        }),
      });

      if (!response.ok) {
        throw new Error(`Execute failed: ${response.statusText}`);
      }

      const result = await response.json();
      
      // Clear relevant cache on INSERT/UPDATE/DELETE
      if (!sql.trim().toUpperCase().startsWith('SELECT')) {
        await this.clearCache();
      }

      return result;
    } catch (error) {
      console.error('Execute failed:', error);
      throw error;
    }
  }

  /**
   * Begin a transaction
   */
  async beginTransaction(): Promise<string> {
    try {
      const response = await this.fetch('/transaction/begin', { method: 'POST' });
      if (!response.ok) throw new Error('Failed to begin transaction');
      const result = await response.json();
      return result.transactionId;
    } catch (error) {
      console.error('Begin transaction failed:', error);
      throw error;
    }
  }

  /**
   * Commit a transaction
   */
  async commitTransaction(transactionId: string): Promise<void> {
    try {
      const response = await this.fetch('/transaction/commit', {
        method: 'POST',
        body: JSON.stringify({ transactionId }),
      });
      if (!response.ok) throw new Error('Failed to commit transaction');
      await this.clearCache();
    } catch (error) {
      console.error('Commit transaction failed:', error);
      throw error;
    }
  }

  /**
   * Rollback a transaction
   */
  async rollbackTransaction(transactionId: string): Promise<void> {
    try {
      const response = await this.fetch('/transaction/rollback', {
        method: 'POST',
        body: JSON.stringify({ transactionId }),
      });
      if (!response.ok) throw new Error('Failed to rollback transaction');
    } catch (error) {
      console.error('Rollback transaction failed:', error);
      throw error;
    }
  }

  /**
   * Check if online and connected to database
   */
  async isOnline(): Promise<boolean> {
    try {
      // Web-compatible online check
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        return false;
      }
      
      // Test connectivity with a simple request
      try {
        const response = await fetch(`${this.baseUrl}/health`, {
          method: 'GET',
          signal: AbortSignal.timeout(3000),
        });
        return response.ok && this.isConnected;
      } catch {
        return false;
      }
    } catch (error) {
      return false;
    }
  }

  /**
   * Generic fetch method with error handling
   */
  async fetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const url = `${this.baseUrl}${endpoint}`;
    
    console.log('MySQL Service - Fetching:', url);
    console.log('MySQL Service - Options:', options);
    
    const defaultHeaders = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...defaultHeaders,
          ...options.headers,
        },
      });

      console.log('MySQL Service - Response status:', response.status);
      console.log('MySQL Service - Response ok:', response.ok);

      return response;
    } catch (error) {
      console.error('MySQL Service - Fetch error:', error);
      console.error('MySQL Service - URL:', url);
      throw error;
    }
  }

  /**
   * Generate cache key for query
   */
  private getCacheKey(sql: string, params?: any[]): string {
    const key = `${sql}_${JSON.stringify(params || [])}`;
    return `${CACHE_PREFIX}${btoa(key).replace(/[^a-zA-Z0-9]/g, '')}`;
  }

  /**
   * Get cached data
   */
  private async getCachedData<T>(key: string): Promise<T | null> {
    try {
      const cached = await AsyncStorage.getItem(key);
      if (!cached) return null;

      const data: CachedData<T> = JSON.parse(cached);
      
      // Check if cache is expired
      if (Date.now() > data.expiry) {
        await AsyncStorage.removeItem(key);
        return null;
      }

      return data.data;
    } catch (error) {
      console.error('Cache retrieval failed:', error);
      return null;
    }
  }

  /**
   * Set cached data
   */
  private async setCachedData<T>(key: string, data: T): Promise<void> {
    try {
      const cachedData: CachedData<T> = {
        data,
        timestamp: Date.now(),
        expiry: Date.now() + CACHE_EXPIRY,
      };
      
      await AsyncStorage.setItem(key, JSON.stringify(cachedData));
    } catch (error) {
      console.error('Cache storage failed:', error);
    }
  }

  /**
   * Clear all cache
   */
  private async clearCache(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(CACHE_PREFIX));
      await AsyncStorage.multiRemove(cacheKeys);
    } catch (error) {
      console.error('Cache clear failed:', error);
    }
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<MySQLConfig>): void {
    this.config = { ...this.config, ...config };
    this.baseUrl = this.config.ssl 
      ? `https://${this.config.host}:${this.config.port}/api` 
      : `http://${this.config.host}:${this.config.port}/api`;
  }
}

// Singleton instance
let mysqlInstance: MySQLService | null = null;

/**
 * Get MySQL service instance
 */
export function getMySQLService(config?: Partial<MySQLConfig>): MySQLService {
  if (!mysqlInstance) {
    mysqlInstance = new MySQLService(config);
  }
  return mysqlInstance;
}

/**
 * Initialize MySQL service
 */
export async function initMySQLService(config?: Partial<MySQLConfig>): Promise<MySQLService> {
  const service = getMySQLService(config);
  const connected = await service.testConnection();
  
  if (!connected) {
    console.warn('MySQL service initialization: Connection test failed');
  }
  
  return service;
}

// Export types for use in other services
export type { MySQLConfig };
