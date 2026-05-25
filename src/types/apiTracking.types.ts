export type ApiExerciseRecordStatus = 'pendiente' | 'completado' | 'omitido' | 'parcial';

export interface ApiCreateExerciseRecordInput {
    idEjercicioPlan: number;
    idAdultoMayor: number;
    fechaProgramada: string;
    fechaRealizacion?: string;
    estado?: ApiExerciseRecordStatus;
    duracionRealSegundos?: number;
    repeticionesRealizadas?: number;
    esfuerzoPercibido?: number;
    dolorReportado?: number;
    comentario?: string;
}

export interface ApiExerciseRecord {
    idRegistroEjercicioPlan: number;
    idEjercicioPlan: number;
    idAdultoMayor: number;
    idRegistroActividadDiaria: number | null;
    fechaProgramada: string;
    fechaRealizacion: string | null;
    estado: ApiExerciseRecordStatus;
    duracionRealSegundos: number | null;
    repeticionesRealizadas: number | null;
    esfuerzoPercibido: number | null;
    dolorReportado: number | null;
    comentario: string | null;
}

