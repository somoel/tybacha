import { supabase } from '@/src/lib/supabase';
import type { UserRole } from '@/src/types/auth.types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session, User } from '@supabase/supabase-js';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface AuthState {
    session: Session | null;
    user: User | null;
    role: UserRole | null;
    isLoading: boolean;

    /** Set the current auth session */
    setSession: (session: Session | null) => void;
    /** Set the user's role (professional or caregiver) */
    setRole: (role: UserRole) => void;
    /** Set loading state */
    setLoading: (loading: boolean) => void;
    /** Log out and clear all auth state */
    logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            session: null,
            user: null,
            role: null,
            isLoading: true,

            setSession: (session) =>
                set({
                    session,
                    user: session?.user ?? null,
                }),

            setRole: (role) => set({ role }),

            setLoading: (isLoading) => set({ isLoading }),

            logout: async () => {
                try {
                    await supabase.auth.signOut();
                } catch (error) {
                    console.error('Error al cerrar sesión:', error);
                } finally {
                    set({
                        session: null,
                        user: null,
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
                role: state.role,
            }),
        }
    )
);
