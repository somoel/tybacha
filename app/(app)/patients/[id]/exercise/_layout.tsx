import { Stack, useGlobalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable } from 'react-native';
import { useTheme } from 'react-native-paper';

type NavLike = { canGoBack: () => boolean; goBack: () => void; getState: () => { index: number } };

/**
 * ponytail: headerLeft con fallback por deep-link directo; canGoBack cubre navegacion normal.
 * [exerciseId]/active excluido: su headerRight close ya hace router.replace al detalle del paciente.
 */
export default function ExerciseLayout() {
    const theme = useTheme();
    const router = useRouter();
    const { id } = useGlobalSearchParams<{ id?: string }>();

    const detail = id ? `/(app)/patients/${id}` : '/(app)/patients';
    const plan = `${detail}/exercise`;

    const backLeft = (navigation: NavLike, fallback: string) =>
        function BackLeft({ tintColor }: { tintColor?: string }) {
            return (
                <Pressable
                    onPress={() => (navigation.getState().index > 0 ? navigation.goBack() : router.replace(fallback as never))}
                    hitSlop={8}
                    style={{ paddingHorizontal: 12 }}
                >
                    <MaterialCommunityIcons name="arrow-left" size={26} color={tintColor} />
                </Pressable>
            );
        };

    return (
        <Stack screenOptions={{
            headerStyle: { backgroundColor: theme.colors.surface },
            headerTitleStyle: { fontFamily: 'Montserrat_700Bold', fontSize: 20, color: theme.colors.onSurface },
            headerTintColor: theme.colors.primary,
            headerShadowVisible: false,
        }}>
            <Stack.Screen name="index" options={({ navigation }) => ({ title: 'Plan semanal', headerLeft: backLeft(navigation, detail) })} />
            <Stack.Screen name="[exerciseId]/active" options={{ title: 'Ejercicio de hoy' }} />
            <Stack.Screen name="[exerciseId]/detail" options={({ navigation }) => ({ title: 'Detalle del ejercicio', headerLeft: backLeft(navigation, plan) })} />
        </Stack>
    );
}
