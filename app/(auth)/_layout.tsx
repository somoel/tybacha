import { AppLoader } from '@/src/components/ui/AppLoader';
import { GlobalSnackbar } from '@/src/components/ui/GlobalSnackbar';
import { useAuthGuard } from '@/src/hooks/useAuthGuard';
import { Redirect, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { StyleSheet, View } from 'react-native';

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
        <View style={styles.container}>
            <StatusBar style="dark" />
            <Stack
                screenOptions={{
                    headerShown: false,
                    animation: 'fade',
                }}
            >
                <Stack.Screen name="login" />
            </Stack>
            <GlobalSnackbar bottomOffset={0} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});
