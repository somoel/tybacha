import { describe, expect, it } from 'vitest';
import { useSyncStore } from '@/src/stores/syncStore';

const store = () => useSyncStore.getState();

describe('syncStore', () => {
    it('arranca online, sin sincronización y sin pendientes', () => {
        expect(store().isOnline).toBe(true);
        expect(store().isSyncing).toBe(false);
        expect(store().pendingCount).toBe(0);
    });

    it('setOnline alterna la conectividad', () => {
        store().setOnline(false);
        expect(store().isOnline).toBe(false);
        store().setOnline(true);
        expect(store().isOnline).toBe(true);
    });

    it('setSyncing marca la sincronización en curso', () => {
        store().setSyncing(true);
        expect(store().isSyncing).toBe(true);
        store().setSyncing(false);
        expect(store().isSyncing).toBe(false);
    });

    it('setPendingCount guarda el contador', () => {
        store().setPendingCount(12);
        expect(store().pendingCount).toBe(12);
        store().setPendingCount(0);
        expect(store().pendingCount).toBe(0);
    });
});
