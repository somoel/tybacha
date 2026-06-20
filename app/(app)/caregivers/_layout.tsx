import { Stack, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable } from 'react-native';
import { useTheme } from 'react-native-paper';

type NavLike = { canGoBack: () => boolean; goBack: () => void; getState: () => { index: number } };

/**
 * Cuidadores stack navigator for nested routes.
 * ponytail: headerLeft con fallback por deep-link directo; canGoBack cubre navegacion normal.
 */
export default function CaregiversLayout() {
    const theme = useTheme();
    const router = useRouter();
    const list = '/(app)/caregivers';

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
            <Stack.Screen name="new" options={({ navigation }) => ({ title: 'Nuevo cuidador', headerLeft: backLeft(navigation, list) })} />
            <Stack.Screen name="[id]" options={({ navigation }) => ({ title: 'Detalle cuidador', headerLeft: backLeft(navigation, list) })} />
        </Stack>
    );
}
