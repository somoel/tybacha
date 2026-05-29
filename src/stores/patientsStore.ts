import type { Patient, PatientFormData, SectionedPatients } from '@/src/types/patient.types';
import type { WeeklyExerciseData } from '@/src/services/batteryService';
import {
    createPatient,
    deletePatient,
    fetchPatientById,
    fetchPatients,
    updatePatient,
} from '@/src/services/patientService';
import { create } from 'zustand';

interface PatientsState {
    patients: Patient[];
    selectedPatient: Patient | null;
    searchQuery: string;
    isLoading: boolean;
    sectionedPatients: SectionedPatients;
    photoThumbnails: Record<string, string>;
    exerciseData: Record<string, WeeklyExerciseData>;

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
    /** Set sectioned patients */
    setSectionedPatients: (sectioned: SectionedPatients) => void;
    /** Set photo thumbnails map */
    setPhotoThumbnails: (thumbnails: Record<string, string>) => void;
    /** Set exercise data map (today status + weekly compliance) */
    setExerciseData: (data: Record<string, WeeklyExerciseData>) => void;

    /** Async operations */
    loadPatients: (userId: string, userRole: string) => Promise<void>;
    createPatient: (patientData: PatientFormData, createdBy: string) => Promise<boolean>;
    updatePatientData: (patientId: string, patientData: Partial<PatientFormData>) => Promise<boolean>;
    deletePatientData: (patientId: string) => Promise<boolean>;
    loadPatientDetails: (patientId: string) => Promise<void>;
    searchPatients: (query: string) => Promise<void>;
}

/**
 * Patients state store.
 * Manages patient list, selection, and search filtering.
 */
export const usePatientsStore = create<PatientsState>()((set, get) => ({
    patients: [],
    selectedPatient: null,
    searchQuery: '',
    isLoading: false,
    sectionedPatients: { noBatteries: [], pendingRecommendation: [], inProgress: [] },
    photoThumbnails: {},
    exerciseData: {},

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

    setSectionedPatients: (sectionedPatients) => set({ sectionedPatients }),

    setPhotoThumbnails: (photoThumbnails) => set({ photoThumbnails }),

    setExerciseData: (exerciseData) => set({ exerciseData }),

    // Async operations
    loadPatients: async (userId: string, userRole: string) => {
        set({ isLoading: true });
        try {
            const patients = await fetchPatients(userId, userRole);
            set({ patients, isLoading: false });
        } catch (error) {
            console.error('Error loading patients:', error);
            set({ isLoading: false });
        }
    },

    createPatient: async (patientData: PatientFormData, createdBy: string) => {
        set({ isLoading: true });
        try {
            const newPatient = await createPatient(patientData, createdBy);
            if (newPatient) {
                set((state) => ({ 
                    patients: [newPatient, ...state.patients],
                    isLoading: false 
                }));
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error creating patient:', error);
            set({ isLoading: false });
            return false;
        }
    },

    updatePatientData: async (patientId: string, patientData: Partial<PatientFormData>) => {
        set({ isLoading: true });
        try {
            const current = get().patients.find((patient) => patient.id === patientId);
            if (!current) {
                set({ isLoading: false });
                return false;
            }
            const updatedPatient = await updatePatient(patientId, {
                first_name: patientData.first_name ?? current.first_name,
                second_name: patientData.second_name ?? current.second_name,
                first_lastname: patientData.first_lastname ?? current.first_lastname,
                second_lastname: patientData.second_lastname ?? current.second_lastname,
                birth_date: patientData.birth_date ?? new Date(current.birth_date),
                gender: patientData.gender ?? current.gender,
                pathologies: patientData.pathologies ?? current.pathologies,
                id_cuidador: patientData.id_cuidador ?? current.id_cuidador,
            });
            get().updatePatient(updatedPatient);
            set({ isLoading: false });
            return true;
        } catch (error) {
            console.error('Error updating patient:', error);
            set({ isLoading: false });
            return false;
        }
    },

    deletePatientData: async (patientId: string) => {
        set({ isLoading: true });
        try {
            await deletePatient(patientId);
            get().removePatient(patientId);
            set({ isLoading: false });
            return true;
        } catch (error) {
            console.error('Error deleting patient:', error);
            set({ isLoading: false });
            return false;
        }
    },

    loadPatientDetails: async (patientId: string) => {
        set({ isLoading: true });
        try {
            const patientDetails = await fetchPatientById(patientId);
            if (patientDetails) {
                set({ 
                    selectedPatient: patientDetails, 
                    isLoading: false 
                });
            }
        } catch (error) {
            console.error('Error loading patient details:', error);
            set({ isLoading: false });
        }
    },

    searchPatients: async (query: string) => {
        set({ isLoading: true, searchQuery: query });
        try {
            const normalized = query.toLowerCase();
            const searchResults = get().patients.filter((patient) => {
                const fullName = `${patient.first_name} ${patient.second_name ?? ''} ${patient.first_lastname} ${patient.second_lastname ?? ''}`.toLowerCase();
                return fullName.includes(normalized);
            });
            set({ 
                patients: searchResults, 
                isLoading: false 
            });
        } catch (error) {
            console.error('Error searching patients:', error);
            set({ isLoading: false });
        }
    },
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
