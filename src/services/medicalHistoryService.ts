import {
  createApiMedicalNote,
  createApiMedication,
  createApiPathology,
  deleteApiMedicalNote,
  deleteApiMedication,
  deleteApiPathology,
  fetchApiMedicalNotes,
  fetchApiMedications,
  fetchApiPathologies,
  updateApiMedicalNote,
  updateApiMedication,
  updateApiPathology,
} from '@/src/api/medicalHistoryApi';
import { addOfflineOperation } from '@/src/lib/sqlite';
import type {
  ApiCreateMedicalNoteInput,
  ApiCreateMedicationInput,
  ApiCreatePathologyInput,
  ApiMedicalNote,
  ApiMedication,
  ApiPathology,
} from '@/src/types/apiMedicalHistory.types';
import type {
  MedicalNote,
  MedicalNoteFormData,
  Medication,
  MedicationFormData,
  Pathology,
  PathologyFormData,
} from '@/src/types/medicalHistory.types';

function mapPathologyFromApi(api: ApiPathology): Pathology {
  return {
    id: String(api.idPatologiaAdultoMayor),
    olderAdultId: String(api.idAdultoMayor),
    nombre: api.nombre,
    descripcion: api.descripcion ?? undefined,
    fechaDiagnostico: api.fechaDiagnostico ?? undefined,
    estado: api.estado,
    registradoPor: api.registradoPor ? String(api.registradoPor) : undefined,
    creadoEn: api.creadoEn,
    actualizadoEn: api.actualizadoEn,
  };
}

function mapMedicationFromApi(api: ApiMedication): Medication {
  return {
    id: String(api.idMedicamentoAdultoMayor),
    olderAdultId: String(api.idAdultoMayor),
    nombre: api.nombre,
    dosis: api.dosis ?? undefined,
    frecuencia: api.frecuencia ?? undefined,
    viaAdministracion: api.viaAdministracion ?? undefined,
    fechaInicio: api.fechaInicio ?? undefined,
    fechaFin: api.fechaFin ?? undefined,
    estado: api.estado,
    observaciones: api.observaciones ?? undefined,
    registradoPor: api.registradoPor ? String(api.registradoPor) : undefined,
    creadoEn: api.creadoEn,
    actualizadoEn: api.actualizadoEn,
  };
}

function mapMedicalNoteFromApi(api: ApiMedicalNote): MedicalNote {
  return {
    id: String(api.idNotaHistorialMedico),
    olderAdultId: String(api.idAdultoMayor),
    tipoNota: api.tipoNota,
    contenido: api.contenido,
    registradoPor: api.registradoPor ? String(api.registradoPor) : undefined,
    creadoEn: api.creadoEn,
  };
}

// ── Pathologies ───────────────────────────────────────────────────────────

export async function fetchPathologies(olderAdultId: number): Promise<Pathology[]> {
  const data = await fetchApiPathologies(olderAdultId);
  return data.map(mapPathologyFromApi);
}

export async function createPathology(
  olderAdultId: number,
  formData: PathologyFormData,
  isOnline = true,
): Promise<Pathology> {
  if (!isOnline) {
    const idLocal = await addOfflineOperation('patologia_adulto_mayor', 'crear', {
      ...formData,
      idAdultoMayor: olderAdultId,
    });
    return {
      id: idLocal,
      olderAdultId: String(olderAdultId),
      ...formData,
      creadoEn: new Date().toISOString(),
      actualizadoEn: new Date().toISOString(),
    };
  }

  const payload: ApiCreatePathologyInput = {
    nombre: formData.nombre,
    descripcion: formData.descripcion,
    fechaDiagnostico: formData.fechaDiagnostico,
    estado: formData.estado,
  };

  const api = await createApiPathology(olderAdultId, payload);
  return mapPathologyFromApi(api);
}

export async function updatePathology(
  olderAdultId: number,
  pathologyId: number,
  formData: Partial<PathologyFormData>,
): Promise<void> {
  await updateApiPathology(olderAdultId, pathologyId, formData);
}

export async function deletePathology(olderAdultId: number, pathologyId: number): Promise<void> {
  await deleteApiPathology(olderAdultId, pathologyId);
}

// ── Medications ───────────────────────────────────────────────────────────

export async function fetchMedications(olderAdultId: number): Promise<Medication[]> {
  const data = await fetchApiMedications(olderAdultId);
  return data.map(mapMedicationFromApi);
}

export async function createMedication(
  olderAdultId: number,
  formData: MedicationFormData,
  isOnline = true,
): Promise<Medication> {
  if (!isOnline) {
    const idLocal = await addOfflineOperation('medicamento_adulto_mayor', 'crear', {
      ...formData,
      idAdultoMayor: olderAdultId,
    });
    return {
      id: idLocal,
      olderAdultId: String(olderAdultId),
      ...formData,
      creadoEn: new Date().toISOString(),
      actualizadoEn: new Date().toISOString(),
    };
  }

  const payload: ApiCreateMedicationInput = {
    nombre: formData.nombre,
    dosis: formData.dosis,
    frecuencia: formData.frecuencia,
    viaAdministracion: formData.viaAdministracion,
    fechaInicio: formData.fechaInicio,
    fechaFin: formData.fechaFin,
    estado: formData.estado,
    observaciones: formData.observaciones,
  };

  const api = await createApiMedication(olderAdultId, payload);
  return mapMedicationFromApi(api);
}

export async function updateMedication(
  olderAdultId: number,
  medicationId: number,
  formData: Partial<MedicationFormData>,
): Promise<void> {
  await updateApiMedication(olderAdultId, medicationId, formData);
}

export async function deleteMedication(olderAdultId: number, medicationId: number): Promise<void> {
  await deleteApiMedication(olderAdultId, medicationId);
}

// ── Medical Notes ─────────────────────────────────────────────────────────

export async function fetchMedicalNotes(olderAdultId: number): Promise<MedicalNote[]> {
  const data = await fetchApiMedicalNotes(olderAdultId);
  return data.map(mapMedicalNoteFromApi);
}

export async function createMedicalNote(
  olderAdultId: number,
  formData: MedicalNoteFormData,
  isOnline = true,
): Promise<MedicalNote> {
  if (!isOnline) {
    const idLocal = await addOfflineOperation('nota_historial_medico', 'crear', {
      ...formData,
      idAdultoMayor: olderAdultId,
    });
    return {
      id: idLocal,
      olderAdultId: String(olderAdultId),
      ...formData,
      creadoEn: new Date().toISOString(),
    };
  }

  const payload: ApiCreateMedicalNoteInput = {
    tipoNota: formData.tipoNota,
    contenido: formData.contenido,
  };

  const api = await createApiMedicalNote(olderAdultId, payload);
  return mapMedicalNoteFromApi(api);
}

export async function updateMedicalNote(
  olderAdultId: number,
  noteId: number,
  formData: Partial<MedicalNoteFormData>,
): Promise<void> {
  await updateApiMedicalNote(olderAdultId, noteId, formData);
}

export async function deleteMedicalNote(olderAdultId: number, noteId: number): Promise<void> {
  await deleteApiMedicalNote(olderAdultId, noteId);
}
