import type { User, UserProfile, UserRole } from './database.types';

export type { UserRole };

export interface Profile {
    id: string;
    full_name: string;
    role: UserRole;
    created_at: string;
}

export interface AuthState {
    user: User | null;
    profile: UserProfile | null;
    role: UserRole | null;
    isLoading: boolean;
    setUser: (user: User | null) => void;
    setProfile: (profile: UserProfile | null) => void;
    setRole: (role: UserRole) => void;
    logout: () => Promise<void>;
}

export interface LoginFormData {
    email: string;
    password: string;
    rememberMe: boolean;
}

export interface AuthResponse {
    success: boolean;
    user?: User;
    profile?: UserProfile;
    error?: string;
}
