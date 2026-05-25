export type ApiConsentType =
    | 'tratamiento_datos'
    | 'evaluacion_funcional'
    | 'plan_ejercicio'
    | 'investigacion'
    | 'otro';

export type ApiConsentStatus = 'vigente' | 'revocado' | 'vencido' | 'pendiente';

export interface ApiConsent {
    idConsentimientoAdultoMayor: number;
    idAdultoMayor: number;
    tipoConsentimiento: ApiConsentType;
    estado: ApiConsentStatus;
    otorgadoPorNombre: string | null;
    otorgadoPorDocumento: string | null;
    fechaOtorgamiento: string | null;
    fechaVencimiento: string | null;
    observaciones: string | null;
    registradoPor: number | null;
    creadoEn: string;
    actualizadoEn: string;
}

export interface ApiCreateConsentInput {
    tipoConsentimiento: ApiConsentType;
    estado?: ApiConsentStatus;
    otorgadoPorNombre?: string;
    otorgadoPorDocumento?: string;
    fechaOtorgamiento?: string;
    fechaVencimiento?: string;
    observaciones?: string;
}

export interface ApiConsentStatusResponse {
    idAdultoMayor: number;
    tieneConsentimientoVigente: boolean;
    consentimientos: ApiConsent[];
}

