import { apiRequest } from '@/src/api/httpClient';
import type { ApiCreateUserInput, ApiUserSummary } from '@/src/types/apiUser.types';

export function fetchApiUsers(): Promise<ApiUserSummary[]> {
    return apiRequest<ApiUserSummary[]>('/users');
}

export function createApiUser(input: ApiCreateUserInput): Promise<ApiUserSummary> {
    return apiRequest<ApiUserSummary>('/users', {
        method: 'POST',
        body: JSON.stringify(input),
    });
}

