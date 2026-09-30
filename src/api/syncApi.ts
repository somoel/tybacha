import { apiRequest } from '@/src/api/httpClient';
import type { OfflineEntity } from '@/src/lib/offlineQueue';

export interface ApiSyncOperation {
    idLocal: string;
    entidad: OfflineEntity;
    accion: 'crear' | 'actualizar';
    creadoEnLocal: string;
    payload: Record<string, unknown>;
}

export interface ApiSyncResult {
    idLocal: string;
    estado: 'aplicada' | 'conflicto' | 'rechazada';
    idRemoto: number | null;
    detalle: unknown;
}

export function syncApiOperations(operaciones: ApiSyncOperation[]): Promise<{ resultados: ApiSyncResult[] }> {
    return apiRequest<{ resultados: ApiSyncResult[] }>('/sync/operations', {
        method: 'POST',
        body: JSON.stringify({ operaciones }),
    });
}

