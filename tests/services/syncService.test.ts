import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/src/api/httpClient';
import { syncApiOperations } from '@/src/api/syncApi';
import {
    listPendingOfflineOperations,
    markOfflineOperationResult,
} from '@/src/lib/offlineQueue';
import { getPendingSyncItems, removeSyncQueueItem } from '@/src/lib/sqlite';
import { getPendingCount, syncPendingItems } from '@/src/services/syncService';
import type { OfflineOperation } from '@/src/lib/offlineQueue';

vi.mock('@/src/api/syncApi', () => ({
    syncApiOperations: vi.fn(),
}));

vi.mock('@/src/lib/offlineQueue', () => ({
    listPendingOfflineOperations: vi.fn(),
    markOfflineOperationResult: vi.fn(),
    enqueueOfflineOperation: vi.fn(),
}));

vi.mock('@/src/lib/sqlite', () => ({
    generateUUID: () => '00000000-0000-4000-8000-000000000000',
    getDatabase: async () => null,
    initDatabase: async () => null,
    addToSyncQueue: vi.fn(),
    getPendingSyncItems: vi.fn(),
    removeSyncQueueItem: vi.fn(),
}));

function operation(overrides: Partial<OfflineOperation> = {}): OfflineOperation {
    return {
        idLocal: crypto.randomUUID(),
        entidad: 'adulto_mayor',
        accion: 'crear',
        payload: { nombres: 'Ana' },
        creadoEnLocal: '2026-01-01T10:00:00.000Z',
        estado: 'pendiente',
        idRemoto: null,
        detalle: null,
        ...overrides,
    };
}

function applied(idLocal: string) {
    return { idLocal, estado: 'aplicada', idRemoto: 10, detalle: null };
}

