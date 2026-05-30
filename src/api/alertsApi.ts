import { apiRequest } from '@/src/api/httpClient';
import type { ApiAlert, ApiCreateAlertInput } from '@/src/types/apiAlert.types';

export function fetchApiAlerts(filters?: {
    idAdultoMayor?: number;
    tipoAlerta?: string;
    estado?: string;
    limit?: number;
}): Promise<ApiAlert[]> {
    const params = new URLSearchParams();
    if (filters?.idAdultoMayor) params.set('idAdultoMayor', String(filters.idAdultoMayor));
    if (filters?.tipoAlerta) params.set('tipoAlerta', filters.tipoAlerta);
    if (filters?.estado) params.set('estado', filters.estado);
    if (filters?.limit) params.set('limit', String(filters.limit));

    const qs = params.toString();
    return apiRequest<ApiAlert[]>(`/alerts${qs ? `?${qs}` : ''}`);
}

export function createApiAlert(data: ApiCreateAlertInput): Promise<{ idAlertaProgramada: number }> {
    return apiRequest<{ idAlertaProgramada: number }>('/alerts', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

export function updateApiAlert(id: number, data: Partial<ApiCreateAlertInput>): Promise<{ ok: true }> {
    return apiRequest<{ ok: true }>(`/alerts/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
    });
}

export function deleteApiAlert(id: number): Promise<{ ok: true }> {
    return apiRequest<{ ok: true }>(`/alerts/${id}`, {
        method: 'DELETE',
    });
}

export function updateApiAlertStatus(id: number, estado: string): Promise<{ ok: true }> {
    return apiRequest<{ ok: true }>(`/alerts/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ estado }),
    });
}
