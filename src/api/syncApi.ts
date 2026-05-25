import { apiRequest } from '@/src/api/httpClient';

export interface ApiSyncOperation {
    idLocal: string;
    entidad: 'adulto_mayor' | 'registro_ejercicio_plan';
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

