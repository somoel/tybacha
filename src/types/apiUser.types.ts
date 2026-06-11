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

