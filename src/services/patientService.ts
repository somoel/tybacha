import { addToSyncQueue, generateUUID, getDatabase } from '@/src/lib/sqlite';
import { supabase } from '@/src/lib/supabase';
import type { Patient, PatientFormData } from '@/src/types/patient.types';
import { format } from 'date-fns';

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
        if (role === 'professional') {
            const { data, error } = await supabase
                .from('patients')
                .select('*')
                .eq('created_by', userId)
                .order('created_at', { ascending: false });

            if (error) throw new Error('Error al obtener pacientes: ' + error.message);
            return (data ?? []) as Patient[];
        } else {
            // Caregiver: fetch patients where caregiver_email matches their email
            const { data: userData, error: userError } = await supabase
                .from('profiles')
                .select('id')
                .eq('id', userId)
                .single();
            
            if (userError) throw new Error('Error obteniendo datos del cuidador: ' + userError.message);
            
            // Get user email from auth.users
            const { data: authData, error: authError } = await supabase.auth.getUser();
            if (authError) throw new Error('Error obteniendo email del usuario: ' + authError.message);
            
            const userEmail = authData.user?.email;
            if (!userEmail) throw new Error('No se encontró el email del cuidador');
            
            const { data, error } = await supabase
                .from('patients')
                .select('*')
                .eq('caregiver_email', userEmail)
                .order('created_at', { ascending: false });

            if (error) throw new Error('Error al obtener pacientes asignados: ' + error.message);
            return (data ?? []) as Patient[];
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
        caregiver_email: formData.caregiver_email || null,
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
                    patientData.caregiver_email,
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
        caregiver_email: formData.caregiver_email || null,
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
                    updateData.caregiver_email,
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
 * Search caregivers by email or name for assignment.
 */
export async function searchCaregivers(query: string) {
    try {
        // First try to search by email in auth.users
        const { data: emailData, error: emailError } = await supabase
            .rpc('search_caregivers_by_email', { 
                search_query: query.toLowerCase() 
            });

        // If RPC doesn't exist, search by name in profiles
        if (emailError) {
            console.warn('RPC search_caregivers_by_email not available, searching by name only');
            const { data, error } = await supabase
                .from('profiles')
                .select('id, full_name')
                .eq('role', 'caregiver')
                .ilike('full_name', `%${query}%`)
                .limit(10);

            if (error) throw new Error('Error buscando cuidadores: ' + error.message);
            return data as Array<{ id: string; full_name: string }>;
        }

        // Also search by name in profiles
        const { data: nameData, error: nameError } = await supabase
            .from('profiles')
            .select('id, full_name')
            .eq('role', 'caregiver')
            .ilike('full_name', `%${query}%`)
            .limit(10);

        if (nameError) {
            return (emailData ?? []) as Array<{ id: string; full_name: string }>;
        }

        // Merge and deduplicate
        const merged = [...(emailData ?? []), ...(nameData ?? [])];
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
 * Assign a caregiver to a patient using email.
 */
export async function assignCaregiver(
    caregiverEmail: string,
    patientId: string,
    assignedBy: string
): Promise<void> {
    try {
        // Verify that the caregiver exists and has role 'caregiver'
        const { data: caregiverData, error: caregiverError } = await supabase
            .rpc('verify_caregiver_by_email', { 
                caregiver_email: caregiverEmail 
            });
            
        if (caregiverError || !caregiverData) {
            throw new Error('No se encontró un cuidador con ese email.');
        }
        
        // Update patient with caregiver email
        const { error } = await supabase
            .from('patients')
            .update({ caregiver_email: caregiverEmail })
            .eq('id', patientId)
            .eq('created_by', assignedBy); // Only professional can assign

        if (error) {
            throw new Error('Error al asignar cuidador: ' + error.message);
        }
    } catch (error) {
        if (error instanceof Error) throw error;
        throw new Error('Error inesperado al asignar cuidador.');
    }
}

/**
 * Remove a caregiver assignment from a patient.
 */
export async function unassignCaregiver(
    patientId: string,
    assignedBy: string
): Promise<void> {
    try {
        const { error } = await supabase
            .from('patients')
            .update({ caregiver_email: null })
            .eq('id', patientId)
            .eq('created_by', assignedBy); // Only professional can unassign

        if (error) throw new Error('Error al desasociar cuidador: ' + error.message);
    } catch (error) {
        if (error instanceof Error) throw error;
        throw new Error('Error inesperado al desasociar cuidador.');
    }
}

/**
 * Fetch caregiver email assigned to a patient.
 */
export async function fetchAssignedCaregiver(patientId: string) {
    try {
        const { data, error } = await supabase
            .from('patients')
            .select('caregiver_email')
            .eq('id', patientId)
            .single();

        if (error) {
            console.error('Error fetching assigned caregiver:', error);
            throw new Error('Error al obtener cuidador asignado: ' + error.message);
        }
        
        if (!data?.caregiver_email) {
            return null;
        }
        
        // Get caregiver details from email
        const { data: caregiverData, error: caregiverError } = await supabase
            .rpc('get_caregiver_details_by_email', { 
                caregiver_email: data.caregiver_email 
            });
            
        if (caregiverError) {
            console.warn('Caregiver not found in profiles, returning email only');
            return { email: data.caregiver_email, full_name: 'Cuidador' };
        }
        
        return { email: data.caregiver_email, ...caregiverData };
    } catch (error) {
        console.error('Error in fetchAssignedCaregiver:', error);
        if (error instanceof Error) throw error;
        throw new Error('Error inesperado al obtener cuidador asignado.');
    }
}

/**
 * Fetch patients assigned to a caregiver (for profile screen).
 */
export async function fetchCaregiverAssignments(caregiverEmail: string) {
    try {
        const { data, error } = await supabase
            .from('patients')
            .select('id, first_name, first_lastname')
            .eq('caregiver_email', caregiverEmail)
            .order('created_at', { ascending: false });

        if (error) throw new Error('Error al obtener asignaciones: ' + error.message);
        return data ?? [];
    } catch (error) {
        if (error instanceof Error) throw error;
        throw new Error('Error inesperado al obtener asignaciones.');
    }
}
