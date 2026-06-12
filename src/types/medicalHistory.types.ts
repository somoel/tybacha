export type PathologyStatus = 'activa' | 'resuelta' | 'cronica' | 'desconocida';

export type MedicationStatus = 'activo' | 'suspendido' | 'finalizado' | 'desconocido';

export type MedicalNoteType = 'antecedente' | 'alergia' | 'limitacion' | 'observacion' | 'otro';

export interface Pathology {
  id: string;
  olderAdultId: string;
  nombre: string;
  descripcion?: string;
  fechaDiagnostico?: string;
  estado: PathologyStatus;
  registradoPor?: string;
  registradoPorNombre?: string;
  creadoEn: string;
  actualizadoEn: string;
}

export interface PathologyFormData {
  nombre: string;
  descripcion?: string;
  fechaDiagnostico?: string;
  estado: PathologyStatus;
}

export interface Medication {
  id: string;
  olderAdultId: string;
  nombre: string;
  dosis?: string;
  frecuencia?: string;
  viaAdministracion?: string;
  fechaInicio?: string;
  fechaFin?: string;
  estado: MedicationStatus;
  observaciones?: string;
  registradoPor?: string;
  registradoPorNombre?: string;
  creadoEn: string;
  actualizadoEn: string;
}

export interface MedicationFormData {
  nombre: string;
  dosis?: string;
  frecuencia?: string;
  viaAdministracion?: string;
  fechaInicio?: string;
  fechaFin?: string;
  estado: MedicationStatus;
  observaciones?: string;
}

export interface MedicalNote {
  id: string;
  olderAdultId: string;
  tipoNota: MedicalNoteType;
  contenido: string;
  registradoPor?: string;
  registradoPorNombre?: string;
  creadoEn: string;
}

export interface MedicalNoteFormData {
  tipoNota: MedicalNoteType;
  contenido: string;
}
