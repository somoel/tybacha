import { TybachaTheme } from '@/src/constants/theme';
import { useAuth } from '@/src/hooks/useAuth';
import { useOffline } from '@/src/hooks/useOffline';
import { initDatabase } from '@/src/lib/sqlite';
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
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { PaperProvider } from 'react-native-paper';

// Prevent the splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

/**
 * Root layout: PaperProvider + Montserrat fonts + auth listener + SQLite init.
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

    // Initialize offline detection
    useOffline();

    // Initialize SQLite database
    useEffect(() => {
        initDatabase().catch(console.error);
    }, []);

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
            <StatusBar style="dark" />
            <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="(app)" />
            </Stack>
        </PaperProvider>
    );
}
