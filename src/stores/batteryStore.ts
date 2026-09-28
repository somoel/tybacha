import { generateUUID } from '@/src/lib/sqlite';
import { useAuthStore } from '@/src/stores/authStore';
import type { SFTTestType } from '@/src/types/battery.types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

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
    ownerUserId: string | null;

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
    /** Reset the battery state for a new session */
    resetBattery: () => void;
    /** Set loading state */
    setLoading: (loading: boolean) => void;
}

type PersistedBatteryState = Pick<
    BatteryState,
    | 'activeBatteryId'
    | 'patientId'
    | 'results'
    | 'resultNotes'
    | 'completedTests'
    | 'notes'
    | 'pesoKg'
    | 'estaturaCm'
    | 'imc'
    | 'ownerUserId'
>;

/**
 * Battery store – tracks the active SFT battery session.
 * Results are accumulated as each test is completed,
 * then persisted through the TiDB API.
 *
 * La sesión se persiste en AsyncStorage (localStorage en web) para
 * sobrevivir recargas de página y reinicios de app; se limpia al
 * cerrar sesión.
 */
export const useBatteryStore = create<BatteryState>()(
    persist(
        (set) => ({
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
            ownerUserId: null,

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
                    ownerUserId: useAuthStore.getState().user?.id ?? null,
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
                    ownerUserId: null,
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
                    ownerUserId: null,
                }),

            setLoading: (isLoading) => set({ isLoading }),
        }),
        {
            name: 'tybacha-battery-session',
            storage: createJSONStorage(() => AsyncStorage),
            partialize: (state): PersistedBatteryState => ({
                activeBatteryId: state.activeBatteryId,
                patientId: state.patientId,
                results: state.results,
                resultNotes: state.resultNotes,
                completedTests: state.completedTests,
                notes: state.notes,
                pesoKg: state.pesoKg,
                estaturaCm: state.estaturaCm,
                imc: state.imc,
                ownerUserId: state.ownerUserId,
            }),
        }
    )
);
