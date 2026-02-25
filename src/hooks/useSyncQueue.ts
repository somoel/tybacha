import { getPendingCount, syncPendingItems } from '@/src/services/syncService';
import { useSyncStore } from '@/src/stores/syncStore';
import { useCallback, useEffect } from 'react';

/**
 * Hook that manages the offline sync queue.
 * Automatically syncs when connectivity is restored.
 * Returns sync state and manual sync trigger.
 */
export function useSyncQueue() {
    const { isOnline, isSyncing, pendingCount, setSyncing, setPendingCount } = useSyncStore();

    const syncNow = useCallback(async (): Promise<{ synced: number; error?: string }> => {
        if (isSyncing || !isOnline) {
            return { synced: 0 };
        }

        setSyncing(true);
        try {
            const synced = await syncPendingItems();
            const remaining = await getPendingCount();
            setPendingCount(remaining);
            return { synced };
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : 'Error al sincronizar datos.';
            return { synced: 0, error: message };
        } finally {
            setSyncing(false);
        }
    }, [isOnline, isSyncing, setSyncing, setPendingCount]);

    // Auto-sync when coming back online
    useEffect(() => {
        if (isOnline && pendingCount > 0) {
            syncNow();
        }
    }, [isOnline, pendingCount, syncNow]);

    // Periodically check pending count
    useEffect(() => {
        const checkPending = async () => {
            const count = await getPendingCount();
            setPendingCount(count);
        };

        checkPending();
        const interval = setInterval(checkPending, 30000); // Every 30s

        return () => clearInterval(interval);
    }, [setPendingCount]);

    return { isOnline, isSyncing, pendingCount, syncNow };
}
