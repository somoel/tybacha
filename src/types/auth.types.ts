export type UserRole = 'administrador' | 'profesional' | 'cuidador';

export interface AuthSession {
    accessToken: string;
    refreshToken: string;
}

export interface AuthUser {
    id: string;
    idUsuario: number;
    email: string;
    correo: string;
    rol: UserRole;
}

export interface Profile {
    id: string;
    idUsuario: number;
    full_name: string;
    role: UserRole;
    nombres: string | null;
    apellidos: string | null;
    telefono: string | null;
    ciudad: string | null;
}

export interface AuthState {
    session: AuthSession | null;
    user: AuthUser | null;
    role: UserRole | null;
    isLoading: boolean;
    setSession: (session: AuthSession | null) => void;
    setRole: (role: UserRole) => void;
    logout: () => Promise<void>;
}

export interface LoginFormData {
    email: string;
    password: string;
    rememberMe: boolean;
}
