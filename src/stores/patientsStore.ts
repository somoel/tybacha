import type { Patient, SectionedPatients } from '@/src/types/patient.types';
import { create } from 'zustand';

interface PatientsState {
    patients: Patient[];
    selectedPatient: Patient | null;
    searchQuery: string;
    isLoading: boolean;

    /** Replace the entire patients list */
    setPatients: (patients: Patient[]) => void;
    /** Add a single patient to the list */
    addPatient: (patient: Patient) => void;
    /** Update a patient in the list */
    updatePatient: (patient: Patient) => void;
    /** Remove a patient from the list */
    removePatient: (id: string) => void;
    /** Set the currently selected patient */
    setSelectedPatient: (patient: Patient | null) => void;
    /** Set the search query filter */
    setSearchQuery: (query: string) => void;
    /** Set loading state */
    setLoading: (loading: boolean) => void;
}

/**
 * Patients state store.
 * Manages patient list, selection, and search filtering.
 */
export const usePatientsStore = create<PatientsState>()((set) => ({
    patients: [],
    selectedPatient: null,
    searchQuery: '',
    isLoading: false,

    setPatients: (patients) => set({ patients }),

    addPatient: (patient) =>
        set((state) => ({ patients: [patient, ...state.patients] })),

    updatePatient: (patient) =>
        set((state) => ({
            patients: state.patients.map((p) => (p.id === patient.id ? patient : p)),
            selectedPatient:
                state.selectedPatient?.id === patient.id ? patient : state.selectedPatient,
        })),

    removePatient: (id) =>
        set((state) => ({
            patients: state.patients.filter((p) => p.id !== id),
            selectedPatient: state.selectedPatient?.id === id ? null : state.selectedPatient,
        })),

    setSelectedPatient: (patient) => set({ selectedPatient: patient }),

    setSearchQuery: (searchQuery) => set({ searchQuery }),

    setLoading: (isLoading) => set({ isLoading }),
}));

/**
 * Selector that returns patients sectioned by status (RF-10).
 * Must be called with battery/plan metadata already enriched on patients.
 */
export function getSectionedPatients(
    patients: Patient[],
    patientBatteryCounts: Record<string, number>,
    patientActivePlans: Record<string, boolean>
): SectionedPatients {
    const noBatteries: Patient[] = [];
    const pendingRecommendation: Patient[] = [];
    const inProgress: Patient[] = [];

    for (const patient of patients) {
        const batteryCount = patientBatteryCounts[patient.id] ?? 0;
        const hasActivePlan = patientActivePlans[patient.id] ?? false;

        if (batteryCount === 0) {
            noBatteries.push(patient);
        } else if (!hasActivePlan) {
            pendingRecommendation.push(patient);
        } else {
            inProgress.push(patient);
        }
    }

    return { noBatteries, pendingRecommendation, inProgress };
}
