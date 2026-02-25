import { create } from 'zustand';

interface SyncState {
    isOnline: boolean;
    isSyncing: boolean;
    pendingCount: number;

    /** Update network connectivity state */
    setOnline: (online: boolean) => void;
    /** Update syncing state */
    setSyncing: (syncing: boolean) => void;
    /** Update the count of pending sync items */
    setPendingCount: (count: number) => void;
}

/**
 * Sync store – tracks network connectivity and
 * offline sync queue state.
 */
export const useSyncStore = create<SyncState>()((set) => ({
    isOnline: true,
    isSyncing: false,
    pendingCount: 0,

    setOnline: (isOnline) => set({ isOnline }),

    setSyncing: (isSyncing) => set({ isSyncing }),

    setPendingCount: (pendingCount) => set({ pendingCount }),
}));
