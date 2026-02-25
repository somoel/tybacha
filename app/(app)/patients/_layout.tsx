import { Stack } from 'expo-router';
import { useTheme } from 'react-native-paper';

/**
 * Patients stack navigator for nested routes.
 */
export default function PatientsLayout() {
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
            <Stack.Screen name="index" options={{ title: 'Pacientes' }} />
            <Stack.Screen name="new" options={{ title: 'Nuevo Paciente' }} />
            <Stack.Screen name="[id]/index" options={{ title: 'Detalle' }} />
            <Stack.Screen name="[id]/edit" options={{ title: 'Editar Paciente' }} />
            <Stack.Screen name="[id]/assign-caregiver" options={{ title: 'Asignar Cuidador' }} />
            <Stack.Screen name="[id]/batteries/index" options={{ title: 'Historial Baterías' }} />
            <Stack.Screen name="[id]/batteries/new" options={{ title: 'Nueva Batería SFT' }} />
            <Stack.Screen name="[id]/batteries/[batteryId]" options={{ title: 'Resultados' }} />
        </Stack>
    );
}
