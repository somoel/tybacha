import { supabase } from '@/src/lib/supabase';
import type { Profile, UserRole } from '@/src/types/auth.types';

/**
 * Log in with email and password via Supabase Auth.
 * @returns The user session on success
 * @throws Error with a user-friendly message in Spanish
 */
export async function login(email: string, password: string) {
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            throw new Error(mapAuthError(error.message));
        }

        return data;
    } catch (error) {
        if (error instanceof Error) throw error;
        throw new Error('Error inesperado al iniciar sesión. Intente de nuevo.');
    }
}

/**
 * Register a new user with email, password, and profile data.
 * @returns The created user data
 */
export async function register(
    email: string,
    password: string,
    fullName: string,
    role: UserRole
) {
    try {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                    role,
                },
            },
        });

        if (error) {
            throw new Error(mapAuthError(error.message));
        }

        // Create profile entry
        if (data.user) {
            const { error: profileError } = await supabase.from('profiles').insert({
                id: data.user.id,
                full_name: fullName,
                role,
            });

            if (profileError) {
                console.error('Error creando perfil:', profileError);
            }
        }

        return data;
    } catch (error) {
        if (error instanceof Error) throw error;
        throw new Error('Error inesperado al registrar. Intente de nuevo.');
    }
}

/**
 * Log out the current user.
 */
export async function logout() {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) {
            throw new Error('Error al cerrar sesión. Intente de nuevo.');
        }
    } catch (error) {
        if (error instanceof Error) throw error;
        throw new Error('Error inesperado al cerrar sesión.');
    }
}

/**
 * Fetch the profile (including role) for the current user.
 */
export async function fetchUserProfile(userId: string): Promise<Profile | null> {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (error) {
            console.error('Error obteniendo perfil:', error);
            return null;
        }

        return data as Profile;
    } catch (error) {
        console.error('Error inesperado obteniendo perfil:', error);
        return null;
    }
}

/**
 * Get the current session from Supabase.
 */
export async function getCurrentSession() {
    try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
            throw new Error('Error obteniendo sesión actual.');
        }
        return data.session;
    } catch (error) {
        if (error instanceof Error) throw error;
        throw new Error('Error inesperado obteniendo sesión.');
    }
}

/** Map Supabase auth error messages to user-friendly Spanish */
function mapAuthError(message: string): string {
    if (message.includes('Invalid login credentials')) {
        return 'Correo o contraseña incorrectos.';
    }
    if (message.includes('Email not confirmed')) {
        return 'Debe confirmar su correo electrónico antes de iniciar sesión.';
    }
    if (message.includes('User already registered')) {
        return 'Este correo ya está registrado.';
    }
    if (message.includes('Password should be at least')) {
        return 'La contraseña debe tener al menos 8 caracteres.';
    }
    if (message.includes('rate limit')) {
        return 'Demasiados intentos. Espere un momento antes de intentar de nuevo.';
    }
    return `Error de autenticación: ${message}`;
}
