import { apiRequest } from '@/src/api/httpClient';
import type {
    ApiExercisePlan,
    ApiExercisePlanSummary,
    ApiGenerateExercisePlanInput,
    ApiPlanStatus,
} from '@/src/types/apiExercisePlan.types';

export function fetchApiExercisePlans(idAdultoMayor: number): Promise<ApiExercisePlanSummary[]> {
    return apiRequest<ApiExercisePlanSummary[]>(`/older-adults/${idAdultoMayor}/exercise-plans`);
}

export function fetchApiExercisePlan(idPlanEjercicio: number): Promise<ApiExercisePlan> {
    return apiRequest<ApiExercisePlan>(`/exercise-plans/${idPlanEjercicio}`);
}

export function generateApiExercisePlan(input: ApiGenerateExercisePlanInput): Promise<ApiExercisePlan> {
    return apiRequest<ApiExercisePlan>('/exercise-plans/generate', {
        method: 'POST',
        body: JSON.stringify(input),
    });
}

export function updateApiExercisePlanStatus(
    idPlanEjercicio: number,
    estado: ApiPlanStatus,
    motivo?: string,
): Promise<ApiExercisePlan> {
    return apiRequest<ApiExercisePlan>(`/exercise-plans/${idPlanEjercicio}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ estado, motivo }),
    });
}

