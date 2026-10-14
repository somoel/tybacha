/**
 * Doble en memoria para `expo-sqlite`.
 * Implementa un subconjunto minimo de la API usada por `src/lib/sqlite.ts`
 * y `src/lib/offlineQueue.ts` para poder ejercitar la ruta nativa de la
 * cola offline sin un dispositivo.
 */
type Row = Record<string, unknown>;

const offlineQueue = new Map<string, Row>();
const syncQueue = new Map<string, Row>();

interface RunResult {
    lastInsertRowid: number;
    changes: number;
}

const OK: RunResult = { lastInsertRowid: 0, changes: 1 };

function like(sql: string, pattern: RegExp): boolean {
    return pattern.test(sql.replace(/\s+/g, ' '));
}

const fakeDb = {
    async execAsync(_sql: string): Promise<void> {
        // DDL / PRAGMAs: no-op en el doble.
    },

    async runAsync(sql: string, params: unknown[] = []): Promise<RunResult> {
        const flat = sql.replace(/\s+/g, ' ');

        if (like(flat, /INSERT OR REPLACE INTO offline_operation_queue/i)) {
            const [idLocal, entidad, accion, payload, creadoEnLocal] = params as [
                string,
                string,
                string,
                string,
                string,
            ];
            offlineQueue.set(idLocal, {
                id_local: idLocal,
                entidad,
                accion,
                payload,
                creado_en_local: creadoEnLocal,
                estado: 'pendiente',
                id_remoto: null,
                detalle: null,
            });
            return OK;
        }

        if (like(flat, /UPDATE offline_operation_queue/i)) {
            const [estado, idRemoto, detalle, idLocal] = params as [
                string,
                number | null,
                string | null,
                string,
            ];
            const row = offlineQueue.get(idLocal);
            if (row) {
                row.estado = estado;
                row.id_remoto = idRemoto;
                row.detalle = detalle;
            }
            return OK;
        }

        if (like(flat, /INSERT INTO sync_queue/i)) {
            const [id, tableName, operation, payload] = params as [
                string,
                string,
                string,
                string,
            ];
            syncQueue.set(id, {
                id,
                table_name: tableName,
                operation,
                payload,
                created_at: new Date().toISOString(),
            });
            return OK;
        }

        if (like(flat, /DELETE FROM sync_queue WHERE id/i)) {
            syncQueue.delete(String(params[0]));
            return OK;
        }

        return { lastInsertRowid: 0, changes: 0 };
    },

    async getAllAsync<T>(sql: string, _params: unknown[] = []): Promise<T[]> {
        const flat = sql.replace(/\s+/g, ' ');

        if (like(flat, /FROM offline_operation_queue/i)) {
            return [...offlineQueue.values()]
                .filter((row) => row.estado === 'pendiente')
                .sort((a, b) =>
                    String(a.creado_en_local).localeCompare(String(b.creado_en_local)),
                ) as T[];
        }

        if (like(flat, /FROM sync_queue/i)) {
            return [...syncQueue.values()].sort((a, b) =>
                String(a.created_at).localeCompare(String(b.created_at)),
            ) as T[];
        }

        return [];
    },

    async closeAsync(): Promise<void> {},
};

export type SQLiteDatabase = typeof fakeDb;

export async function openDatabaseAsync(_name?: string): Promise<SQLiteDatabase> {
    return fakeDb;
}

export async function deleteDatabaseAsync(_name?: string): Promise<void> {}

/** Solo para tests: vacia las tablas del doble. */
export function __resetSqlite(): void {
    offlineQueue.clear();
    syncQueue.clear();
}

/** Solo para tests: inspeccion de la cola offline. */
export function __dumpOfflineQueue(): Row[] {
    return [...offlineQueue.values()].map((row) => ({ ...row }));
}

/** Solo para tests: inspeccion de la cola legacy. */
export function __dumpSyncQueue(): Row[] {
    return [...syncQueue.values()].map((row) => ({ ...row }));
}
