import { AppErrorBoundary, AppErrorScreen } from '@/src/components/ui/AppErrorBoundary';
import { TybachaTheme } from '@/src/constants/theme';
import { useAuth } from '@/src/hooks/useAuth';
import { useNotifications } from '@/src/hooks/useNotifications';
import { useOffline } from '@/src/hooks/useOffline';
import {
    Montserrat_400Regular,
    Montserrat_500Medium,
    Montserrat_600SemiBold,
    Montserrat_700Bold,
    Montserrat_800ExtraBold,
    useFonts,
} from '@expo-google-fonts/montserrat';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { PaperProvider } from 'react-native-paper';
import {
    SafeAreaProvider,
    SafeAreaView,
} from 'react-native-safe-area-context';

// Prevent the splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.addEventListener('error', (event) => {
        console.error('[global]', event.error ?? event.message);
    });
    window.addEventListener('unhandledrejection', (event) => {
        console.error('[unhandledrejection]', event.reason);
    });
}

/**
 * Boundary de rutas: expo-router lo usa cuando una pantalla lanza un error,
 * evitando que toda la app quede en blanco.
 */
export function ErrorBoundary({ error, retry }: { error: Error; retry: () => Promise<void> }) {
    console.error('[route error]', error);
    return <AppErrorScreen error={error} onRetry={() => void retry()} />;
}

/**
 * Root layout: PaperProvider + Montserrat fonts + auth listener.
 */
export default function RootLayout() {
    const [fontsLoaded, fontError] = useFonts({
        Montserrat_400Regular,
        Montserrat_500Medium,
        Montserrat_600SemiBold,
        Montserrat_700Bold,
        Montserrat_800ExtraBold,
    });

    // Initialize auth listener
    useAuth();

    // Initialize notification listeners
    useNotifications();

    // Initialize offline detection
    useOffline();

    // Hide splash screen when fonts are loaded
    useEffect(() => {
        if (fontsLoaded || fontError) {
            SplashScreen.hideAsync();
        }
    }, [fontsLoaded, fontError]);

    if (!fontsLoaded && !fontError) {
        return null;
    }

    return (
        <PaperProvider theme={TybachaTheme}>
            <SafeAreaProvider>
                <SafeAreaView
                    style={{
                        flex: 1,
                        backgroundColor: '#000000',
                    }}
                    edges={['bottom']}
                >
                    <AppErrorBoundary>
                        <Stack screenOptions={{ headerShown: false }}>
                            <Stack.Screen name="index" />
                            <Stack.Screen name="(auth)" />
                            <Stack.Screen name="(app)" />
                        </Stack>
                    </AppErrorBoundary>
                </SafeAreaView>
            </SafeAreaProvider>
        </PaperProvider>
    );
}
