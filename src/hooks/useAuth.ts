import { fetchApiMe } from '@/src/api/authApi';
import { getAccessToken, getRefreshToken } from '@/src/api/httpClient';
import { registerPushNotifications } from '@/src/services/pushNotificationService';
import { useAuthStore } from '@/src/stores/authStore';
import { useEffect } from 'react';

/**
 * Restores API authentication state from secure token storage.
 * Should be called once in the root layout.
 */
export function useAuth() {
    const {
        setSession,
        setUser,
        setRole,
        setProfile,
        setLoading,
        session,
        role,
        user,
        isLoading,
    } = useAuthStore();

    useEffect(() => {
        const initSession = async () => {
            try {
                const [accessToken, refreshToken] = await Promise.all([
                    getAccessToken(),
                    getRefreshToken(),
                ]);

                if (!accessToken || !refreshToken) {
                    setSession(null);
                    setUser(null);
                    setProfile(null);
                    return;
                }

                setSession({ accessToken, refreshToken });
                const { user: apiUser, profile } = await fetchApiMe();
                setUser(apiUser);
                setRole(apiUser.rol);
                setProfile(profile);
                registerPushNotifications().catch(console.error);
            } catch (error) {
                console.error('Error inicializando sesion:', error);
                setSession(null);
                setUser(null);
                setProfile(null);
            } finally {
                setLoading(false);
            }
        };

        void initSession();
    }, [setSession, setUser, setRole, setLoading, setProfile]);

    return { session, role, user, isLoading };
}
