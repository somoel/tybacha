import { AppLoader } from '@/src/components/ui/AppLoader';
import { useAuthGuard } from '@/src/hooks/useAuthGuard';
import { Redirect, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

/**
 * Auth layout group - no header, screens stack on top of each other.
 * Inverse guard: authenticated users are bounced to home instead of the login form.
 */
export default function AuthLayout() {
    const { isLoading, isAuthenticated } = useAuthGuard();

    if (isLoading) {
        return <AppLoader message="Cargando Tybacha..." />;
    }

    if (isAuthenticated) {
        return <Redirect href={'/(app)/home' as never} />;
    }

    return (
        <>
            <StatusBar style="dark" />
            <Stack
                screenOptions={{
                    headerShown: false,
                    animation: 'fade',
                }}
            >
                <Stack.Screen name="login" />
            </Stack>
        </>
    );
}
