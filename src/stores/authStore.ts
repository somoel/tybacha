import { logoutFromApi } from '@/src/api/authApi';
import type { AuthSession, AuthUser, Profile, UserRole } from '@/src/types/auth.types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface AuthState {
    session: AuthSession | null;
    user: AuthUser | null;
    profile: Profile | null;
    role: UserRole | null;
    isLoading: boolean;
    setSession: (session: AuthSession | null) => void;
    setUser: (user: AuthUser | null) => void;
    setProfile: (profile: Profile | null) => void;
    setRole: (role: UserRole) => void;
    setLoading: (loading: boolean) => void;
    logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            session: null,
            user: null,
            profile: null,
            role: null,
            isLoading: true,

            setSession: (session) => set({ session }),
            setUser: (user) => set({ user }),
            setProfile: (profile) => set({ profile }),
            setRole: (role) => set({ role }),
            setLoading: (isLoading) => set({ isLoading }),

            logout: async () => {
                try {
                    await logoutFromApi();
                } catch (error) {
                    console.error('Error al cerrar sesion:', error);
                } finally {
                    set({
                        session: null,
                        user: null,
                        profile: null,
                        role: null,
                        isLoading: false,
                    });
                }
            },
        }),
        {
            name: 'tybacha-auth',
            storage: createJSONStorage(() => AsyncStorage),
            partialize: (state) => ({
                user: state.user,
                profile: state.profile,
                role: state.role,
            }),
        }
    )
);
