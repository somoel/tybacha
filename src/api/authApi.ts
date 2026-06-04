import { apiRequest, clearAuthTokens, setAuthTokens } from '@/src/api/httpClient';
import type { ApiChangeEmailResponse, ApiLoginInput, ApiLoginResponse } from '@/src/types/apiAuth.types';
import type { AuthUser, Profile } from '@/src/types/auth.types';

export async function loginWithApi(input: ApiLoginInput): Promise<ApiLoginResponse> {
    const response = await apiRequest<ApiLoginResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(input),
    });

    await setAuthTokens(response.accessToken, response.refreshToken);
    return response;
}

export async function logoutFromApi(): Promise<void> {
    await clearAuthTokens();
}

interface ApiMeResponse {
    idUsuario: number;
    correo: string;
    rol: 'administrador' | 'profesional' | 'cuidador';
    estado: string;
    perfil: {
        nombres: string | null;
        apellidos: string | null;
        telefono: string | null;
        ciudad: string | null;
    };
}

export async function fetchApiMe(): Promise<{ user: AuthUser; profile: Profile }> {
    const me = await apiRequest<ApiMeResponse>('/me');
    const fullName = [me.perfil.nombres, me.perfil.apellidos].filter(Boolean).join(' ') || me.correo;

    return {
        user: {
            id: String(me.idUsuario),
            idUsuario: me.idUsuario,
            email: me.correo,
            correo: me.correo,
            rol: me.rol,
        },
        profile: {
            id: String(me.idUsuario),
            idUsuario: me.idUsuario,
            full_name: fullName,
            role: me.rol,
            nombres: me.perfil.nombres,
            apellidos: me.perfil.apellidos,
            telefono: me.perfil.telefono,
            ciudad: me.perfil.ciudad,
        },
    };
}

export interface UpdateMeInput {
    nombres?: string;
    apellidos?: string;
    telefono?: string;
    ciudad?: string;
}

export interface ChangeEmailInput {
    nuevoCorreo: string;
    contrasena: string;
}

export interface ChangePasswordInput {
    contrasenaActual: string;
    nuevaContrasena: string;
}

export async function changeEmailApi(input: ChangeEmailInput): Promise<ApiChangeEmailResponse> {
    return apiRequest<ApiChangeEmailResponse>('/me/email', {
        method: 'PUT',
        body: JSON.stringify(input),
    });
}

export async function changePasswordApi(input: ChangePasswordInput): Promise<void> {
    await apiRequest<void>('/me/password', {
        method: 'PUT',
        body: JSON.stringify(input),
    });
}

export async function updateMeApi(input: UpdateMeInput): Promise<Profile> {
    const me = await apiRequest<ApiMeResponse>('/me', {
        method: 'PUT',
        body: JSON.stringify(input),
    });
    const fullName = [me.perfil.nombres, me.perfil.apellidos].filter(Boolean).join(' ') || me.correo;

    return {
        id: String(me.idUsuario),
        idUsuario: me.idUsuario,
        full_name: fullName,
        role: me.rol,
        nombres: me.perfil.nombres,
        apellidos: me.perfil.apellidos,
        telefono: me.perfil.telefono,
        ciudad: me.perfil.ciudad,
    };
}
