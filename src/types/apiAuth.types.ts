export type ApiUserRole = 'administrador' | 'profesional' | 'cuidador';

export interface ApiAuthenticatedUser {
    idUsuario: number;
    correo: string;
    rol: ApiUserRole;
}

export interface ApiLoginInput {
    correo: string;
    contrasena: string;
    dispositivo?: string;
    recordarSesion?: boolean;
}

export interface ApiLoginResponse {
    accessToken: string;
    refreshToken: string;
    user: ApiAuthenticatedUser;
}

export interface ApiChangeEmailResponse {
    accessToken: string;
    refreshToken: string;
    user: ApiAuthenticatedUser;
}

