import { Stack } from 'expo-router';
import { useTheme } from 'react-native-paper';

export default function ExerciseLayout() {
    const theme = useTheme();
    return (
        <Stack screenOptions={{
            headerStyle: { backgroundColor: theme.colors.surface },
            headerTitleStyle: { fontFamily: 'Montserrat_700Bold', fontSize: 20, color: theme.colors.onSurface },
            headerTintColor: theme.colors.primary,
            headerShadowVisible: false,
        }}>
            <Stack.Screen name="index" options={{ title: 'Plan semanal' }} />
            <Stack.Screen name="[exerciseId]/active" options={{ title: 'Ejercicio de hoy' }} />
            <Stack.Screen name="[exerciseId]/detail" options={{ title: 'Detalle del ejercicio' }} />
        </Stack>
    );
}
