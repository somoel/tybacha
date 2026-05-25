import { apiRequest } from '@/src/api/httpClient';
import type {
    ApiCreateSftApplicationInput,
    ApiCreateSftApplicationResponse,
    ApiSftApplicationDetail,
    ApiSftApplication,
    ApiSftBattery,
    ApiSftTest,
} from '@/src/types/apiSft.types';

export function fetchActiveSftBatteries(): Promise<ApiSftBattery[]> {
    return apiRequest<ApiSftBattery[]>('/sft/batteries/active');
}

export function fetchSftBatteryTests(idBateriaSft: number): Promise<ApiSftTest[]> {
    return apiRequest<ApiSftTest[]>(`/sft/batteries/${idBateriaSft}/tests`);
}

export function fetchOlderAdultSftApplications(idAdultoMayor: number): Promise<ApiSftApplication[]> {
    return apiRequest<ApiSftApplication[]>(`/older-adults/${idAdultoMayor}/sft-applications`);
}

export function fetchSftApplicationDetail(idAplicacionSft: number): Promise<ApiSftApplicationDetail> {
    return apiRequest<ApiSftApplicationDetail>(`/sft-applications/${idAplicacionSft}`);
}

export function createOlderAdultSftApplication(
    idAdultoMayor: number,
    input: ApiCreateSftApplicationInput,
): Promise<ApiCreateSftApplicationResponse> {
    return apiRequest<ApiCreateSftApplicationResponse>(`/older-adults/${idAdultoMayor}/sft-applications`, {
        method: 'POST',
        body: JSON.stringify(input),
    });
}
