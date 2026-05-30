import {
    createApiExercisePlan,
    fetchApiExercisePlan,
    fetchApiExercisePlans,
    generateApiExercisePlan,
    updateApiExercisePlan,
    updateApiExercisePlanStatus,
} from '@/src/api/exercisePlansApi';
import { createApiExerciseRecord } from '@/src/api/trackingApi';
import { addOfflineOperation } from '@/src/lib/sqlite';
import type { ApiExerciseRecordStatus } from '@/src/types/apiTracking.types';
import type { ApiCreateExercisePlanInput, ApiExercisePlan, ApiExercisePlanSummary, ApiPlanStatus } from '@/src/types/apiExercisePlan.types';
import type { SFTResult } from '@/src/types/battery.types';
import type { ExerciseLog, ExerciseLogInput, ExercisePlan } from '@/src/types/exercise.types';
import type { Patient } from '@/src/types/patient.types';

function mapStatus(status: ApiPlanStatus): ExercisePlan['status'] {
    if (status === 'finalizado') return 'completed';
    if (status === 'cancelado') return 'cancelled';
    return 'active';
}

function mapApiPlan(plan: ApiExercisePlan | ApiExercisePlanSummary): ExercisePlan {
    const maybeFullPlan = plan as ApiExercisePlan;

    return {
        id: String(plan.idPlanEjercicio),
        patient_id: String(plan.idAdultoMayor),
        battery_id: '',
        generated_by: 'creadoPor' in plan && plan.creadoPor ? String(plan.creadoPor) : '',
        generated_at: plan.creadoEn,
        status: mapStatus(plan.estado),
        summary: plan.objetivo ?? undefined,
        exercises: maybeFullPlan.ejercicios?.map((exercise, index) => ({
            index,
            id_ejercicio_plan: exercise.idEjercicioPlan,
            name: exercise.nombre ?? `Ejercicio ${index + 1}`,
            description: exercise.descripcion ?? exercise.instrucciones ?? '',
            sets: exercise.series ?? 1,
            reps: exercise.repeticiones,
            duration_seconds: exercise.duracionSegundos,
            frequency: exercise.diaSemana,
            rationale: exercise.instrucciones ?? '',
        })) ?? [],
    };
}

export async function generateExercisePlan(
    patient: Patient,
    _results: SFTResult[],
    _generatedBy: string,
    batteryId: string,
): Promise<ExercisePlan> {
    const plan = await generateApiExercisePlan({
        idAdultoMayor: Number(patient.id),
        idAplicacionSft: Number(batteryId),
        titulo: 'Plan semanal personalizado',
    });

    return mapApiPlan(plan);
}

export async function createExercisePlan(
    patientId: string,
    planData: {
        titulo?: string;
        objetivo?: string;
        nivelDificultad?: 'bajo' | 'medio' | 'alto';
        origen?: 'manual' | 'mixto';
        ejercicios: ApiCreateExercisePlanInput['ejercicios'];
    },
): Promise<ExercisePlan> {
    const plan = await createApiExercisePlan({
        idAdultoMayor: Number(patientId),
        ...planData,
    });
    return mapApiPlan(plan);
}

export async function updateExercisePlan(
    planId: string,
    planData: {
        titulo?: string;
        objetivo?: string;
        nivelDificultad?: 'bajo' | 'medio' | 'alto';
        ejercicios: ApiCreateExercisePlanInput['ejercicios'];
    },
): Promise<ExercisePlan> {
    const plan = await updateApiExercisePlan(Number(planId), {
        idAdultoMayor: 0,
        ...planData,
    });
    return mapApiPlan(plan);
}

export async function fetchExercisePlans(patientId: string): Promise<ExercisePlan[]> {
    const summaries = await fetchApiExercisePlans(Number(patientId));

    return Promise.all(
        summaries.map(async (summary) => {
            try {
                const plan = await fetchApiExercisePlan(summary.idPlanEjercicio);
                return mapApiPlan(plan);
            } catch {
                return mapApiPlan(summary);
            }
        }),
    );
}

export async function logExerciseCompletion(
    planId: string,
    exerciseIndex: number,
    loggedBy: string,
    input: ExerciseLogInput,
): Promise<ExerciseLog> {
    const plan = await fetchApiExercisePlan(Number(planId));
    const exercise = plan.ejercicios[exerciseIndex];

    if (!exercise) {
        throw new Error('Ejercicio no encontrado en el plan.');
    }

    const today = new Date().toISOString().slice(0, 10);
    const estado: ApiExerciseRecordStatus = input.completed ? 'completado' : 'omitido';
    const payload = {
        idEjercicioPlan: exercise.idEjercicioPlan,
        idAdultoMayor: plan.idAdultoMayor,
        fechaProgramada: today,
        fechaRealizacion: new Date().toISOString(),
        estado,
        repeticionesRealizadas: input.value_achieved,
        duracionRealSegundos: input.duration_seconds,
        esfuerzoPercibido: input.perceived_effort,
        dolorReportado: input.reported_pain,
        comentario: input.notes,
    };

    // If the request fails because the device is offline, keep the operation queued.
    // Other validation errors still surface to the user.
    let record;
    try {
        record = await createApiExerciseRecord(payload);
    } catch {
        await addOfflineOperation('registro_ejercicio_plan', 'crear', payload);
        return {
            id: `${planId}-${exerciseIndex}-${today}`,
            plan_id: planId,
            exercise_index: exerciseIndex,
            logged_by: loggedBy,
            logged_at: new Date().toISOString(),
            completed: input.completed,
            value_achieved: input.value_achieved,
            notes: input.notes,
        };
    }

    return {
        id: String(record.idRegistroEjercicioPlan),
        plan_id: planId,
        exercise_index: exerciseIndex,
        logged_by: loggedBy,
        logged_at: record.fechaRealizacion ?? new Date().toISOString(),
        completed: input.completed,
        value_achieved: input.value_achieved,
        notes: input.notes,
    };
}

export async function fetchExerciseLogs(): Promise<ExerciseLog[]> {
    return [];
}

export async function updatePlanStatus(
    planId: string,
    status: ExercisePlan['status'],
): Promise<void> {
    const mappedStatus: ApiPlanStatus =
        status === 'completed' ? 'finalizado' :
            status === 'cancelled' ? 'cancelado' :
                'activo';

    await updateApiExercisePlanStatus(Number(planId), mappedStatus);
}
