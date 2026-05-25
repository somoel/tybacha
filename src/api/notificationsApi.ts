import { apiRequest } from '@/src/api/httpClient';
import type { ApiNotification, ApiRegisterPushTokenInput } from '@/src/types/apiNotification.types';

export function registerApiPushToken(input: ApiRegisterPushTokenInput): Promise<{ ok: true; affectedRows: number }> {
    return apiRequest<{ ok: true; affectedRows: number }>('/push/tokens', {
        method: 'POST',
        body: JSON.stringify(input),
    });
}

export function fetchApiNotifications(unreadOnly = false, limit = 50): Promise<ApiNotification[]> {
    const params = new URLSearchParams({
        unreadOnly: String(unreadOnly),
        limit: String(limit),
    });

    return apiRequest<ApiNotification[]>(`/notifications?${params.toString()}`);
}

export function markApiNotificationsRead(ids: number[]): Promise<{ ok: true }> {
    return apiRequest<{ ok: true }>('/notifications/read', {
        method: 'PATCH',
        body: JSON.stringify({ ids }),
    });
}

