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

export interface ApiProgressStats {
    id_estadistica_progreso: number;
    id_adulto_mayor: number;
    id_plan_ejercicio: number;
    tipo_periodo: 'semana';
    fecha_inicio: string;
    fecha_fin: string;
    ejercicios_programados: number;
    ejercicios_completados: number;
    ejercicios_omitidos: number;
    porcentaje_cumplimiento: number;
    datos_metricas: string | null;
    calculado_en: string;
}

