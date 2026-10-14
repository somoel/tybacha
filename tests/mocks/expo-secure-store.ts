/** Doble en memoria para `expo-secure-store` (nativo). */
const storage = new Map<string, string>();

export const AFTER_FIRST_UNLOCK = 1;
export const AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY = 2;
export const WHEN_PASSCODE_SET_THIS_DEVICE_ONLY = 3;
export const ALWAYS = 4;

export async function getItemAsync(key: string): Promise<string | null> {
    return storage.has(key) ? (storage.get(key) as string) : null;
}

export async function setItemAsync(key: string, value: string): Promise<void> {
    storage.set(key, value);
}

export async function deleteItemAsync(key: string): Promise<void> {
    storage.delete(key);
}

export async function hasItemAsync(key: string): Promise<boolean> {
    return storage.has(key);
}

export async function getItemAsyncWithOptions(key: string): Promise<string | null> {
    return getItemAsync(key);
}

/** Solo para tests: limpia todo el almacenamiento. */
export function __resetSecureStore(): void {
    storage.clear();
}

/** Solo para tests: volcado de contenido. */
export function __dumpSecureStore(): Record<string, string> {
    return Object.fromEntries(storage.entries());
}
