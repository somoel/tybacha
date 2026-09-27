import { AppLoader } from '@/src/components/ui/AppLoader';
import { useAuthGuard } from '@/src/hooks/useAuthGuard';
import { Redirect } from 'expo-router';

/**
 * Entry point: redirect based on authentication state.
 * If session exists → app home, otherwise → login.
 */
export default function IndexScreen() {
    const { isLoading, isAuthenticated } = useAuthGuard();

    if (isLoading) {
        return <AppLoader message="Cargando Tybacha..." />;
    }

    if (isAuthenticated) {
        return <Redirect href={'/(app)/home' as never} />;
    }

    return <Redirect href={'/(auth)/login' as never} />;
}
