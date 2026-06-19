import { Stack, useGlobalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable } from 'react-native';
import { useTheme } from 'react-native-paper';

type NavLike = { canGoBack: () => boolean; goBack: () => void };

/**
 * Adultos mayores stack navigator for nested routes.
 * ponytail: headerLeft con fallback por deep-link directo; canGoBack cubre navegacion normal.
 */
export default function PatientsLayout() {
    const theme = useTheme();
    const router = useRouter();
    const { id } = useGlobalSearchParams<{ id?: string }>();

    const backLeft = (navigation: NavLike, fallback: string) =>
        function BackLeft({ tintColor }: { tintColor?: string }) {
            return (
                <Pressable
                    onPress={() => (navigation.canGoBack() ? navigation.goBack() : router.replace(fallback as never))}
                    hitSlop={8}
                    style={{ paddingHorizontal: 12 }}
                >
                    <MaterialCommunityIcons name="arrow-left" size={26} color={tintColor} />
                </Pressable>
            );
        };

    const detail = id ? `/(app)/patients/${id}` : '/(app)/patients';
    const list = '/(app)/patients';

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
            <Stack.Screen name="new" options={({ navigation }) => ({ title: 'Nuevo adulto mayor', headerLeft: backLeft(navigation, list) })} />
            <Stack.Screen name="[id]/index" options={({ navigation }) => ({ title: 'Detalle', headerLeft: backLeft(navigation, list) })} />
            <Stack.Screen name="[id]/edit" options={({ navigation }) => ({ title: 'Editar adulto mayor', headerLeft: backLeft(navigation, detail) })} />
            <Stack.Screen name="[id]/assign-caregiver" options={({ navigation }) => ({ title: 'Asignar Cuidador', headerLeft: backLeft(navigation, detail) })} />
            <Stack.Screen name="[id]/batteries/index" options={({ navigation }) => ({ title: 'Historial Baterías', headerLeft: backLeft(navigation, detail) })} />
            <Stack.Screen name="[id]/batteries/new" options={({ navigation }) => ({ title: 'Realizar bateria SFT', headerLeft: backLeft(navigation, `${detail}/batteries`) })} />
            <Stack.Screen name="[id]/batteries/summary" options={({ navigation }) => ({ title: 'Resumen bateria SFT', headerLeft: backLeft(navigation, `${detail}/batteries`) })} />
            <Stack.Screen name="[id]/batteries/[batteryId]/index" options={({ navigation }) => ({ title: 'Resultados', headerLeft: backLeft(navigation, `${detail}/batteries`) })} />
            <Stack.Screen name="[id]/exercise" options={{ headerShown: false, title: 'Plan semanal' }} />
            <Stack.Screen name="[id]/exercise/[exerciseId]/active" options={{ headerShown: false, title: 'Ejercicio' }} />
            <Stack.Screen name="[id]/plan/index" options={({ navigation }) => ({ title: 'Plan de ejercicios', headerLeft: backLeft(navigation, detail) })} />
            <Stack.Screen name="[id]/progress/index" options={({ navigation }) => ({ title: 'Plan de ejercicios', headerLeft: backLeft(navigation, detail) })} />
            <Stack.Screen
                name="[id]/progress/edit-plan"
                options={{
                    title: 'Editar plan',
                    presentation: 'formSheet',
                    sheetGrabberVisible: true,
                    sheetAllowedDetents: [0.5, 1.0],
                    contentStyle: { backgroundColor: 'transparent' },
                    headerTransparent: true,
                    headerTintColor: theme.colors.onSurface,
                }}
            />
            <Stack.Screen name="[id]/consents/index" options={({ navigation }) => ({ title: 'Consentimientos', headerLeft: backLeft(navigation, detail) })} />
            <Stack.Screen name="[id]/consents/new" options={({ navigation }) => ({ title: 'Registrar consentimiento', headerLeft: backLeft(navigation, `${detail}/consents`) })} />
            <Stack.Screen name="[id]/alerts/index" options={({ navigation }) => ({ title: 'Alertas', headerLeft: backLeft(navigation, detail) })} />
            <Stack.Screen name="[id]/alerts/new" options={({ navigation }) => ({ title: 'Nueva alerta', headerLeft: backLeft(navigation, `${detail}/alerts`) })} />
            <Stack.Screen name="[id]/assign-caregiver-simple" options={({ navigation }) => ({ title: 'Asignar Cuidador', headerLeft: backLeft(navigation, detail) })} />
            <Stack.Screen name="[id]/medical-history/index" options={({ navigation }) => ({ title: 'Historial médico', headerLeft: backLeft(navigation, detail) })} />
            <Stack.Screen
                name="[id]/medical-history/add-pathology"
                options={{
                    title: 'Agregar patología',
                    presentation: 'formSheet',
                    sheetGrabberVisible: true,
                    sheetAllowedDetents: [0.5, 1.0],
                    contentStyle: { backgroundColor: 'transparent' },
                    headerTransparent: true,
                    headerTintColor: theme.colors.onSurface,
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
                    headerTintColor: theme.colors.onSurface,
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
                    headerTintColor: theme.colors.onSurface,
                }}
            />
        </Stack>
    );
}
