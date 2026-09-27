import { apiRequest } from '@/src/api/httpClient';
import type {
    ApiCreateOlderAdultInput,
    ApiOlderAdult,
    ApiPatientsSummary,
    ApiUpdateOlderAdultInput,
} from '@/src/types/apiOlderAdult.types';

export interface FetchOlderAdultsOptions {
    limit?: number;
    order?: 'alfabetico' | 'recientes';
}

export function fetchApiOlderAdults(options: FetchOlderAdultsOptions = {}): Promise<ApiOlderAdult[]> {
    const params: string[] = [];
    if (options.limit !== undefined) {
        params.push(`limit=${options.limit}`);
    }
    if (options.order !== undefined) {
        params.push(`order=${options.order}`);
    }
    const query = params.length > 0 ? `?${params.join('&')}` : '';
    return apiRequest<ApiOlderAdult[]>(`/older-adults${query}`);
}

export function fetchApiPatientsSummary(ids?: number[]): Promise<ApiPatientsSummary> {
    const query = ids && ids.length > 0 ? `?ids=${ids.join(',')}` : '';
    return apiRequest<ApiPatientsSummary>(`/older-adults/summary${query}`);
}

export function fetchApiOlderAdult(idAdultoMayor: number): Promise<ApiOlderAdult> {
    return apiRequest<ApiOlderAdult>(`/older-adults/${idAdultoMayor}`);
}

export function createApiOlderAdult(input: ApiCreateOlderAdultInput): Promise<ApiOlderAdult> {
    return apiRequest<ApiOlderAdult>('/older-adults', {
        method: 'POST',
        body: JSON.stringify(input),
    });
}

export function updateApiOlderAdult(
    idAdultoMayor: number,
    input: ApiUpdateOlderAdultInput,
): Promise<{ ok: true }> {
    return apiRequest<{ ok: true }>(`/older-adults/${idAdultoMayor}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
    });
}

export function uploadPatientPhotoApi(idAdultoMayor: number, formData: FormData): Promise<{ ok: true }> {
    return apiRequest<{ ok: true }>(`/older-adults/${idAdultoMayor}/photo`, {
        method: 'POST',
        body: formData,
    });
}

export function deletePatientPhotoApi(idAdultoMayor: number): Promise<{ ok: true }> {
    return apiRequest<{ ok: true }>(`/older-adults/${idAdultoMayor}/photo`, {
        method: 'DELETE',
    });
}

export function fetchApiOlderAdultsPhotos(): Promise<Record<string, string>> {
  return apiRequest<Record<string, string>>('/older-adults/photos');
}

export function assignCaregiverApi(
  idAdultoMayor: number,
  idCuidador: number,
): Promise<{ ok: true }> {
  return apiRequest<{ ok: true }>(`/older-adults/${idAdultoMayor}/caregiver`, {
    method: 'PATCH',
    body: JSON.stringify({ idCuidador }),
  });
}

export function unassignCaregiverApi(
  idAdultoMayor: number,
): Promise<{ ok: true }> {
  return apiRequest<{ ok: true }>(`/older-adults/${idAdultoMayor}/caregiver`, {
    method: 'DELETE',
  });
}

export function transferOlderAdultApi(
    idAdultoMayor: number,
    correoProfesional: string,
): Promise<{ ok: true }> {
    console.log('[transfer-professional] solicitud API', { idAdultoMayor, correoProfesional });
    return apiRequest<{ ok: true }>(`/older-adults/${idAdultoMayor}/professional`, {
        method: 'PATCH',
        body: JSON.stringify({ correoProfesional }),
    });
}
