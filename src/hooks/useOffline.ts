import { useSyncStore } from '@/src/stores/syncStore';
import * as Network from 'expo-network';
import { useEffect } from 'react';

/**
 * Hook that monitors network connectivity state.
 * Updates the sync store when connectivity changes.
 * Should be called once in the root layout.
 */
export function useOffline() {
    const { isOnline, setOnline } = useSyncStore();

    useEffect(() => {
        // Check initial state
        const checkInitial = async () => {
            try {
                const state = await Network.getNetworkStateAsync();
                setOnline(state.isConnected ?? true);
            } catch {
                setOnline(true); // Assume online if we can't check
            }
        };

        checkInitial();

        // Listen for changes
        const subscription = Network.addNetworkStateListener((state) => {
            setOnline(state.isConnected ?? true);
        });

        return () => {
            subscription.remove();
        };
    }, [setOnline]);

    return { isOnline };
}
