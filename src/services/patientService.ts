import {
    assignCaregiverApi,
    createApiOlderAdult,
    deletePatientPhotoApi,
    fetchApiOlderAdult,
    fetchApiOlderAdults,
    fetchApiOlderAdultsPhotos,
    unassignCaregiverApi,
    updateApiOlderAdult,
    uploadPatientPhotoApi,
} from '@/src/api/olderAdultsApi';
import { fetchApiUsers } from '@/src/api/usersApi';
import { addOfflineOperation } from '@/src/lib/sqlite';
import type { ApiGender, ApiOlderAdult } from '@/src/types/apiOlderAdult.types';
import type { Patient, PatientFormData } from '@/src/types/patient.types';
import { format } from 'date-fns';
import * as ImageManipulator from 'expo-image-manipulator';

function mapGenderFromApi(gender: ApiOlderAdult['genero']) {
    if (gender === 'masculino') return 'male';
    return 'female';
}

function mapGenderToApi(gender: PatientFormData['gender']): ApiGender {
    if (gender === 'male') return 'masculino';
    return 'femenino';
}

function mapOlderAdultToPatient(adult: ApiOlderAdult): Patient {
    return {
        id: String(adult.idAdultoMayor),
        created_by: adult.idProfesionalResponsable ? String(adult.idProfesionalResponsable) : '',
        first_name: adult.nombres,
        first_lastname: adult.apellidos,
        birth_date: adult.fechaNacimiento,
        gender: mapGenderFromApi(adult.genero),
        caregiver_email: adult.cuidador
            ? `${adult.cuidador.nombres ?? ''} ${adult.cuidador.apellidos ?? ''}`.trim() || String(adult.cuidador.idUsuario)
            : undefined,
        id_cuidador: adult.cuidador?.idUsuario,
        has_photo: adult.hasPhoto,
        photo_data: adult.photoData ?? null,
        created_at: '',
        updated_at: '',
    };
}

/**
 * Fetch adults visible for the current authenticated user.
 */
export async function fetchPatients(_userId?: string, _role?: string): Promise<Patient[]> {
    const adults = await fetchApiOlderAdults();
    return adults.map(mapOlderAdultToPatient);
}

/**
 * Create a new older adult. Professionals must pass id_cuidador.
 */
export async function createPatient(
    formData: PatientFormData,
    _createdBy?: string,
    isOnline = true,
): Promise<Patient> {
    const payload = {
        nombres: [formData.first_name, formData.second_name].filter(Boolean).join(' '),
        apellidos: [formData.first_lastname, formData.second_lastname].filter(Boolean).join(' '),
        fechaNacimiento: format(formData.birth_date, 'yyyy-MM-dd'),
        genero: mapGenderToApi(formData.gender),
        idCuidador: formData.id_cuidador,
    };

    if (!isOnline) {
        const idLocal = await addOfflineOperation('adulto_mayor', 'crear', payload);
        return {
            id: idLocal,
            created_by: _createdBy ?? '',
            first_name: formData.first_name,
            second_name: formData.second_name,
            first_lastname: formData.first_lastname,
            second_lastname: formData.second_lastname,
            birth_date: format(formData.birth_date, 'yyyy-MM-dd'),
            gender: formData.gender,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };
    }

    const adult = await createApiOlderAdult({
        ...payload,
    });

    return mapOlderAdultToPatient(adult);
}

export async function updatePatient(
    patientId: string,
    formData: PatientFormData,
    isOnline = true,
): Promise<Patient> {
    const payload = {
        idAdultoMayor: Number(patientId),
        nombres: [formData.first_name, formData.second_name].filter(Boolean).join(' '),
        apellidos: [formData.first_lastname, formData.second_lastname].filter(Boolean).join(' '),
        fechaNacimiento: format(formData.birth_date, 'yyyy-MM-dd'),
        genero: mapGenderToApi(formData.gender),
    };

    if (!isOnline) {
        await addOfflineOperation('adulto_mayor', 'actualizar', payload);
        return {
            id: patientId,
            created_by: '',
            first_name: formData.first_name,
            second_name: formData.second_name,
            first_lastname: formData.first_lastname,
            second_lastname: formData.second_lastname,
            birth_date: format(formData.birth_date, 'yyyy-MM-dd'),
            gender: formData.gender,
            created_at: '',
            updated_at: new Date().toISOString(),
        };
    }

    await updateApiOlderAdult(Number(patientId), {
        ...payload,
    });

    const updated = await fetchApiOlderAdult(Number(patientId));
    return mapOlderAdultToPatient(updated);
}