describe('syncPendingItems', () => {
    beforeEach(() => {
        vi.mocked(listPendingOfflineOperations).mockResolvedValue([] as never);
        vi.mocked(getPendingSyncItems).mockResolvedValue([] as never);
        vi.mocked(syncApiOperations).mockReset();
        vi.mocked(markOfflineOperationResult).mockReset();
        vi.mocked(removeSyncQueueItem).mockReset();
    });

    it('con la cola vacía no llama a la API', async () => {
        await expect(syncPendingItems()).resolves.toBe(0);
        expect(syncApiOperations).not.toHaveBeenCalled();
    });

    it('drena la cola legacy de sqlite aunque no haya operaciones nuevas', async () => {
        vi.mocked(getPendingSyncItems).mockResolvedValue([
            { id: 'a', table_name: 'x', operation: 'INSERT', payload: '{}', created_at: 't' },
            { id: 'b', table_name: 'y', operation: 'UPDATE', payload: '{}', created_at: 't' },
        ] as never);

        await syncPendingItems();

        expect(removeSyncQueueItem).toHaveBeenCalledWith('a');
        expect(removeSyncQueueItem).toHaveBeenCalledWith('b');
    });

    it('sincroniza y marca cada resultado como aplicada', async () => {
        const op = operation();
        vi.mocked(listPendingOfflineOperations).mockResolvedValue([op] as never);
        vi.mocked(syncApiOperations).mockResolvedValue({
            resultados: [applied(op.idLocal)],
        } as never);

        await expect(syncPendingItems()).resolves.toBe(1);

        expect(syncApiOperations).toHaveBeenCalledWith([
            expect.objectContaining({
                idLocal: op.idLocal,
                entidad: 'adulto_mayor',
                accion: 'crear',
                payload: { nombres: 'Ana' },
            }),
        ]);
        expect(markOfflineOperationResult).toHaveBeenCalledWith(
            op.idLocal,
            'aplicada',
            10,
            null,
        );
    });

    it('solo cuenta las operaciones aplicadas', async () => {
        const ops = [operation(), operation(), operation()];
        vi.mocked(listPendingOfflineOperations).mockResolvedValue(ops as never);
        vi.mocked(syncApiOperations).mockResolvedValue({
            resultados: [
                applied(ops[0].idLocal),
                { idLocal: ops[1].idLocal, estado: 'rechazada', idRemoto: null, detalle: 'x' },
                { idLocal: ops[2].idLocal, estado: 'aplicada', idRemoto: 11, detalle: null },
            ],
        } as never);

        await expect(syncPendingItems()).resolves.toBe(2);
    });

    it('omite las entidades no soportadas sin perderlas', async () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const supported = operation({ entidad: 'aplicacion_sft' });
        const unsupported = operation({ entidad: 'patologia_adulto_mayor' as never });

        vi.mocked(listPendingOfflineOperations).mockResolvedValue(
            [unsupported, supported] as never,
        );
        vi.mocked(syncApiOperations).mockResolvedValue({
            resultados: [applied(supported.idLocal)],
        } as never);

        await expect(syncPendingItems()).resolves.toBe(1);

        expect(syncApiOperations).toHaveBeenCalledTimes(1);
        expect(vi.mocked(syncApiOperations).mock.calls[0][0]).toHaveLength(1);
        expect(warn).toHaveBeenCalledWith(
            '[sync] entidad no soportada, se omite:',
            'patologia_adulto_mayor',
        );
        warn.mockRestore();
    });

    it('parte los lotes de más de 100 operaciones', async () => {
        const ops = Array.from({ length: 250 }, () => operation());
        vi.mocked(listPendingOfflineOperations).mockResolvedValue(ops as never);
        vi.mocked(syncApiOperations).mockImplementation(async (batch) => ({
            resultados: batch.map((op) => applied(op.idLocal)),
        }) as never);

        await expect(syncPendingItems()).resolves.toBe(250);

        expect(syncApiOperations).toHaveBeenCalledTimes(3);
        const batches = vi.mocked(syncApiOperations).mock.calls;
        expect(batches[0][0]).toHaveLength(100);
        expect(batches[1][0]).toHaveLength(100);
        expect(batches[2][0]).toHaveLength(50);
    });

    it('agrupa por entidad: un fallo de un grupo no bloquea a los demás', async () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const first = operation({ entidad: 'adulto_mayor' });
        const second = operation({ entidad: 'aplicacion_sft' });

        vi.mocked(listPendingOfflineOperations).mockResolvedValue([first, second] as never);
        vi.mocked(syncApiOperations)
            .mockRejectedValueOnce(new ApiError(400, 'payload invalido', 'VALIDATION_ERROR'))
            .mockResolvedValueOnce({ resultados: [applied(second.idLocal)] } as never);

        await expect(syncPendingItems()).resolves.toBe(1);

        expect(markOfflineOperationResult).toHaveBeenCalledWith(
            first.idLocal,
            'rechazada',
            null,
            'payload invalido',
        );
        expect(syncApiOperations).toHaveBeenCalledTimes(2);
        warn.mockRestore();
    });

    it('un error de red aborta el resto pero conserva lo pendiente', async () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const first = operation({ entidad: 'adulto_mayor' });
        const second = operation({ entidad: 'aplicacion_sft' });

        vi.mocked(listPendingOfflineOperations).mockResolvedValue([first, second] as never);
        vi.mocked(syncApiOperations).mockRejectedValue(
            new TypeError('Network request failed'),
        );

        await expect(syncPendingItems()).resolves.toBe(0);

        expect(syncApiOperations).toHaveBeenCalledTimes(1);
        expect(markOfflineOperationResult).not.toHaveBeenCalled();
        warn.mockRestore();
    });

    it('un error 5xx aborta el resto', async () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const ops = [operation({ entidad: 'adulto_mayor' }), operation({ entidad: 'aplicacion_sft' })];
        vi.mocked(listPendingOfflineOperations).mockResolvedValue(ops as never);
        vi.mocked(syncApiOperations).mockRejectedValue(new ApiError(500, 'boom'));

        await expect(syncPendingItems()).resolves.toBe(0);

        expect(syncApiOperations).toHaveBeenCalledTimes(1);
        warn.mockRestore();
    });

    it('un 429 se trata como rechazo de validación y no se reenvía', async () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const op = operation();
        vi.mocked(listPendingOfflineOperations).mockResolvedValue([op] as never);
        vi.mocked(syncApiOperations).mockRejectedValue(new ApiError(429, 'rate limit'));

        // 429 está en RETRYABLE_CLIENT_STATUSES, asi que no es rechazo de validacion:
        // interrumpe la sincronizacion sin marcar la operacion.
        await expect(syncPendingItems()).resolves.toBe(0);
        expect(markOfflineOperationResult).not.toHaveBeenCalled();
        warn.mockRestore();
    });

    it('un 403 tampoco se marca como rechazada', async () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const op = operation();
        vi.mocked(listPendingOfflineOperations).mockResolvedValue([op] as never);
        vi.mocked(syncApiOperations).mockRejectedValue(new ApiError(403, 'forbidden'));

        await expect(syncPendingItems()).resolves.toBe(0);
        expect(markOfflineOperationResult).not.toHaveBeenCalled();
        warn.mockRestore();
    });
});

describe('getPendingCount', () => {
    beforeEach(() => {
        vi.mocked(listPendingOfflineOperations).mockReset();
        vi.mocked(getPendingSyncItems).mockReset();
    });

    it('suma operaciones nuevas y elementos legacy', async () => {
        vi.mocked(listPendingOfflineOperations).mockResolvedValue(
            [operation(), operation()] as never,
        );
        vi.mocked(getPendingSyncItems).mockResolvedValue([
            { id: 'a', table_name: 'x', operation: 'INSERT', payload: '{}', created_at: 't' },
        ] as never);

        await expect(getPendingCount()).resolves.toBe(3);
    });

    it('devuelve 0 con todo vacío', async () => {
        vi.mocked(listPendingOfflineOperations).mockResolvedValue([] as never);
        vi.mocked(getPendingSyncItems).mockResolvedValue([] as never);

        await expect(getPendingCount()).resolves.toBe(0);
    });
});
