import { getDatabase, getPendingSyncItems, removeSyncQueueItem } from '@/src/lib/sqlite';
import { supabase } from '@/src/lib/supabase';

/**
 * Synchronize all pending offline items to Supabase.
 * Processes the sync queue in order, upserting/deleting as needed.
 * @returns The number of items successfully synced
 */
export async function syncPendingItems(): Promise<number> {
    let syncedCount = 0;

    try {
        const items = await getPendingSyncItems();

        if (items.length === 0) return 0;

        for (const item of items) {
            try {
                const payload = JSON.parse(item.payload) as Record<string, unknown>;

                switch (item.operation) {
                    case 'INSERT': {
                        const { error } = await supabase
                            .from(item.table_name)
                            .upsert(payload);

                        if (error) {
                            console.error(`Error sincronizando INSERT en ${item.table_name}:`, error);
                            continue;
                        }
                        break;
                    }
                    case 'UPDATE': {
                        const id = payload.id as string;
                        const updateData = { ...payload };
                        delete updateData.id;

                        const { error } = await supabase
                            .from(item.table_name)
                            .update(updateData)
                            .eq('id', id);

                        if (error) {
                            console.error(`Error sincronizando UPDATE en ${item.table_name}:`, error);
                            continue;
                        }
                        break;
                    }
                    case 'DELETE': {
                        const { error } = await supabase
                            .from(item.table_name)
                            .delete()
                            .eq('id', payload.id as string);

                        if (error) {
                            console.error(`Error sincronizando DELETE en ${item.table_name}:`, error);
                            continue;
                        }
                        break;
                    }
                    default:
                        console.warn(`Operación no soportada: ${item.operation}`);
                        continue;
                }

                // Mark as synced in local table
                await markLocalItemSynced(item.table_name, payload.id as string);
                // Remove from sync queue
                await removeSyncQueueItem(item.id);
                syncedCount++;
            } catch (error) {
                console.error(`Error procesando item de sincronización ${item.id}:`, error);
            }
        }

        return syncedCount;
    } catch (error) {
        console.error('Error en sincronización:', error);
        throw new Error('Error al sincronizar datos con el servidor.');
    }
}

/**
 * Mark a local SQLite record as synced.
 */
async function markLocalItemSynced(tableName: string, id: string): Promise<void> {
    const localTableName = `${tableName}_local`;
    try {
        const db = await getDatabase();
        await db.runAsync(
            `UPDATE ${localTableName} SET synced = 1 WHERE id = ?`,
            [id]
        );
    } catch {
        // Table might not have a local equivalent - that's ok
    }
}

/**
 * Get the count of pending sync items.
 */
export async function getPendingCount(): Promise<number> {
    try {
        const items = await getPendingSyncItems();
        return items.length;
    } catch {
        return 0;
    }
}
