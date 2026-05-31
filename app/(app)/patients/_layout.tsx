import { Stack } from 'expo-router';
import { useTheme } from 'react-native-paper';

/**
 * Adultos mayores stack navigator for nested routes.
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
            <Stack.Screen name="index" options={{ title: 'Adultos mayores' }} />
            <Stack.Screen name="new" options={{ title: 'Nuevo adulto mayor' }} />
            <Stack.Screen name="[id]/index" options={{ title: 'Detalle' }} />
            <Stack.Screen name="[id]/edit" options={{ title: 'Editar adulto mayor' }} />
            <Stack.Screen name="[id]/assign-caregiver" options={{ title: 'Asignar Cuidador' }} />
            <Stack.Screen name="[id]/batteries/index" options={{ title: 'Historial Baterías' }} />
            <Stack.Screen name="[id]/batteries/new" options={{ title: 'Realizar bateria SFT' }} />
            <Stack.Screen name="[id]/batteries/summary" options={{ title: 'Resumen bateria SFT' }} />
            <Stack.Screen name="[id]/batteries/[batteryId]" options={{ title: 'Resultados' }} />
            <Stack.Screen name="[id]/exercise" options={{ headerShown: false, title: 'Plan semanal' }} />
            <Stack.Screen name="[id]/exercise/[exerciseId]/active" options={{ headerShown: false, title: 'Ejercicio' }} />
            <Stack.Screen name="[id]/progress/index" options={{ title: 'Progreso de ejercicios' }} />
            <Stack.Screen name="[id]/consents/index" options={{ title: 'Consentimientos' }} />
            <Stack.Screen name="[id]/consents/new" options={{ title: 'Registrar consentimiento' }} />
            <Stack.Screen name="[id]/medical-history/index" options={{ title: 'Historial médico' }} />
            <Stack.Screen
                name="[id]/medical-history/add-pathology"
                options={{
                    title: 'Agregar patología',
                    presentation: 'formSheet',
                    sheetGrabberVisible: true,
                    sheetAllowedDetents: [0.5, 1.0],
                    contentStyle: { backgroundColor: 'transparent' },
                    headerTransparent: true,
                }}
            />
            <Stack.Screen
                name="[id]/medical-history/add-medication"
                options={{
                    title: 'Agregar medicamento',
                    presentation: 'formSheet',
                    sheetGrabberVisible: true,
                    sheetAllowedDetents: [0.5, 1.0],
                    contentStyle: { backgroundColor: 'transparent' },
                    headerTransparent: true,
                }}
            />
            <Stack.Screen
                name="[id]/medical-history/add-note"
                options={{
                    title: 'Agregar nota médica',
                    presentation: 'formSheet',
                    sheetGrabberVisible: true,
                    sheetAllowedDetents: [0.3, 1.0],
                    contentStyle: { backgroundColor: 'transparent' },
                    headerTransparent: true,
                }}
            />
        </Stack>
    );
}
