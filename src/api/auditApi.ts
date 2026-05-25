import { apiRequest } from '@/src/api/httpClient';

export interface ApiAuditChange {
    idAuditoriaCambio: number;
    tablaAfectada: string;
    idRegistroAfectado: number;
    accion: string;
    valoresAnteriores: unknown;
    valoresNuevos: unknown;
    realizadoPor: number | null;
    direccionIp: string | null;
    agenteUsuario: string | null;
    creadoEn: string;
}

export interface ApiAuditDataAccess {
    idAuditoriaAccesoDato: number;
    idUsuario: number | null;
    idAdultoMayor: number | null;
    tipoDato: string;
    accion: string;
    resultado: string;
    motivo: string | null;
    direccionIp: string | null;
    agenteUsuario: string | null;
    creadoEn: string;
}

export function fetchApiAuditChanges(tabla?: string, limit = 100): Promise<ApiAuditChange[]> {
    const params = new URLSearchParams({ limit: String(limit) });
    if (tabla) params.set('tabla', tabla);
    return apiRequest<ApiAuditChange[]>(`/audit/changes?${params.toString()}`);
}

export function fetchApiAuditDataAccess(
    idAdultoMayor?: number,
    limit = 100,
): Promise<ApiAuditDataAccess[]> {
    const params = new URLSearchParams({ limit: String(limit) });
    if (idAdultoMayor) params.set('idAdultoMayor', String(idAdultoMayor));
    return apiRequest<ApiAuditDataAccess[]>(`/audit/data-access?${params.toString()}`);
}

