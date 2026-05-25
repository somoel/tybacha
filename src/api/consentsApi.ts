import { apiRequest } from '@/src/api/httpClient';
import type {
    ApiConsent,
    ApiConsentStatusResponse,
    ApiCreateConsentInput,
} from '@/src/types/apiConsent.types';

export function fetchApiConsents(idAdultoMayor: number): Promise<ApiConsent[]> {
    return apiRequest<ApiConsent[]>(`/older-adults/${idAdultoMayor}/consents`);
}

export function fetchApiConsentStatus(idAdultoMayor: number): Promise<ApiConsentStatusResponse> {
    return apiRequest<ApiConsentStatusResponse>(`/older-adults/${idAdultoMayor}/consents/status`);
}

export function createApiConsent(
    idAdultoMayor: number,
    input: ApiCreateConsentInput,
): Promise<ApiConsent> {
    return apiRequest<ApiConsent>(`/older-adults/${idAdultoMayor}/consents`, {
        method: 'POST',
        body: JSON.stringify(input),
    });
}

export function revokeApiConsent(
    idConsentimientoAdultoMayor: number,
    observaciones?: string,
): Promise<{ ok: true }> {
    return apiRequest<{ ok: true }>(`/consents/${idConsentimientoAdultoMayor}/revoke`, {
        method: 'PATCH',
        body: JSON.stringify({ observaciones }),
    });
}

