import { supabase } from '@/src/lib/supabase';
import { fetchUserProfile } from '@/src/services/authService';
import { useAuthStore } from '@/src/stores/authStore';
import { useEffect } from 'react';

/**
 * Hook that manages Supabase auth state changes.
 * Listens for session changes and updates the auth store.
 * Should be called once in the root layout.
 */
export function useAuth() {
    const { setSession, setRole, setLoading, session, role, user, isLoading } = useAuthStore();

    useEffect(() => {
        // Get initial session
        const initSession = async () => {
            try {
                const { data } = await supabase.auth.getSession();
                setSession(data.session);

                if (data.session?.user) {
                    const profile = await fetchUserProfile(data.session.user.id);
                    if (profile) {
                        setRole(profile.role);
                    }
                }
            } catch (error) {
                console.error('Error inicializando sesión:', error);
            } finally {
                setLoading(false);
            }
        };

        initSession();

        // Listen for auth state changes
        const { data: listener } = supabase.auth.onAuthStateChange(
            async (event, newSession) => {
                setSession(newSession);

                if (event === 'SIGNED_IN' && newSession?.user) {
                    const profile = await fetchUserProfile(newSession.user.id);
                    if (profile) {
                        setRole(profile.role);
                    }
                }

                if (event === 'SIGNED_OUT') {
                    setRole('professional'); // Reset will be overridden by store reset
                }
            }
        );

        return () => {
            listener?.subscription.unsubscribe();
        };
    }, [setSession, setRole, setLoading]);

    return { session, role, user, isLoading };
}