export async function deletePatient(patientId: string, _isOnline?: boolean): Promise<void> {
    await updateApiOlderAdult(Number(patientId), {
        estado: 'inactivo',
        motivoInactivacion: 'Inactivado desde la aplicacion',
    });
}

export async function fetchPatientById(patientId: string): Promise<Patient | null> {
    try {
        const adult = await fetchApiOlderAdult(Number(patientId));
        return mapOlderAdultToPatient(adult);
    } catch (error) {
        console.error('Error obteniendo adulto mayor:', error);
        return null;
    }
}

export interface CaregiverResult {
    id: string;
    full_name: string;
    email: string;
}

export async function fetchProfessionalCaregivers(): Promise<CaregiverResult[]> {
    const users = await fetchApiUsers();
    return users
        .filter((user) => user.rol === 'cuidador')
        .map((user) => ({
            id: String(user.idUsuario),
            full_name: `${user.nombres ?? ''} ${user.apellidos ?? ''}`.trim() || user.correo,
            email: user.correo,
        }));
}

export async function searchCaregivers(query: string) {
    const users = await fetchApiUsers();
    const normalized = query.toLowerCase();
    return users
        .filter((user) => user.rol === 'cuidador')
        .filter((user) => {
            const text = `${user.correo} ${user.nombres ?? ''} ${user.apellidos ?? ''}`.toLowerCase();
            return text.includes(normalized);
        })
        .slice(0, 10)
        .map((user) => ({
            id: String(user.idUsuario),
            full_name: `${user.nombres ?? ''} ${user.apellidos ?? ''}`.trim() || user.correo,
            email: user.correo,
        }));
}

export async function assignCaregiver(
    caregiverId: string,
    patientId: string,
    _userId?: string,
): Promise<void> {
    await assignCaregiverApi(Number(patientId), Number(caregiverId));
}

export async function unassignCaregiver(
    _caregiverId: string,
    patientId: string,
): Promise<void> {
    await unassignCaregiverApi(Number(patientId));
}

export async function fetchAssignedCaregiver(patientId: string) {
    const adult = await fetchApiOlderAdult(Number(patientId));
    if (!adult.cuidador) return null;
    return {
        id: String(adult.cuidador.idUsuario),
        full_name: `${adult.cuidador.nombres ?? ''} ${adult.cuidador.apellidos ?? ''}`.trim(),
        email: '',
    };
}

export async function fetchAssignedCaregivers(patientId: string) {
    const assigned = await fetchAssignedCaregiver(patientId);
    if (!assigned) return [];

    return [{
        id: assigned.id,
        caregiver_id: assigned.id,
        profiles: {
            full_name: assigned.full_name,
        },
    }];
}

export async function fetchCaregiverAssignments(..._args: unknown[]) {
    const adults = await fetchApiOlderAdults();
    return adults.map((adult) => ({
        id: String(adult.idAdultoMayor),
        patient_id: String(adult.idAdultoMayor),
        patients: {
            first_name: adult.nombres,
            first_lastname: adult.apellidos,
        },
    }));
}

const MAX_PHOTO_DIMENSION = 400;
const WEBP_QUALITY = 0.7;

export async function compressAndConvertPhoto(imageUri: string): Promise<Blob> {
    const manipulated = await ImageManipulator.manipulateAsync(
        imageUri,
        [{ resize: { width: MAX_PHOTO_DIMENSION, height: MAX_PHOTO_DIMENSION } }],
        { compress: WEBP_QUALITY, format: ImageManipulator.SaveFormat.WEBP },
    );

    const response = await fetch(manipulated.uri);
    return response.blob();
}

export async function uploadPatientPhoto(patientId: string, imageUri: string): Promise<void> {
    const blob = await compressAndConvertPhoto(imageUri);
    const formData = new FormData();
    formData.append('file', blob, 'photo.webp');
    await uploadPatientPhotoApi(Number(patientId), formData);
}

export async function deletePatientPhoto(patientId: string): Promise<void> {
    await deletePatientPhotoApi(Number(patientId));
}

export async function fetchPatientThumbnails(): Promise<Record<string, string>> {
    return fetchApiOlderAdultsPhotos();
}
