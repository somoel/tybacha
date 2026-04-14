import { authServiceMySQL } from '@/src/services/authServiceMySQL';
import type { UserRole } from '@/src/types/auth.types';
import type { User, UserProfile } from '@/src/types/database.types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface AuthState {
    user: User | null;
    profile: UserProfile | null;
    role: UserRole | null;
    isLoading: boolean;

    /** Set the current user */
    setUser: (user: User | null) => void;
    /** Set the user's profile (full_name, role, etc.) */
    setProfile: (profile: UserProfile | null) => void;
    /** Set the user's role (professional, caregiver, or admin) */
    setRole: (role: UserRole) => void;
    /** Set loading state */
    setLoading: (loading: boolean) => void;
    /** Log out and clear all auth state */
    logout: () => Promise<void>;
    /** Initialize auth state from storage */
    initializeAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            user: null,
            profile: null,
            role: null,
            isLoading: true,

            setUser: (user) => set({ user }),

            setProfile: (profile) => set({ profile }),

            setRole: (role) => set({ role }),

            setLoading: (isLoading) => set({ isLoading }),

            initializeAuth: async () => {
                const { user, profile, role } = get();
                if (user && profile && role) {
                    // User is already authenticated from storage
                    set({ isLoading: false });
                    return;
                }

                // Try to restore auth from stored user ID
                try {
                    const storedUserId = await AsyncStorage.getItem('tybacha-user-id');
                    if (storedUserId) {
                        const userData = await authServiceMySQL.getUserById(storedUserId);
                        const profileData = await authServiceMySQL.getUserProfile(storedUserId);
                        
                        if (userData && profileData) {
                            set({
                                user: userData,
                                profile: profileData,
                                role: userData.rol,
                                isLoading: false,
                            });
                            return;
                        }
                    }
                } catch (error) {
                    console.error('Error initializing auth:', error);
                }

                set({ isLoading: false });
            },

            logout: async () => {
                try {
                    console.log('AuthStore - Starting logout process');
                    console.log('AuthStore - Current user:', get().user);
                    
                    await authServiceMySQL.logout();
                    console.log('AuthStore - AuthServiceMySQL logout completed');
                    
                    await AsyncStorage.removeItem('tybacha-user-id');
                    console.log('AuthStore - AsyncStorage cleanup completed');
                    
                } catch (error) {
                    console.error('AuthStore - Error al cerrar sesión:', error);
                } finally {
                    console.log('AuthStore - Clearing auth state');
                    set({
                        user: null,
                        profile: null,
                        role: null,
                        isLoading: false,
                    });
                    console.log('AuthStore - Logout process completed');
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
