import { changeEmailApi, changePasswordApi, logoutFromApi, updateMeApi, type ChangeEmailInput, type ChangePasswordInput, type UpdateMeInput } from '@/src/api/authApi';
import { setAuthTokens } from '@/src/api/httpClient';
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
    updateProfile: (input: UpdateMeInput) => Promise<void>;
    changeEmail: (input: ChangeEmailInput) => Promise<void>;
    changePassword: (input: ChangePasswordInput) => Promise<void>;
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

            updateProfile: async (input) => {
                const profile = await updateMeApi(input);
                set({ profile });
            },

            changeEmail: async (input) => {
                const response = await changeEmailApi(input);
                await setAuthTokens(response.accessToken, response.refreshToken);
                set((state) => ({
                    user: state.user
                        ? { ...state.user, email: response.user.correo, correo: response.user.correo }
                        : null,
                }));
            },

            changePassword: async (input) => {
                await changePasswordApi(input);
            },

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
