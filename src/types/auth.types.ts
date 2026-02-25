import type { Session, User } from '@supabase/supabase-js';

export type UserRole = 'professional' | 'caregiver';

export interface Profile {
    id: string;
    full_name: string;
    role: UserRole;
    created_at: string;
}

export interface AuthState {
    session: Session | null;
    user: User | null;
    role: UserRole | null;
    isLoading: boolean;
    setSession: (session: Session | null) => void;
    setRole: (role: UserRole) => void;
    logout: () => Promise<void>;
}

export interface LoginFormData {
    email: string;
    password: string;
    rememberMe: boolean;
}
