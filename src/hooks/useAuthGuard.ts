import { useAuthStore } from '@/src/stores/authStore';

/**
 * Shared auth state for route guards.
 * `isAuthenticated` requires both the persisted identity (user) and the
 * in-memory session (tokens) so a store restored without tokens (or tokens
 * cleared without clearing the store) never counts as logged in.
 */
export function useAuthGuard() {
    const isLoading = useAuthStore((state) => state.isLoading);
    const user = useAuthStore((state) => state.user);
    const session = useAuthStore((state) => state.session);

    return {
        isLoading,
        isAuthenticated: !!user && !!session,
    };
}
