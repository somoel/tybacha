import { apiRequest } from '@/src/api/httpClient';
import type {
    ApiCreateOlderAdultInput,
    ApiOlderAdult,
    ApiUpdateOlderAdultInput,
} from '@/src/types/apiOlderAdult.types';

export function fetchApiOlderAdults(): Promise<ApiOlderAdult[]> {
    return apiRequest<ApiOlderAdult[]>('/older-adults');
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

