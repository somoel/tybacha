import { generateUUID } from '@/src/lib/sqlite';
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
    /** Mark battery as complete (triggers persistence via service) */
    setFinalized: () => void;
    /** Reset the battery state for a new session */
    resetBattery: () => void;
    /** Set loading state */
    setLoading: (loading: boolean) => void;
}

/**
 * Battery store – tracks the active SFT battery session.
 * Results are accumulated as each test is completed,
 * then persisted to Supabase/SQLite via batteryService.finalizeBattery().
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

    finalizeBattery: async () => {
        const state = get();
        
        if (!state.patientId || Object.keys(state.results).length === 0) {
            return;
        }

        try {
            // Import here to avoid circular dependency
            const { batteryServiceMySQL } = await import('@/src/services/batteryServiceMySQL');
            const { user } = await import('@/src/stores/authStore').then(m => m.useAuthStore.getState());
            
            // Always create a new battery since we need to ensure it exists
            const battery = await batteryServiceMySQL.createBattery(
                state.patientId,
                user?.id || 'unknown',
                'Batería SFT completada'
            );
            const batteryId = battery.id;
            
            // Save each result to the database
            for (const [testType, value] of Object.entries(state.results)) {
                await batteryServiceMySQL.addSFTResult(
                    batteryId,
                    testType,
                    value.toString()
                );
            }
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
