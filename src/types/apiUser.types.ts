import type { ApiUserRole } from '@/src/types/apiAuth.types';

export interface ApiUserSummary {
    idUsuario: number;
    correo: string;
    rol: ApiUserRole;
    estado: 'pendiente' | 'activo' | 'bloqueado' | 'inactivo';
    nombres: string | null;
    apellidos: string | null;
    telefono: string | null;
    ciudad: string | null;
}

export interface ApiAdminCaregiverSummary extends ApiUserSummary {
    cantidadPacientes: number;
}

export interface ApiAdminUserDetail extends ApiUserSummary {
    tipoDocumento: string | null;
    numeroDocumento: string | null;
    fechaNacimiento: string | null;
    genero: 'femenino' | 'masculino' | null;
    direccion: string | null;
    cuidadores: ApiAdminCaregiverSummary[];
}

export interface ApiAdminUserUpdateInput {
    correo?: string;
    contrasena?: string;
    estado?: ApiUserSummary['estado'];
    nombres?: string;
    apellidos?: string;
    tipoDocumento?: string;
    numeroDocumento?: string;
    telefono?: string;
    fechaNacimiento?: string;
    genero?: 'femenino' | 'masculino';
    direccion?: string;
    ciudad?: string;
}

export interface ApiCreateUserInput {
    correo: string;
    contrasena: string;
    rol: ApiUserRole;
    nombres: string;
    apellidos: string;
    tipoDocumento?: string;
    numeroDocumento?: string;
    telefono?: string;
    fechaNacimiento?: string;
    genero?: 'femenino' | 'masculino';
    direccion?: string;
    ciudad?: string;
}
