import { syncApiOperations } from '@/src/api/syncApi';
import {
    getPendingOfflineOperations,
    getPendingSyncItems,
    markOfflineOperationResult,
    removeSyncQueueItem,
} from '@/src/lib/sqlite';

export async function syncPendingItems(): Promise<number> {
    let syncedCount = 0;
    const operations = await getPendingOfflineOperations();

    if (operations.length > 0) {
        const response = await syncApiOperations(
            operations.map((operation) => ({
                idLocal: operation.id_local,
                entidad: operation.entidad,
                accion: operation.accion,
                creadoEnLocal: operation.creado_en_local,
                payload: JSON.parse(operation.payload) as Record<string, unknown>,
            })),
        );

        for (const result of response.resultados) {
            await markOfflineOperationResult(
                result.idLocal,
                result.estado,
                result.idRemoto,
                result.detalle,
            );
            if (result.estado === 'aplicada') {
                syncedCount++;
            }
        }
    }

    // Legacy Supabase-era queue: keep draining unsupported entries so old local data
    // does not block the new TiDB synchronization indicator forever.
    const legacyItems = await getPendingSyncItems();
    for (const item of legacyItems) {
        await removeSyncQueueItem(item.id);
    }

    return syncedCount;
}

export async function getPendingCount(): Promise<number> {
    const operations = await getPendingOfflineOperations();
    const legacyItems = await getPendingSyncItems();
    return operations.length + legacyItems.length;
}

