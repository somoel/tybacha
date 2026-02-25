import { addToSyncQueue, generateUUID, getDatabase } from '@/src/lib/sqlite';
import { supabase } from '@/src/lib/supabase';
import type { Patient, PatientFormData } from '@/src/types/patient.types';
import { format } from 'date-fns';

/**
 * Fetch all patients for the current user (professional or caregiver).
 * Professional: fetches patients they created.
 * Caregiver: fetches patients assigned to them via caregiver_patients.
 */
export async function fetchPatients(
    userId: string,
    role: 'professional' | 'caregiver'
): Promise<Patient[]> {
    try {
        if (role === 'professional') {
            const { data, error } = await supabase
                .from('patients')
                .select('*')
                .eq('created_by', userId)
                .order('created_at', { ascending: false });

            if (error) throw new Error('Error al obtener pacientes: ' + error.message);
            return (data ?? []) as Patient[];
        } else {
            // Caregiver: join through caregiver_patients
            const { data, error } = await supabase
                .from('caregiver_patients')
                .select('patient_id, patients(*)')
                .eq('caregiver_id', userId);

            if (error) throw new Error('Error al obtener pacientes asignados: ' + error.message);

            return (data ?? []).map((row) => row.patients).filter(Boolean).flat() as Patient[];
        }
    } catch (error) {
        if (error instanceof Error) throw error;
        throw new Error('Error inesperado al obtener pacientes.');
    }
}

/**
 * Create a new patient. Falls back to SQLite if offline.
 * @param formData - Patient form data
 * @param createdBy - ID of the professional creating the patient
 * @param isOnline - Whether the device has internet connectivity
 */
