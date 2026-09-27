import type { Patient, PatientFormData, SectionedPatients } from '@/src/types/patient.types';
import type { WeeklyExerciseData } from '@/src/services/batteryService';
import { fetchApiPatientsSummary } from '@/src/api/olderAdultsApi';
import {
    createPatient,
    deletePatient,
    fetchPatientById,
    fetchPatientThumbnails,
    fetchPatients,
    updatePatient,
} from '@/src/services/patientService';
import { create } from 'zustand';

/** Cadena de cada recurso del panel (lista, resumen, miniaturas). */
const DASHBOARD_TTL_MS = 60_000;

function isFresh(fetchedAt: number, now: number): boolean {
    return fetchedAt > 0 && now - fetchedAt < DASHBOARD_TTL_MS;
}

interface PatientsState {
    patients: Patient[];
    selectedPatient: Patient | null;
    searchQuery: string;
    isLoading: boolean;
    sectionedPatients: SectionedPatients;
    photoThumbnails: Record<string, string>;
    exerciseData: Record<string, WeeklyExerciseData>;
    batteryCounts: Record<string, number>;
    activePlanMap: Record<string, boolean>;
    totals: { totalAdultos: number; conPlanActivo: number } | null;
    /** Cobertura de la lista cacheada: 'recent' = limit=3, 'all' = lista completa. */
    patientsScope: 'recent' | 'all' | null;
    patientsFetchedAt: number;
    summaryFetchedAt: number;
    thumbnailsFetchedAt: number;
    dashboardFetchedAt: number;

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
    loadDashboard: (options?: { scope?: 'recent' | 'all'; force?: boolean }) => Promise<void>;
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
    batteryCounts: {},
    activePlanMap: {},
    totals: null,
    patientsScope: null,
    patientsFetchedAt: 0,
    summaryFetchedAt: 0,
    thumbnailsFetchedAt: 0,
    dashboardFetchedAt: 0,

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
    /**
     * Carga el panel (lista + resumen + miniaturas) con TTL de 60 s por recurso.
     * - `scope: 'recent'` pide la lista con limit=3; `'all'` pide la lista completa.
     * - Si el caché cubre lo pedido, resuelve sin tocar `isLoading` (navegación instantánea).
     * - `force: true` refresca los tres recursos pase lo que pase.
     */
    loadDashboard: async (options) => {
        const now = Date.now();
        const current = get();
        const scope = options?.scope ?? current.patientsScope ?? 'recent';
        const force = options?.force === true;

        // El caché de home (limit=3) no sirve para /patients: hay que re-pedir aunque esté fresco.
        const scopeRequiresFullList = scope === 'all' && current.patientsScope === 'recent';
        const needPatients = force || scopeRequiresFullList || !isFresh(current.patientsFetchedAt, now);
        const needSummary = force || !isFresh(current.summaryFetchedAt, now);
        const needThumbnails = force || !isFresh(current.thumbnailsFetchedAt, now);

        if (!needPatients && !needSummary && !needThumbnails) {
            return;
        }

        set({ isLoading: true });
        try {
            const [patients, summary, thumbnails] = await Promise.all([
                needPatients
                    ? fetchPatients(scope === 'recent' ? { limit: 3, order: 'recientes' } : {})
                    : Promise.resolve(null),
                needSummary ? fetchApiPatientsSummary() : Promise.resolve(null),
                needThumbnails ? fetchPatientThumbnails() : Promise.resolve(null),
            ]);

            const fetchedAt = Date.now();
            const patch: Partial<PatientsState> = { dashboardFetchedAt: fetchedAt };

            if (patients) {
                patch.patients = patients;
                patch.patientsScope = scope;
                patch.patientsFetchedAt = fetchedAt;
            }

            if (summary) {
                const exerciseData: Record<string, WeeklyExerciseData> = {};
                const batteryCounts: Record<string, number> = {};
                const activePlanMap: Record<string, boolean> = {};

                for (const item of summary.items) {
                    const key = String(item.idAdultoMayor);
                    exerciseData[key] = {
                        todayCompleted: item.todayCompleted,
                        todayTotal: item.todayTotal,
                        weeklyCompliance: item.weeklyCompliance,
                        lastExerciseDate: item.lastExerciseDate,
                    };
                    batteryCounts[key] = item.batteryCount;
                    activePlanMap[key] = item.hasActivePlan;
                }

                patch.exerciseData = exerciseData;
                patch.batteryCounts = batteryCounts;
                patch.activePlanMap = activePlanMap;
                patch.totals = {
                    totalAdultos: summary.totalAdultos,
                    conPlanActivo: summary.conPlanActivo,
                };
                patch.summaryFetchedAt = fetchedAt;
            }

            if (thumbnails) {
                patch.photoThumbnails = thumbnails;
                patch.thumbnailsFetchedAt = fetchedAt;
            }

            set(patch);
        } catch (error) {
            console.error('Error cargando adultos mayores:', error);
        } finally {
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
