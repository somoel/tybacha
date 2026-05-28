export type ApiPlanStatus =
    | 'borrador'
    | 'generado'
    | 'revisado'
    | 'asignado'
    | 'activo'
    | 'pausado'
    | 'finalizado'
    | 'cancelado';

export interface ApiExercisePlanSummary {
    idPlanEjercicio: number;
    idAdultoMayor: number;
    titulo: string;
    objetivo: string | null;
    origen: 'manual' | 'ia' | 'mixto';
    estado: ApiPlanStatus;
    nivelDificultad: 'bajo' | 'medio' | 'alto';
    fechaInicio: string | null;
    fechaFin: string | null;
    creadoEn: string;
}

export interface ApiExercisePlanExercise {
    idEjercicioPlan: number;
    idPlanEjercicio: number;
    nombre: string | null;
    descripcion: string | null;
    diaSemana: 'lunes' | 'martes' | 'miercoles' | 'jueves' | 'viernes' | 'sabado' | 'domingo';
    orden: number;
    series: number | null;
    repeticiones: number | null;
    duracionSegundos: number | null;
    descansoSegundos: number | null;
    dificultad: 'bajo' | 'medio' | 'alto';
    instrucciones: string | null;
}

export interface ApiExercisePlan extends ApiExercisePlanSummary {
    creadoPor: number | null;
    revisadoPor: number | null;
    asignadoPor: number | null;
    ejercicios: ApiExercisePlanExercise[];
}

export interface ApiGenerateExercisePlanInput {
    idAdultoMayor: number;
    idAplicacionSft?: number;
    titulo?: string;
    objetivo?: string;
}

export interface ApiCreateExercisePlanInput {
    idAdultoMayor: number;
    titulo?: string;
    objetivo?: string;
    nivelDificultad?: 'bajo' | 'medio' | 'alto';
    origen?: 'manual' | 'mixto';
    ejercicios: {
        diaSemana: 'lunes' | 'martes' | 'miercoles' | 'jueves' | 'viernes';
        nombre: string;
        descripcion?: string;
        series?: number;
        repeticiones?: number;
        duracionSegundos?: number;
        descansoSegundos?: number;
        dificultad?: 'bajo' | 'medio' | 'alto';
        instrucciones?: string;
    }[];
}

