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
import { PaperProvider } from 'react-native-paper';
import {
    SafeAreaProvider,
    SafeAreaView,
} from 'react-native-safe-area-context';

// Prevent the splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

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
                    <Stack screenOptions={{ headerShown: false }}>
                        <Stack.Screen name="index" />
                        <Stack.Screen name="(auth)" />
                        <Stack.Screen name="(app)" />
                    </Stack>
                </SafeAreaView>
            </SafeAreaProvider>
        </PaperProvider>
    );
}
