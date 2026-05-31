import {
  createMedicalNote,
  createMedication,
  createPathology,
  deleteMedicalNote,
  deleteMedication,
  deletePathology,
  fetchMedicalNotes,
  fetchMedications,
  fetchPathologies,
  updateMedicalNote,
  updateMedication,
  updatePathology,
} from '@/src/services/medicalHistoryService';
import type { MedicalNote, MedicalNoteFormData, Medication, MedicationFormData, Pathology, PathologyFormData } from '@/src/types/medicalHistory.types';
import { create } from 'zustand';

interface MedicalHistoryState {
  pathologies: Pathology[];
  medications: Medication[];
  medicalNotes: MedicalNote[];
  isLoading: boolean;
  olderAdultId: string | null;

  loadAll: (olderAdultId: number) => Promise<void>;
  addPathology: (olderAdultId: number, formData: PathologyFormData) => Promise<Pathology | null>;
  updatePathology: (olderAdultId: number, pathologyId: number, formData: Partial<PathologyFormData>) => Promise<boolean>;
  removePathology: (olderAdultId: number, pathologyId: number) => Promise<boolean>;
  addMedication: (olderAdultId: number, formData: MedicationFormData) => Promise<Medication | null>;
  updateMedication: (olderAdultId: number, medicationId: number, formData: Partial<MedicationFormData>) => Promise<boolean>;
  removeMedication: (olderAdultId: number, medicationId: number) => Promise<boolean>;
  addMedicalNote: (olderAdultId: number, formData: MedicalNoteFormData) => Promise<MedicalNote | null>;
  updateMedicalNote: (olderAdultId: number, noteId: number, formData: Partial<MedicalNoteFormData>) => Promise<boolean>;
  removeMedicalNote: (olderAdultId: number, noteId: number) => Promise<boolean>;
}

export const useMedicalHistoryStore = create<MedicalHistoryState>()((set, get) => ({
  pathologies: [],
  medications: [],
  medicalNotes: [],
  isLoading: false,
  olderAdultId: null,

  loadAll: async (olderAdultId: number) => {
    set({ isLoading: true, olderAdultId: String(olderAdultId) });
    try {
      const [pathologies, medications, medicalNotes] = await Promise.all([
        fetchPathologies(olderAdultId),
        fetchMedications(olderAdultId),
        fetchMedicalNotes(olderAdultId),
      ]);
      set({ pathologies, medications, medicalNotes, isLoading: false });
    } catch (error) {
      console.error('Error loading medical history:', error);
      set({ isLoading: false });
    }
  },

  addPathology: async (olderAdultId: number, formData: PathologyFormData) => {
    try {
      const pathology = await createPathology(olderAdultId, formData);
      set((state) => ({ pathologies: [pathology, ...state.pathologies] }));
      return pathology;
    } catch (error) {
      console.error('Error creating pathology:', error);
      return null;
    }
  },

  updatePathology: async (olderAdultId: number, pathologyId: number, formData: Partial<PathologyFormData>) => {
    try {
      await updatePathology(olderAdultId, pathologyId, formData);
      set((state) => ({
        pathologies: state.pathologies.map((p) =>
          p.id === String(pathologyId) ? { ...p, ...formData } : p,
        ),
      }));
      return true;
    } catch (error) {
      console.error('Error updating pathology:', error);
      return false;
    }
  },

  removePathology: async (olderAdultId: number, pathologyId: number) => {
    try {
      await deletePathology(olderAdultId, pathologyId);
      set((state) => ({
        pathologies: state.pathologies.filter((p) => p.id !== String(pathologyId)),
      }));
      return true;
    } catch (error) {
      console.error('Error deleting pathology:', error);
      return false;
    }
  },

  addMedication: async (olderAdultId: number, formData: MedicationFormData) => {
    try {
      const medication = await createMedication(olderAdultId, formData);
      set((state) => ({ medications: [medication, ...state.medications] }));
      return medication;
    } catch (error) {
      console.error('Error creating medication:', error);
      return null;
    }
  },

  updateMedication: async (olderAdultId: number, medicationId: number, formData: Partial<MedicationFormData>) => {
    try {
      await updateMedication(olderAdultId, medicationId, formData);
      set((state) => ({
        medications: state.medications.map((m) =>
          m.id === String(medicationId) ? { ...m, ...formData } : m,
        ),
      }));
      return true;
    } catch (error) {
      console.error('Error updating medication:', error);
      return false;
    }
  },

  removeMedication: async (olderAdultId: number, medicationId: number) => {
    try {
      await deleteMedication(olderAdultId, medicationId);
      set((state) => ({
        medications: state.medications.filter((m) => m.id !== String(medicationId)),
      }));
      return true;
    } catch (error) {
      console.error('Error deleting medication:', error);
      return false;
    }
  },

  addMedicalNote: async (olderAdultId: number, formData: MedicalNoteFormData) => {
    try {
      const note = await createMedicalNote(olderAdultId, formData);
      set((state) => ({ medicalNotes: [note, ...state.medicalNotes] }));
      return note;
    } catch (error) {
      console.error('Error creating medical note:', error);
      return null;
    }
  },

  updateMedicalNote: async (olderAdultId: number, noteId: number, formData: Partial<MedicalNoteFormData>) => {
    try {
      await updateMedicalNote(olderAdultId, noteId, formData);
      set((state) => ({
        medicalNotes: state.medicalNotes.map((n) =>
          n.id === String(noteId) ? { ...n, ...formData } : n,
        ),
      }));
      return true;
    } catch (error) {
      console.error('Error updating medical note:', error);
      return false;
    }
  },

  removeMedicalNote: async (olderAdultId: number, noteId: number) => {
    try {
      await deleteMedicalNote(olderAdultId, noteId);
      set((state) => ({
        medicalNotes: state.medicalNotes.filter((n) => n.id !== String(noteId)),
      }));
      return true;
    } catch (error) {
      console.error('Error deleting medical note:', error);
      return false;
    }
  },
}));
