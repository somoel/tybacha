/** Doble en memoria para `@react-native-async-storage/async-storage`. */
const storage = new Map<string, string>();

const AsyncStorage = {
    async getItem(key: string): Promise<string | null> {
        return storage.has(key) ? (storage.get(key) as string) : null;
    },
    async setItem(key: string, value: string): Promise<void> {
        storage.set(key, value);
    },
    async removeItem(key: string): Promise<void> {
        storage.delete(key);
    },
    async clear(): Promise<void> {
        storage.clear();
    },
    async getAllKeys(): Promise<string[]> {
        return [...storage.keys()];
    },
    async multiGet(keys: string[]): Promise<[string, string | null][]> {
        return keys.map((key) => [key, storage.has(key) ? (storage.get(key) as string) : null]);
    },
    async multiSet(entries: [string, string][]): Promise<void> {
        for (const [key, value] of entries) storage.set(key, value);
    },
    async multiRemove(keys: string[]): Promise<void> {
        for (const key of keys) storage.delete(key);
    },

    /** Solo para tests. */
    __reset(): void {
        storage.clear();
    },
    /** Solo para tests. */
    __dump(): Record<string, string> {
        return Object.fromEntries(storage.entries());
    },
};

export default AsyncStorage;
