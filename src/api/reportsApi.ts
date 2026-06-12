import { getAccessToken } from '@/src/api/httpClient';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4001';

export type ReportFormat = 'pdf' | 'xlsx';

export async function generateProgressReport(
    idAdultoMayor: number,
    format: ReportFormat,
): Promise<Blob> {
    const token = await getAccessToken();
    const response = await fetch(`${API_URL}/reports/progress.${format}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ idAdultoMayor }),
    });

    if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message ?? 'Error generando reporte');
    }

    return response.blob();
}

export async function exportBatteryXlsx(idAplicacionSft: number): Promise<Blob> {
    const token = await getAccessToken();
    const response = await fetch(`${API_URL}/sft-applications/${idAplicacionSft}/export.xlsx`, {
        method: 'GET',
        headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
    });

    if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message ?? 'Error exportando batería');
    }

    return response.blob();
}

export async function exportBulkBatteryXlsx(patientIds: number[]): Promise<Blob> {
    const token = await getAccessToken();
    const response = await fetch(`${API_URL}/sft-applications/export-bulk.xlsx`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ patientIds }),
    });

    if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message ?? 'Error exportando baterías');
    }

    return response.blob();
}

