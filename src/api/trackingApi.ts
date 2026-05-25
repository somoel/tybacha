import { apiRequest } from '@/src/api/httpClient';
import type { ApiCreateExerciseRecordInput, ApiExerciseRecord } from '@/src/types/apiTracking.types';

export function createApiExerciseRecord(input: ApiCreateExerciseRecordInput): Promise<ApiExerciseRecord> {
    return apiRequest<ApiExerciseRecord>('/tracking/exercise-records', {
        method: 'POST',
        body: JSON.stringify(input),
    });
}

export function fetchApiExerciseRecords(
    idAdultoMayor: number,
    from?: string,
    to?: string,
): Promise<ApiExerciseRecord[]> {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const query = params.toString();

    return apiRequest<ApiExerciseRecord[]>(
        `/older-adults/${idAdultoMayor}/exercise-records${query ? `?${query}` : ''}`,
    );
}

