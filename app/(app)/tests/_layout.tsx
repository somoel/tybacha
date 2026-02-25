import { Stack } from 'expo-router';
import { useTheme } from 'react-native-paper';

export default function TestsLayout() {
    const theme = useTheme();
    return (
        <Stack screenOptions={{
            headerStyle: { backgroundColor: theme.colors.surface },
            headerTitleStyle: { fontFamily: 'Montserrat_700Bold', fontSize: 20, color: theme.colors.onSurface },
            headerTintColor: theme.colors.primary,
            headerShadowVisible: false,
        }}>
            <Stack.Screen name="index" options={{ title: 'Pruebas SFT' }} />
            <Stack.Screen name="[testType]/active" options={{ title: 'Prueba Activa' }} />
        </Stack>
    );
}
