import { generateUUID } from '@/src/lib/sqlite';
import { createBattery, saveBatteryResults } from '@/src/services/batteryService';
import type { SFTTestType } from '@/src/types/battery.types';
import { create } from 'zustand';

interface BatteryState {
    activeBatteryId: string | null;
    patientId: string | null;
    results: Partial<Record<SFTTestType, number>>;
    resultNotes: Partial<Record<SFTTestType, string>>;
    completedTests: SFTTestType[];
    notes: string;
    pesoKg: number | null;
    estaturaCm: number | null;
    imc: number | null;
    isLoading: boolean;

    /** Start a new battery session for a patient */
    startBattery: (patientId: string) => void;
    /** Save a single test result into the active battery */
    saveResult: (testType: SFTTestType, value: number, notes?: string) => void;
    /** Set general observation notes for the battery */
    setNotes: (notes: string) => void;
    /** Set body metrics (weight, height) and auto-calculate BMI */
    setBodyMetrics: (pesoKg: number, estaturaCm: number) => void;
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
    resultNotes: {},
    completedTests: [],
    notes: '',
    pesoKg: null,
    estaturaCm: null,
    imc: null,
    isLoading: false,

    startBattery: (patientId) =>
        set({
            activeBatteryId: generateUUID(),
            patientId,
            results: {},
            resultNotes: {},
            completedTests: [],
            notes: '',
            pesoKg: null,
            estaturaCm: null,
            imc: null,
            isLoading: false,
        }),

    saveResult: (testType, value, note) =>
        set((state) => ({
            results: { ...state.results, [testType]: value },
            resultNotes: note !== undefined
                ? { ...state.resultNotes, [testType]: note }
                : state.resultNotes,
            completedTests: state.completedTests.includes(testType)
                ? state.completedTests
                : [...state.completedTests, testType],
        })),

    setNotes: (notes) => set({ notes }),

    setBodyMetrics: (pesoKg, estaturaCm) => {
        const estaturaM = estaturaCm / 100;
        const imc = Number((pesoKg / (estaturaM * estaturaM)).toFixed(2));
        set({ pesoKg, estaturaCm, imc });
    },

    clearSession: () =>
        set({
            activeBatteryId: null,
            patientId: null,
            results: {},
            resultNotes: {},
            completedTests: [],
            notes: '',
            pesoKg: null,
            estaturaCm: null,
            imc: null,
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
                state.notes || undefined,
                true,
                state.pesoKg ?? undefined,
                state.estaturaCm ?? undefined,
                state.imc ?? undefined,
            );
            await saveBatteryResults(battery.id, state.results, state.resultNotes, true);
        } catch (error) {
            throw error;
        }
    },

    setFinalized: () =>
        set({
            activeBatteryId: null,
            patientId: null,
            results: {},
            resultNotes: {},
            completedTests: [],
            notes: '',
            pesoKg: null,
            estaturaCm: null,
            imc: null,
        }),

    resetBattery: () =>
        set({
            activeBatteryId: null,
            patientId: null,
            results: {},
            resultNotes: {},
            completedTests: [],
            notes: '',
            pesoKg: null,
            estaturaCm: null,
            imc: null,
            isLoading: false,
        }),

    setLoading: (isLoading) => set({ isLoading }),
}));
