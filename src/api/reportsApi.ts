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

