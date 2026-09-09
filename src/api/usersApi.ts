import { apiRequest } from '@/src/api/httpClient';
import type {
    ApiAdminUserDetail,
    ApiAdminUserUpdateInput,
    ApiCreateUserInput,
    ApiUserSummary,
} from '@/src/types/apiUser.types';

export function fetchApiUsers(): Promise<ApiUserSummary[]> {
    return apiRequest<ApiUserSummary[]>('/users');
}

export function createApiUser(input: ApiCreateUserInput): Promise<ApiUserSummary> {
    return apiRequest<ApiUserSummary>('/users', {
        method: 'POST',
        body: JSON.stringify(input),
    });
}

export function fetchApiUserDetail(id: number): Promise<ApiAdminUserDetail> {
    return apiRequest<ApiAdminUserDetail>(`/users/${id}`);
}

export function updateApiUser(id: number, input: ApiAdminUserUpdateInput): Promise<ApiAdminUserDetail> {
    return apiRequest<ApiAdminUserDetail>(`/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify(input),
    });
}

export function updateApiProfessionalCaregivers(id: number, caregiverIds: number[]): Promise<ApiAdminUserDetail> {
    return apiRequest<ApiAdminUserDetail>(`/users/${id}/caregivers`, {
        method: 'PUT',
        body: JSON.stringify({ caregiverIds }),
    });
}
