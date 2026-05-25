export interface ApiNotification {
    idNotificacion: number;
    idAlertaProgramada: number | null;
    idUsuarioDestinatario: number;
    idAdultoMayor: number | null;
    tipoNotificacion: 'recordatorio_ejercicio' | 'cumplimiento' | 'progreso' | 'sistema' | 'otro';
    titulo: string;
    mensaje: string;
    canal: 'app' | 'correo' | 'sms' | 'push';
    estado: 'pendiente' | 'enviada' | 'recibida' | 'leida' | 'fallida';
    enviadaEn: string | null;
    recibidaEn: string | null;
    leidaEn: string | null;
    errorEnvio: string | null;
    creadoEn: string;
}

export interface ApiRegisterPushTokenInput {
    tokenExpo: string;
    plataforma: 'android' | 'web';
    dispositivo?: string;
}

