import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

/**
 * Opens and initializes the local SQLite database.
 * Creates all offline tables if they don't exist.
 */
export async function initDatabase(): Promise<SQLite.SQLiteDatabase> {
    if (db) return db;

    db = await SQLite.openDatabaseAsync('tybacha.db');

    await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS patients_local (
      id TEXT PRIMARY KEY,
      created_by TEXT NOT NULL,
      first_name TEXT NOT NULL,
      second_name TEXT,
      first_lastname TEXT NOT NULL,
      second_lastname TEXT,
      birth_date TEXT NOT NULL,
      gender TEXT NOT NULL CHECK (gender IN ('male', 'female', 'other')),
      pathologies TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      synced INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS sft_batteries_local (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL,
      performed_by TEXT NOT NULL,
      performed_at TEXT DEFAULT (datetime('now')),
      notes TEXT,
      is_synced INTEGER DEFAULT 0,
      synced INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS sft_results_local (
      id TEXT PRIMARY KEY,
      battery_id TEXT NOT NULL,
      test_type TEXT NOT NULL CHECK (test_type IN (
        'chair_stand', 'arm_curl', 'six_min_walk', 'two_min_step',
        'chair_sit_reach', 'back_scratch', 'up_and_go'
      )),
      value REAL NOT NULL,
      unit TEXT NOT NULL,
      notes TEXT,
      synced INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS exercise_logs_local (
      id TEXT PRIMARY KEY,
      plan_id TEXT NOT NULL,
      exercise_index INTEGER NOT NULL,
      logged_by TEXT NOT NULL,
      logged_at TEXT DEFAULT (datetime('now')),
      completed INTEGER NOT NULL DEFAULT 0,
      value_achieved REAL,
      notes TEXT,
      synced INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS sync_queue (
      id TEXT PRIMARY KEY,
      table_name TEXT NOT NULL,
      operation TEXT NOT NULL,
      payload TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

    return db;
}

/** Returns the current database instance, initializing if needed. */
export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
    if (!db) {
        return initDatabase();
    }
    return db;
}

/**
 * Adds an item to the sync queue for later synchronization.
 * @param tableName - The Supabase table to sync to
 * @param operation - 'INSERT' | 'UPDATE' | 'DELETE'
 * @param payload - The data to sync
 */
export async function addToSyncQueue(
    tableName: string,
    operation: string,
    payload: Record<string, unknown>
): Promise<void> {
    const database = await getDatabase();
    const id = generateUUID();
    await database.runAsync(
        'INSERT INTO sync_queue (id, table_name, operation, payload) VALUES (?, ?, ?, ?)',
        [id, tableName, operation, JSON.stringify(payload)]
    );
}

/**
 * Retrieves all pending items from the sync queue.
 */
export async function getPendingSyncItems(): Promise<SyncQueueItem[]> {
    const database = await getDatabase();
    const rows = await database.getAllAsync<SyncQueueItem>(
        'SELECT * FROM sync_queue ORDER BY created_at ASC'
    );
    return rows;
}

/**
 * Removes a processed item from the sync queue.
 */
export async function removeSyncQueueItem(id: string): Promise<void> {
    const database = await getDatabase();
    await database.runAsync('DELETE FROM sync_queue WHERE id = ?', [id]);
}

export interface SyncQueueItem {
    id: string;
    table_name: string;
    operation: string;
    payload: string;
    created_at: string;
}

/** Simple UUID v4 generator */
function generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

export { generateUUID };
