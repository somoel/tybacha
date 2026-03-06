import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

/**
 * Auth layout group - no header, screens stack on top of each other.
 */
export default function AuthLayout() {
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
