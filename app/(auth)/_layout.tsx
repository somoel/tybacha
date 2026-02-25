import { Stack } from 'expo-router';

/**
 * Auth layout group - no header, screens stack on top of each other.
 */
export default function AuthLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false,
                animation: 'fade',
            }}
        >
            <Stack.Screen name="login" />
        </Stack>
    );
}
