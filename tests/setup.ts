import AsyncStorage from '@react-native-async-storage/async-storage';
import { beforeEach, vi } from 'vitest';
import { Platform } from 'react-native';
import { __resetSecureStore } from '@/tests/mocks/expo-secure-store';
import { __resetSqlite } from '@/tests/mocks/expo-sqlite';

// Globales que Expo/React Native inyectan en runtime.
(globalThis as Record<string, unknown>).__DEV__ = true;

/**
 * Estado base idéntico para cada test:
 * - plataforma nativa (ruta SecureStore/SQLite)
 * - almacenamientos vacíos
 * - reloj determinista cuando el test no lo fija
 */
beforeEach(() => {
    Platform.OS = 'ios';
    __resetSecureStore();
    __resetSqlite();
    (AsyncStorage as unknown as { __reset: () => void }).__reset();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
});
