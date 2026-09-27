import { fetchApiMe, logoutFromApi } from '@/src/api/authApi';
import { ApiError, getAccessToken, getRefreshToken, setOnAuthExpired } from '@/src/api/httpClient';
import { registerPushNotifications } from '@/src/services/pushNotificationService';
import { useAuthStore } from '@/src/stores/authStore';
import { useEffect } from 'react';

const HYDRATION_TIMEOUT_MS = 2000;

/**
 * Waits until the persisted store has been rehydrated so initSession never
 * races against AsyncStorage (a late merge could restore a stale user over
 * freshly cleared state, or vice versa).
 */
async function waitForHydration(): Promise<void> {
    if (useAuthStore.persist.hasHydrated()) {
        return;
    }

    let unsubscribe: (() => void) | undefined;
    let timeout: ReturnType<typeof setTimeout> | undefined;

    const hydrated = new Promise<void>((resolve) => {
        unsubscribe = useAuthStore.persist.onFinishHydration(() => resolve());
    });
    const timedOut = new Promise<void>((resolve) => {
        timeout = setTimeout(resolve, HYDRATION_TIMEOUT_MS);
    });

    await Promise.race([hydrated, timedOut]);
    unsubscribe?.();
    clearTimeout(timeout);
}

function clearAuthState(): void {
    const { setSession, setUser, setProfile, setRole } = useAuthStore.getState();
    setSession(null);
    setUser(null);
    setProfile(null);
    setRole(null);
}

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
        let cancelled = false;

        // Tokens rejected by /auth/refresh: wipe identity so the route guard
        // sends the user to login instead of keeping a session-less dashboard.
        setOnAuthExpired(() => {
            clearAuthState();
            useAuthStore.getState().setLoading(false);
        });

        const initSession = async () => {
            try {
                await waitForHydration();
                if (cancelled) return;

                const [accessToken, refreshToken] = await Promise.all([
                    getAccessToken(),
                    getRefreshToken(),
                ]);
                if (cancelled) return;

                if (!accessToken || !refreshToken) {
                    clearAuthState();
                    return;
                }

                setSession({ accessToken, refreshToken });

                try {
                    const { user: apiUser, profile } = await fetchApiMe();
                    if (cancelled) return;
                    setUser(apiUser);
                    setRole(apiUser.rol);
                    setProfile(profile);
                    registerPushNotifications().catch(console.error);
                } catch (error) {
                    if (cancelled) return;
                    if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
                        // Session rejected by the API: drop tokens and identity.
                        await logoutFromApi();
                        clearAuthState();
                    } else {
                        // Network/server hiccup: keep the cached identity (offline-first).
                        console.warn('No se pudo validar la sesion, se usa la copia en cache:', error);
                    }
                }
            } catch (error) {
                console.error('Error inicializando sesion:', error);
                if (!cancelled) {
                    clearAuthState();
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        void initSession();

        return () => {
            cancelled = true;
            setOnAuthExpired(null);
        };
    }, [setSession, setUser, setRole, setLoading, setProfile]);

    return { session, role, user, isLoading };
}
