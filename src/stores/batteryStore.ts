import { generateUUID } from '@/src/lib/sqlite';
import { createBattery, saveBatteryResults } from '@/src/services/batteryService';
import type { SFTTestType } from '@/src/types/battery.types';
import { create } from 'zustand';

interface BatteryState {
    activeBatteryId: string | null;
    patientId: string | null;
    results: Partial<Record<SFTTestType, number>>;
    completedTests: SFTTestType[];
    isLoading: boolean;

    /** Start a new battery session for a patient */
    startBattery: (patientId: string) => void;
    /** Save a single test result into the active battery */
    saveResult: (testType: SFTTestType, value: number) => void;
    /** Clear a finalized session without treating it as an abandoned battery */
    clearSession: () => void;
    /** Mark battery as complete (triggers persistence via service) */
    finalizeBattery: () => Promise<void>;
    /** Clear the active session after persistence */
    setFinalized: () => void;
    /** Reset the battery state for a new session */
    resetBattery: () => void;
    /** Set loading state */
    setLoading: (loading: boolean) => void;
}

/**
 * Battery store – tracks the active SFT battery session.
 * Results are accumulated as each test is completed,
 * then persisted through the TiDB API.
 */
export const useBatteryStore = create<BatteryState>()((set, get) => ({
    activeBatteryId: null,
    patientId: null,
    results: {},
    completedTests: [],
    isLoading: false,

    startBattery: (patientId) =>
        set({
            activeBatteryId: generateUUID(),
            patientId,
            results: {},
            completedTests: [],
            isLoading: false,
        }),

    saveResult: (testType, value) =>
        set((state) => ({
            results: { ...state.results, [testType]: value },
            completedTests: state.completedTests.includes(testType)
                ? state.completedTests
                : [...state.completedTests, testType],
        })),

    clearSession: () =>
        set({
            activeBatteryId: null,
            patientId: null,
            results: {},
            completedTests: [],
            isLoading: false,
        }),

    finalizeBattery: async () => {
        const state = get();
        
        if (!state.patientId || Object.keys(state.results).length === 0) {
            return;
        }

        try {
            const { user } = await import('@/src/stores/authStore').then(m => m.useAuthStore.getState());

            const battery = await createBattery(
                state.patientId,
                user?.id || 'unknown',
                'Bateria SFT completada',
                true,
            );
            await saveBatteryResults(battery.id, state.results, true);
        } catch (error) {
            throw error;
        }
    },

    setFinalized: () =>
        set({
            activeBatteryId: null,
            patientId: null,
            results: {},
            completedTests: [],
        }),

    resetBattery: () =>
        set({
            activeBatteryId: null,
            patientId: null,
            results: {},
            completedTests: [],
            isLoading: false,
        }),

    setLoading: (isLoading) => set({ isLoading }),
}));
