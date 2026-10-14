/**
 * Doble de prueba para `react-native`.
 * Solo se necesita la parte de la API que el codigo de logica (no UI) usa:
 * `Platform`, `StyleSheet` y `Dimensions`.
 */
export type PlatformOSType = 'ios' | 'android' | 'web' | 'windows' | 'macos';

interface PlatformStatic {
    OS: PlatformOSType;
    select: <T>(specifics: Partial<Record<PlatformOSType | 'default' | 'native', T>>) => T | undefined;
}

export const Platform: PlatformStatic = {
    OS: 'ios',
    select(specifics) {
        if (Platform.OS in specifics) {
            return specifics[Platform.OS];
        }
        if ('native' in specifics && Platform.OS !== 'web') {
            return specifics.native;
        }
        return specifics.default;
    },
};

export const StyleSheet = {
    create: <T extends Record<string, unknown>>(styles: T): T => styles,
    flatten: (style: unknown): unknown => style,
    hairlineWidth: 1,
    absoluteFillObject: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 } as const,
};

export const Dimensions = {
    get: (_window?: string) => ({ width: 390, height: 844, scale: 3, fontScale: 1 }),
};

export const PlatformColor = (..._names: unknown[]): string => '#000000';

// Componentes genericos: permiten importar modulos que solo declaran tipos de UI.
const passthroughComponent = (name: string) => name;

export const View = 'View';
export const Text = 'Text';
export const Pressable = 'Pressable';
export const TouchableOpacity = 'TouchableOpacity';
export const ScrollView = 'ScrollView';
export const TextInput = 'TextInput';
export const SectionList = 'SectionList';
export const FlatList = 'FlatList';
export const ActivityIndicator = 'ActivityIndicator';
export const Modal = 'Modal';
export const Animated = { Value: class {}, View: passthroughComponent('Animated.View') };

export default {
    Platform,
    StyleSheet,
    Dimensions,
    View,
    Text,
};
