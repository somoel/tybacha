import { Stack } from 'expo-router';
import { useTheme } from 'react-native-paper';

/**
 * Cuidadores stack navigator for nested routes.
 */
export default function CaregiversLayout() {
    const theme = useTheme();

    return (
        <Stack
            screenOptions={{
                headerStyle: { backgroundColor: theme.colors.surface },
                headerTitleStyle: {
                    fontFamily: 'Montserrat_700Bold',
                    fontSize: 20,
                    color: theme.colors.onSurface,
                },
                headerTintColor: theme.colors.primary,
                headerShadowVisible: false,
            }}
        >
            <Stack.Screen name="index" options={{ title: 'Cuidadores' }} />
            <Stack.Screen name="new" options={{ title: 'Nuevo cuidador' }} />
            <Stack.Screen name="[id]" options={{ title: 'Detalle cuidador' }} />
        </Stack>
    );
}
