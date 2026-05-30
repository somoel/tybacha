export type AlertType = 'recordatorio_ejercicio' | 'cumplimiento' | 'progreso' | 'sistema' | 'otro';
export type AlertStatus = 'activa' | 'pausada' | 'finalizada' | 'cancelada';
export type AlertChannel = 'app' | 'correo' | 'sms' | 'push';

export interface ApiAlert {
    idAlertaProgramada: number;
    idAdultoMayor: number | null;
    idPlanEjercicio: number | null;
    idUsuarioDestinatario: number | null;
    tipoAlerta: AlertType;
    titulo: string;
    mensaje: string;
    canal: AlertChannel;
    fechaProgramada: string | null;
    reglaProgramacion: Record<string, unknown> | null;
    condicionDisparo: Record<string, unknown> | null;
    estado: AlertStatus;
    creadaPor: number | null;
    creadoEn: string;
    actualizadoEn: string;
}

export interface ApiCreateAlertInput {
    idAdultoMayor?: number;
    idPlanEjercicio?: number;
    idUsuarioDestinatario?: number;
    tipoAlerta: AlertType;
    titulo: string;
    mensaje: string;
    canal?: AlertChannel;
    fechaProgramada?: string;
    reglaProgramacion?: Record<string, unknown>;
    condicionDisparo?: Record<string, unknown>;
}
