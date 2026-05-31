export type ApiPathologyStatus = 'activa' | 'resuelta' | 'cronica' | 'desconocida';

export interface ApiPathology {
  idPatologiaAdultoMayor: number;
  idAdultoMayor: number;
  nombre: string;
  descripcion: string | null;
  fechaDiagnostico: string | null;
  estado: ApiPathologyStatus;
  registradoPor: number | null;
  creadoEn: string;
  actualizadoEn: string;
}

export interface ApiCreatePathologyInput {
  nombre: string;
  descripcion?: string;
  fechaDiagnostico?: string;
  estado?: ApiPathologyStatus;
}

export type ApiUpdatePathologyInput = Partial<ApiCreatePathologyInput>;

export type ApiMedicationStatus = 'activo' | 'suspendido' | 'finalizado' | 'desconocido';

export interface ApiMedication {
  idMedicamentoAdultoMayor: number;
  idAdultoMayor: number;
  nombre: string;
  dosis: string | null;
  frecuencia: string | null;
  viaAdministracion: string | null;
  fechaInicio: string | null;
  fechaFin: string | null;
  estado: ApiMedicationStatus;
  observaciones: string | null;
  registradoPor: number | null;
  creadoEn: string;
  actualizadoEn: string;
}

export interface ApiCreateMedicationInput {
  nombre: string;
  dosis?: string;
  frecuencia?: string;
  viaAdministracion?: string;
  fechaInicio?: string;
  fechaFin?: string;
  estado?: ApiMedicationStatus;
  observaciones?: string;
}

export type ApiUpdateMedicationInput = Partial<ApiCreateMedicationInput>;

export type ApiMedicalNoteType = 'antecedente' | 'alergia' | 'limitacion' | 'observacion' | 'otro';

export interface ApiMedicalNote {
  idNotaHistorialMedico: number;
  idAdultoMayor: number;
  tipoNota: ApiMedicalNoteType;
  contenido: string;
  registradoPor: number | null;
  creadoEn: string;
}

export interface ApiCreateMedicalNoteInput {
  tipoNota?: ApiMedicalNoteType;
  contenido: string;
}

export type ApiUpdateMedicalNoteInput = Partial<ApiCreateMedicalNoteInput>;
