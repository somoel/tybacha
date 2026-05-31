import { apiRequest } from '@/src/api/httpClient';
import type {
  ApiCreateMedicalNoteInput,
  ApiCreateMedicationInput,
  ApiCreatePathologyInput,
  ApiMedicalNote,
  ApiMedication,
  ApiPathology,
  ApiUpdateMedicalNoteInput,
  ApiUpdateMedicationInput,
  ApiUpdatePathologyInput,
} from '@/src/types/apiMedicalHistory.types';

export function fetchApiPathologies(olderAdultId: number): Promise<ApiPathology[]> {
  return apiRequest<ApiPathology[]>(`/older-adults/${olderAdultId}/pathologies`);
}

export function createApiPathology(olderAdultId: number, data: ApiCreatePathologyInput): Promise<ApiPathology> {
  return apiRequest<ApiPathology>(`/older-adults/${olderAdultId}/pathologies`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateApiPathology(
  olderAdultId: number,
  pathologyId: number,
  data: ApiUpdatePathologyInput,
): Promise<{ ok: true }> {
  return apiRequest<{ ok: true }>(`/older-adults/${olderAdultId}/pathologies/${pathologyId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function deleteApiPathology(olderAdultId: number, pathologyId: number): Promise<{ ok: true }> {
  return apiRequest<{ ok: true }>(`/older-adults/${olderAdultId}/pathologies/${pathologyId}`, {
    method: 'DELETE',
  });
}

export function fetchApiMedications(olderAdultId: number): Promise<ApiMedication[]> {
  return apiRequest<ApiMedication[]>(`/older-adults/${olderAdultId}/medications`);
}

export function createApiMedication(olderAdultId: number, data: ApiCreateMedicationInput): Promise<ApiMedication> {
  return apiRequest<ApiMedication>(`/older-adults/${olderAdultId}/medications`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateApiMedication(
  olderAdultId: number,
  medicationId: number,
  data: ApiUpdateMedicationInput,
): Promise<{ ok: true }> {
  return apiRequest<{ ok: true }>(`/older-adults/${olderAdultId}/medications/${medicationId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function deleteApiMedication(olderAdultId: number, medicationId: number): Promise<{ ok: true }> {
  return apiRequest<{ ok: true }>(`/older-adults/${olderAdultId}/medications/${medicationId}`, {
    method: 'DELETE',
  });
}

export function fetchApiMedicalNotes(olderAdultId: number): Promise<ApiMedicalNote[]> {
  return apiRequest<ApiMedicalNote[]>(`/older-adults/${olderAdultId}/medical-notes`);
}

export function createApiMedicalNote(
  olderAdultId: number,
  data: ApiCreateMedicalNoteInput,
): Promise<ApiMedicalNote> {
  return apiRequest<ApiMedicalNote>(`/older-adults/${olderAdultId}/medical-notes`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateApiMedicalNote(
  olderAdultId: number,
  noteId: number,
  data: ApiUpdateMedicalNoteInput,
): Promise<{ ok: true }> {
  return apiRequest<{ ok: true }>(`/older-adults/${olderAdultId}/medical-notes/${noteId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function deleteApiMedicalNote(olderAdultId: number, noteId: number): Promise<{ ok: true }> {
  return apiRequest<{ ok: true }>(`/older-adults/${olderAdultId}/medical-notes/${noteId}`, {
    method: 'DELETE',
  });
}
