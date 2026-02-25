import { AppLoader } from '@/src/components/ui/AppLoader';
import { useAuthStore } from '@/src/stores/authStore';
import { Redirect } from 'expo-router';

/**
 * Entry point: redirect based on authentication state.
 * If session exists → app home, otherwise → login.
 */
export default function IndexScreen() {
    const { session, isLoading } = useAuthStore();

    if (isLoading) {
        return <AppLoader message="Cargando Tybachá..." />;
    }

    if (session) {
        return <Redirect href={'/(app)/home' as never} />;
    }

    return <Redirect href={'/(auth)/login' as never} />;
}
