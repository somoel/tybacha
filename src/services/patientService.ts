import type { Patient, PatientFormData } from '@/src/types/patient.types';
import { patientServiceMySQL } from './patientServiceMySQL';

/**
 * Fetch all patients for the current user (professional or caregiver).
 * Professional: fetches patients they created.
 * Caregiver: fetches patients assigned to them via caregiver_email.
 */
export async function fetchPatients(
    userId: string,
    role: 'professional' | 'caregiver'
): Promise<Patient[]> {
    try {
        const result = await patientServiceMySQL.getAllPatients({ limit: 100 });
        return result.data;
    } catch (error) {
        console.error('Error fetching patients:', error);
        throw new Error('Error obteniendo datos del cuidador: ' + error);
    }
}

/**
 * Create a new patient using MySQL backend.
 * @param formData - Patient form data
 * @param createdBy - ID of the professional creating the patient
 * @param isOnline - Whether the device has internet connectivity
 */
export async function createPatient(
    formData: PatientFormData,
    createdBy: string,
    isOnline: boolean
): Promise<Patient> {
    try {
        const patientData = {
            first_name: formData.first_name,
            first_lastname: formData.first_lastname,
            second_name: formData.second_name || null,
            second_lastname: formData.second_lastname || null,
            birth_date: formData.birth_date,
            gender: formData.gender,
            phone: formData.phone || null,
            address: formData.address || null,
            emergency_contact: formData.emergency_contact || null,
            emergency_phone: formData.emergency_phone || null,
            medical_history: formData.medical_history || null,
            allergies: formData.allergies || null,
            medications: formData.medications || null,
        };

        const result = await patientServiceMySQL.createPatient(patientData, createdBy);
        return result.data;
    } catch (error) {
        console.error('Error creating patient:', error);
        throw new Error('Error al registrar paciente: ' + error);
    }
}

/**
 * Update an existing patient using MySQL backend.
 */
export async function updatePatient(
    patientId: string,
    formData: PatientFormData,
    isOnline: boolean
): Promise<Patient> {
    try {
        const updateData = {
            first_name: formData.first_name,
            first_lastname: formData.first_lastname,
            second_name: formData.second_name || null,
            second_lastname: formData.second_lastname || null,
            birth_date: formData.birth_date,
            gender: formData.gender,
            phone: formData.phone || null,
            address: formData.address || null,
            emergency_contact: formData.emergency_contact || null,
            emergency_phone: formData.emergency_phone || null,
            medical_history: formData.medical_history || null,
            allergies: formData.allergies || null,
            medications: formData.medications || null,
        };

        const result = await patientServiceMySQL.updatePatient(patientId, updateData);
        return result.data;
    } catch (error) {
        console.error('Error updating patient:', error);
        throw new Error('Error al actualizar paciente: ' + error);
    }
}

/**
 * Delete a patient by ID using MySQL backend.
 */
export async function deletePatient(patientId: string, isOnline: boolean): Promise<void> {
    try {
        await patientServiceMySQL.deletePatient(patientId);
    } catch (error) {
        console.error('Error deleting patient:', error);
        throw new Error('Error al eliminar paciente: ' + error);
    }
}

/**
 * Fetch a single patient by ID using MySQL backend.
 */
export async function fetchPatientById(patientId: string): Promise<Patient | null> {
    try {
        const patient = await patientServiceMySQL.getPatientById(patientId);
        return patient;
    } catch (error) {
        console.error('Error fetching patient:', error);
        return null;
    }
}

/**
 * Search patients by name or other criteria using MySQL backend.
 */
export async function searchPatients(query: string): Promise<Patient[]> {
    try {
        const result = await patientServiceMySQL.searchPatients(query);
        return result.data;
    } catch (error) {
        console.error('Error searching patients:', error);
        throw new Error('Error buscando pacientes: ' + error);
    }
}

/**
 * Assign a caregiver to a patient using MySQL backend.
 */
export async function assignCaregiver(
    caregiverEmail: string,
    patientId: string,
    assignedBy: string
): Promise<void> {
    try {
        await patientServiceMySQL.assignCaregiver(patientId, caregiverEmail);
    } catch (error) {
        console.error('Error assigning caregiver:', error);
        throw new Error('Error al asignar cuidador: ' + error);
    }
}

/**
 * Remove a caregiver assignment from a patient using MySQL backend.
 */
export async function unassignCaregiver(
    patientId: string,
    assignedBy: string
): Promise<void> {
    try {
        await patientServiceMySQL.unassignCaregiver(patientId);
    } catch (error) {
        console.error('Error unassigning caregiver:', error);
        throw new Error('Error al desasociar cuidador: ' + error);
    }
}

/**
 * Fetch caregiver email assigned to a patient using MySQL backend.
 */
export async function fetchAssignedCaregiver(patientId: string) {
    try {
        const patient = await patientServiceMySQL.getPatientById(patientId);
        if (!patient.data) {
            return null;
        }
        
        const caregiverEmail = patient.data.caregiver_email;
        if (!caregiverEmail) {
            return null;
        }
        
        return { email: caregiverEmail, full_name: 'Cuidador' };
    } catch (error) {
        console.error('Error fetching assigned caregiver:', error);
        throw new Error('Error al obtener cuidador asignado: ' + error);
    }
}

/**
 * Fetch patients assigned to a caregiver using MySQL backend.
 */
export async function fetchCaregiverAssignments(caregiverEmail: string) {
    try {
        const result = await patientServiceMySQL.getPatientsByCaregiver(caregiverEmail);
        return result.data.map(p => ({
            id: p.id,
            first_name: p.first_name,
            first_lastname: p.first_lastname
        }));
    } catch (error) {
        console.error('Error fetching caregiver assignments:', error);
        throw new Error('Error al obtener asignaciones: ' + error);
    }
}