export async function createPatient(
    formData: PatientFormData,
    createdBy: string,
    isOnline: boolean
): Promise<Patient> {
    const patientData = {
        id: generateUUID(),
        created_by: createdBy,
        first_name: formData.first_name,
        second_name: formData.second_name || null,
        first_lastname: formData.first_lastname,
        second_lastname: formData.second_lastname || null,
        birth_date: format(formData.birth_date, 'yyyy-MM-dd'),
        gender: formData.gender,
        pathologies: formData.pathologies || null,
    };

    try {
        if (isOnline) {
            const { data, error } = await supabase
                .from('patients')
                .insert(patientData)
                .select()
                .single();

            if (error) throw new Error('Error al registrar paciente: ' + error.message);
            return data as Patient;
        } else {
            // Save locally when offline
            const db = await getDatabase();
            await db.runAsync(
                `INSERT INTO patients_local (id, created_by, first_name, second_name, first_lastname, second_lastname, birth_date, gender, pathologies, synced)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
                [
                    patientData.id,
                    patientData.created_by,
                    patientData.first_name,
                    patientData.second_name,
                    patientData.first_lastname,
                    patientData.second_lastname,
                    patientData.birth_date,
                    patientData.gender,
                    patientData.pathologies,
                ]
            );

            await addToSyncQueue('patients', 'INSERT', patientData);

            return {
                ...patientData,
                second_name: patientData.second_name ?? undefined,
                second_lastname: patientData.second_lastname ?? undefined,
                pathologies: patientData.pathologies ?? undefined,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            } as Patient;
        }
    } catch (error) {
        if (error instanceof Error) throw error;
        throw new Error('Error inesperado al registrar paciente.');
    }
}

/**
 * Update an existing patient.
 */
export async function updatePatient(
    patientId: string,
    formData: PatientFormData,
    isOnline: boolean
): Promise<Patient> {
    const updateData = {
        first_name: formData.first_name,
        second_name: formData.second_name || null,
        first_lastname: formData.first_lastname,
        second_lastname: formData.second_lastname || null,
        birth_date: format(formData.birth_date, 'yyyy-MM-dd'),
        gender: formData.gender,
        pathologies: formData.pathologies || null,
        updated_at: new Date().toISOString(),
    };

    try {
        if (isOnline) {
            const { data, error } = await supabase
                .from('patients')
                .update(updateData)
                .eq('id', patientId)
                .select()
                .single();

            if (error) throw new Error('Error al actualizar paciente: ' + error.message);
            return data as Patient;
        } else {
            const db = await getDatabase();
            await db.runAsync(
                `UPDATE patients_local SET first_name=?, second_name=?, first_lastname=?, second_lastname=?, birth_date=?, gender=?, pathologies=?, updated_at=?, synced=0 WHERE id=?`,
                [
                    updateData.first_name,
                    updateData.second_name,
                    updateData.first_lastname,
                    updateData.second_lastname,
                    updateData.birth_date,
                    updateData.gender,
                    updateData.pathologies,
                    updateData.updated_at,
                    patientId,
                ]
            );

            await addToSyncQueue('patients', 'UPDATE', { id: patientId, ...updateData });

            return { id: patientId, ...updateData } as unknown as Patient;
        }
    } catch (error) {
        if (error instanceof Error) throw error;
        throw new Error('Error inesperado al actualizar paciente.');
    }
}

/**
 * Delete a patient by ID.
 */
export async function deletePatient(patientId: string, isOnline: boolean): Promise<void> {
    try {
        if (isOnline) {
            const { error } = await supabase.from('patients').delete().eq('id', patientId);
            if (error) throw new Error('Error al eliminar paciente: ' + error.message);
        } else {
            const db = await getDatabase();
            await db.runAsync('DELETE FROM patients_local WHERE id = ?', [patientId]);
            await addToSyncQueue('patients', 'DELETE', { id: patientId });
        }
    } catch (error) {
        if (error instanceof Error) throw error;
        throw new Error('Error inesperado al eliminar paciente.');
    }
}

/**
 * Fetch a single patient by ID.
 */
export async function fetchPatientById(patientId: string): Promise<Patient | null> {
    try {
        const { data, error } = await supabase
            .from('patients')
            .select('*')
            .eq('id', patientId)
            .single();

        if (error) {
            console.error('Error obteniendo paciente:', error);
            return null;
        }

        return data as Patient;
    } catch (error) {
        console.error('Error inesperado obteniendo paciente:', error);
        return null;
    }
}

/**
 * Search caregivers by email for assignment.
 */
export async function searchCaregivers(email: string) {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('id, full_name')
            .eq('role', 'caregiver')
            .ilike('id', `%${email}%`)
            .limit(10);

        if (error) throw new Error('Error buscando cuidadores: ' + error.message);

        // Also search by matching in auth users via a Supabase function or by full_name
        const { data: nameData, error: nameError } = await supabase
            .from('profiles')
            .select('id, full_name')
            .eq('role', 'caregiver')
            .ilike('full_name', `%${email}%`)
            .limit(10);

        if (nameError) {
            return (data ?? []) as Array<{ id: string; full_name: string }>;
        }

        // Merge and deduplicate
        const merged = [...(data ?? []), ...(nameData ?? [])];
        const unique = merged.filter(
            (item, index, self) => self.findIndex((t) => t.id === item.id) === index
        );

        return unique as Array<{ id: string; full_name: string }>;
    } catch (error) {
        if (error instanceof Error) throw error;
        throw new Error('Error inesperado buscando cuidadores.');
    }
}

/**
 * Assign a caregiver to a patient (RF-03).
 */
export async function assignCaregiver(
    caregiverId: string,
    patientId: string,
    assignedBy: string
): Promise<void> {
    try {
        const { error } = await supabase.from('caregiver_patients').insert({
            caregiver_id: caregiverId,
            patient_id: patientId,
            assigned_by: assignedBy,
        });

        if (error) {
            if (error.code === '23505') {
                throw new Error('Este cuidador ya está asignado a este paciente.');
            }
            throw new Error('Error al asignar cuidador: ' + error.message);
        }
    } catch (error) {
        if (error instanceof Error) throw error;
        throw new Error('Error inesperado al asignar cuidador.');
    }
}

/**
 * Remove a caregiver assignment (RF-07).
 */
export async function unassignCaregiver(
    caregiverId: string,
    patientId: string
): Promise<void> {
    try {
        const { error } = await supabase
            .from('caregiver_patients')
            .delete()
            .eq('caregiver_id', caregiverId)
            .eq('patient_id', patientId);

        if (error) throw new Error('Error al desasociar cuidador: ' + error.message);
    } catch (error) {
        if (error instanceof Error) throw error;
        throw new Error('Error inesperado al desasociar cuidador.');
    }
}

/**
 * Fetch caregivers assigned to a patient.
 */
export async function fetchAssignedCaregivers(patientId: string) {
    try {
        const { data, error } = await supabase
            .from('caregiver_patients')
            .select('id, caregiver_id, profiles!caregiver_patients_caregiver_id_fkey(full_name)')
            .eq('patient_id', patientId);

        if (error) throw new Error('Error al obtener cuidadores: ' + error.message);
        return data ?? [];
    } catch (error) {
        if (error instanceof Error) throw error;
        throw new Error('Error inesperado al obtener cuidadores.');
    }
}

/**
 * Fetch patients assigned to a caregiver (for profile screen RF-07).
 */
export async function fetchCaregiverAssignments(caregiverId: string) {
    try {
        const { data, error } = await supabase
            .from('caregiver_patients')
            .select('id, patient_id, patients(first_name, first_lastname)')
            .eq('caregiver_id', caregiverId);

        if (error) throw new Error('Error al obtener asignaciones: ' + error.message);
        return data ?? [];
    } catch (error) {
        if (error instanceof Error) throw error;
        throw new Error('Error inesperado al obtener asignaciones.');
    }
}
