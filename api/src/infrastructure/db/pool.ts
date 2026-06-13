import mysql from 'mysql2/promise';
import { env } from '../../config/env.js';

export const pool = mysql.createPool({
  host: env.TIDB_HOST,
  port: env.TIDB_PORT,
  user: env.TIDB_USER,
  password: env.TIDB_PASSWORD,
  database: env.TIDB_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  namedPlaceholders: true,
  ssl: env.TIDB_SSL ? { minVersion: 'TLSv1.2' } : undefined,
  decimalNumbers: true,
  dateStrings: true,
});

export async function pingDatabase(): Promise<void> {
  const connection = await pool.getConnection();
  try {
    await connection.ping();
  } finally {
    connection.release();
  }
}

