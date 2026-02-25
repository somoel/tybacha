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
export const useBatteryStore = create<BatteryState>()((set) => ({
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
