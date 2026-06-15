import { apiRequest } from '@/src/api/httpClient';
import type { ApiCaregiverDetail, ApiCaregiverPatient, ApiCaregiverSummary } from '@/src/types/apiCaregiver.types';

export function fetchApiCaregivers(search?: string): Promise<ApiCaregiverSummary[]> {
    const params = new URLSearchParams();
    if (search && search.length >= 2) params.set('search', search);
    const qs = params.toString();
    return apiRequest<ApiCaregiverSummary[]>(`/caregivers${qs ? `?${qs}` : ''}`);
}

export function fetchApiCaregiver(id: number): Promise<ApiCaregiverDetail> {
    return apiRequest<ApiCaregiverDetail>(`/caregivers/${id}`);
}

export function fetchApiCaregiverPatients(id: number): Promise<ApiCaregiverPatient[]> {
    return apiRequest<ApiCaregiverPatient[]>(`/caregivers/${id}/patients`);
}
