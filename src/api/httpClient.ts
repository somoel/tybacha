import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4001';
const ACCESS_TOKEN_KEY = 'tybacha_access_token';
const REFRESH_TOKEN_KEY = 'tybacha_refresh_token';

async function getStoredItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
        return typeof localStorage === 'undefined' ? null : localStorage.getItem(key);
    }
    return SecureStore.getItemAsync(key);
}

async function setStoredItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
        localStorage.setItem(key, value);
        return;
    }
    await SecureStore.setItemAsync(key, value);
}

async function deleteStoredItem(key: string): Promise<void> {
    if (Platform.OS === 'web') {
        localStorage.removeItem(key);
        return;
    }
    await SecureStore.deleteItemAsync(key);
}

export async function setAuthTokens(accessToken: string, refreshToken: string): Promise<void> {
    await Promise.all([
        setStoredItem(ACCESS_TOKEN_KEY, accessToken),
        setStoredItem(REFRESH_TOKEN_KEY, refreshToken),
    ]);
}

export async function clearAuthTokens(): Promise<void> {
    await Promise.all([
        deleteStoredItem(ACCESS_TOKEN_KEY),
        deleteStoredItem(REFRESH_TOKEN_KEY),
    ]);
}

export async function getAccessToken(): Promise<string | null> {
    return getStoredItem(ACCESS_TOKEN_KEY);
}

export async function getRefreshToken(): Promise<string | null> {
    return getStoredItem(REFRESH_TOKEN_KEY);
}

export class ApiError extends Error {
    constructor(
        public readonly status: number,
        message: string,
        public readonly code?: string,
    ) {
        super(message);
    }
}

export async function apiRequest<TResponse>(
    path: string,
    options: RequestInit = {},
): Promise<TResponse> {
    const token = await getAccessToken();
    const headers = new Headers(options.headers);

    if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
        headers.set('Content-Type', 'application/json');
    }

    if (token) {
        headers.set('Authorization', `Bearer ${token}`);
    }

    const response = await fetch(`${API_URL}${path}`, {
        ...options,
        headers,
    });

    const contentType = response.headers.get('content-type') ?? '';
    const payload = contentType.includes('application/json')
        ? await response.json()
        : await response.text();

    if (!response.ok) {
        const message = typeof payload === 'object' && payload && 'message' in payload
            ? String(payload.message)
            : 'Error de comunicacion con el servidor';
        const code = typeof payload === 'object' && payload && 'code' in payload
            ? String(payload.code)
            : undefined;
        throw new ApiError(response.status, message, code);
    }

    return payload as TResponse;
}

