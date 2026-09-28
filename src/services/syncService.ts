import { ApiError, isNetworkError } from '@/src/api/httpClient';
import { syncApiOperations } from '@/src/api/syncApi';
import type { ApiSyncOperation } from '@/src/api/syncApi';
import type { OfflineEntity, OfflineOperation } from '@/src/lib/offlineQueue';
import { listPendingOfflineOperations, markOfflineOperationResult } from '@/src/lib/offlineQueue';
import { getPendingSyncItems, removeSyncQueueItem } from '@/src/lib/sqlite';

/**
 * Entidades que acepta POST /sync/operations. Debe reflejar el enum `entidad`
 * de `api/src/interfaces/http/modules/sync/routes.ts`; el resto de entidades
 * se omiten (sin perderlas) para que no rompan el lote completo.
 */
const SYNC_SUPPORTED_ENTITIES: ReadonlySet<OfflineEntity> = new Set<OfflineEntity>([
    'adulto_mayor',
    'registro_ejercicio_plan',
    'aplicacion_sft',
]);

/** El API rechaza lotes de mas de 100 operaciones (z.array(...).max(100)). */
const MAX_OPERATIONS_PER_REQUEST = 100;

/** 4xx transitorios (auth o rate limit): se reintentan, nunca se rechazan. */
const RETRYABLE_CLIENT_STATUSES: ReadonlySet<number> = new Set([401, 403, 408, 429]);

function isValidationRejection(error: unknown): error is ApiError {
    return (
        error instanceof ApiError &&
        error.status >= 400 &&
        error.status < 500 &&
        !RETRYABLE_CLIENT_STATUSES.has(error.status)
    );
}

function toApiOperation(operation: OfflineOperation): ApiSyncOperation {
    return {
        idLocal: operation.idLocal,
        entidad: operation.entidad,
        accion: operation.accion,
        creadoEnLocal: operation.creadoEnLocal,
        payload: operation.payload,
    };
}

function groupByEntity(operations: OfflineOperation[]): Map<OfflineEntity, OfflineOperation[]> {
    const groups = new Map<OfflineEntity, OfflineOperation[]>();
    for (const operation of operations) {
        const existing = groups.get(operation.entidad);
        if (existing) {
            existing.push(operation);
        } else {
            groups.set(operation.entidad, [operation]);
        }
    }
    return groups;
}

/**
 * Sincroniza la cola offline agrupando por entidad: un fallo en un grupo no
 * bloquea a los demás. Devuelve el numero de operaciones aplicadas.
 */
export async function syncPendingItems(): Promise<number> {
    let syncedCount = 0;
    let aborted = false;

    const groups = groupByEntity(await listPendingOfflineOperations());

    for (const [entidad, group] of groups) {
        if (aborted) break;

        if (!SYNC_SUPPORTED_ENTITIES.has(entidad)) {
            console.warn('[sync] entidad no soportada, se omite:', entidad);
            continue;
        }

        for (let i = 0; i < group.length; i += MAX_OPERATIONS_PER_REQUEST) {
            const batch = group.slice(i, i + MAX_OPERATIONS_PER_REQUEST);

            try {
                const response = await syncApiOperations(batch.map(toApiOperation));
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
            } catch (error) {
                if (isValidationRejection(error)) {
                    console.warn('[sync] lote rechazado por validacion:', error.message);
                    for (const operation of batch) {
                        await markOfflineOperationResult(
                            operation.idLocal,
                            'rechazada',
                            null,
                            error.message,
                        );
                    }
                    continue;
                }

                // Sin red (isNetworkError), 5xx o error inesperado: se abortan los
                // grupos restantes y todo queda pendiente para el proximo intento.
                if (isNetworkError(error)) {
                    console.warn('[sync] sin conexion, se reintentara en el proximo ciclo.');
                } else {
                    console.warn('[sync] sincronizacion interrumpida, se reintentara:', error);
                }
                aborted = true;
                break;
            }
        }
    }

    // Drain legacy sync_queue entries so old local data
    // does not block the TiDB synchronization indicator forever.
    const legacyItems = await getPendingSyncItems();
    for (const item of legacyItems) {
        await removeSyncQueueItem(item.id);
    }

    return syncedCount;
}

export async function getPendingCount(): Promise<number> {
    const operations = await listPendingOfflineOperations();
    const legacyItems = await getPendingSyncItems();
    return operations.length + legacyItems.length;
}
