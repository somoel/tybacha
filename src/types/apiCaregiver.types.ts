export interface ApiCaregiverSummary {
    idUsuario: number;
    correo: string;
    estado: 'pendiente' | 'activo' | 'bloqueado' | 'inactivo';
    nombres: string | null;
    apellidos: string | null;
    telefono: string | null;
    ciudad: string | null;
    creadoEn: string | null;
    ultimoAccesoEn: string | null;
    cantidadPacientes: number;
    pacientesConPlanActivo: number;
    cumplimientoSemanalPromedio: number;
}

export interface ApiCaregiverPatient {
    idAdultoMayor: number;
    nombres: string;
    apellidos: string;
    fechaNacimiento: string;
    genero: 'femenino' | 'masculino';
    tienePlanActivo: boolean;
    cumplimientoSemanal: number;
    tieneAlertaActiva: boolean;
    cantidadBaterias: number;
}

export interface ApiCaregiverDetail extends ApiCaregiverSummary {
    pacientes: ApiCaregiverPatient[];
}
