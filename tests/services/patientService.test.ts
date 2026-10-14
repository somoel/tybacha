import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    assignCaregiverApi,
    createApiOlderAdult,
    deletePatientPhotoApi,
    fetchApiOlderAdult,
    fetchApiOlderAdults,
    fetchApiOlderAdultsPhotos,
    transferOlderAdultApi,
    unassignCaregiverApi,
    updateApiOlderAdult,
    uploadPatientPhotoApi,
} from '@/src/api/olderAdultsApi';
import { fetchApiUsers } from '@/src/api/usersApi';
import { enqueueOfflineOperation } from '@/src/lib/offlineQueue';
import {
    assignCaregiver,
    compressAndConvertPhoto,
    createPatient,
    deletePatient,
    deletePatientPhoto,
    fetchAssignedCaregiver,
    fetchAssignedCaregivers,
    fetchPatientById,
    fetchPatientThumbnails,
    fetchPatients,
    fetchProfessionalCaregivers,
    searchCaregivers,
    transferOlderAdult,
    unassignCaregiver,
    updatePatient,
} from '@/src/services/patientService';

vi.mock('@/src/api/olderAdultsApi', () => ({
    assignCaregiverApi: vi.fn(),
    createApiOlderAdult: vi.fn(),
    deletePatientPhotoApi: vi.fn(),
    fetchApiOlderAdult: vi.fn(),
    fetchApiOlderAdults: vi.fn(),
    fetchApiOlderAdultsPhotos: vi.fn(),
    transferOlderAdultApi: vi.fn(),
    unassignCaregiverApi: vi.fn(),
    updateApiOlderAdult: vi.fn(),
    uploadPatientPhotoApi: vi.fn(),
}));

vi.mock('@/src/api/usersApi', () => ({
    fetchApiUsers: vi.fn(),
}));

vi.mock('@/src/lib/offlineQueue', () => ({
    enqueueOfflineOperation: vi.fn().mockResolvedValue('id-local-1'),
}));

const adult = (overrides: Record<string, unknown> = {}) => ({
    idAdultoMayor: 7,
    idProfesionalResponsable: 3,
    nombres: 'Ana Maria',
    apellidos: 'Perez Lopez',
    fechaNacimiento: '1960-05-20',
    genero: 'femenino',
    hasPhoto: true,
    photoData: 'data:image/jpeg;base64,abc',
    cuidador: { idUsuario: 12, nombres: 'Carlos', apellidos: 'Rueda' },
    ...overrides,
});

describe('fetchPatients', () => {
    beforeEach(() => vi.mocked(fetchApiOlderAdults).mockReset());

    it('mapea el adulto mayor a Patient', async () => {
        vi.mocked(fetchApiOlderAdults).mockResolvedValue([adult()] as never);

        const patients = await fetchPatients({ limit: 3, order: 'recientes' });

        expect(fetchApiOlderAdults).toHaveBeenCalledWith({ limit: 3, order: 'recientes' });
        expect(patients[0]).toMatchObject({
            id: '7',
            created_by: '3',
            first_name: 'Ana Maria',
            first_lastname: 'Perez Lopez',
            birth_date: '1960-05-20',
            gender: 'female',
            caregiver_email: 'Carlos Rueda',
            id_cuidador: 12,
            has_photo: true,
            photo_data: 'data:image/jpeg;base64,abc',
        });
    });

    it('mapea el género masculino', async () => {
        vi.mocked(fetchApiOlderAdults).mockResolvedValue([adult({ genero: 'masculino' })] as never);
        const patients = await fetchPatients();
        expect(patients[0].gender).toBe('male');
    });

    it('sin cuidador no arrastra datos de cuidador', async () => {
        vi.mocked(fetchApiOlderAdults).mockResolvedValue([adult({ cuidador: null })] as never);
        const patients = await fetchPatients();
        expect(patients[0].caregiver_email).toBeUndefined();
        expect(patients[0].id_cuidador).toBeUndefined();
    });

    it('un cuidador sin nombre usa su id', async () => {
        vi.mocked(fetchApiOlderAdults).mockResolvedValue([
            adult({ cuidador: { idUsuario: 5, nombres: null, apellidos: null } }),
        ] as never);
        const patients = await fetchPatients();
        expect(patients[0].caregiver_email).toBe('5');
    });

    it('sin profesional responsable el created_by queda vacío', async () => {
        vi.mocked(fetchApiOlderAdults).mockResolvedValue([
            adult({ idProfesionalResponsable: null }),
        ] as never);
        const patients = await fetchPatients();
        expect(patients[0].created_by).toBe('');
    });
});

describe('createPatient', () => {
    const formData = {
        first_name: 'Ana',
        second_name: 'Maria',
        first_lastname: 'Perez',
        second_lastname: 'Lopez',
        birth_date: new Date(1960, 4, 20),
        gender: 'female',
        id_cuidador: 12,
    };

    beforeEach(() => {
        vi.mocked(createApiOlderAdult).mockReset();
        vi.mocked(enqueueOfflineOperation).mockClear();
    });

    it('construye el payload del API', async () => {
        vi.mocked(createApiOlderAdult).mockResolvedValue(adult() as never);

        await createPatient(formData as never, '3', true);

        expect(createApiOlderAdult).toHaveBeenCalledWith({
            nombres: 'Ana Maria',
            apellidos: 'Perez Lopez',
            fechaNacimiento: '1960-05-20',
            genero: 'femenino',
            idCuidador: 12,
        });
    });

    it('devuelve el paciente mapeado', async () => {
        vi.mocked(createApiOlderAdult).mockResolvedValue(adult() as never);
        const created = await createPatient(formData as never, '3', true);
        expect(created.id).toBe('7');
        expect(created.gender).toBe('female');
    });

    it('modo offline encola la operación y devuelve un id local', async () => {
        const created = await createPatient(formData as never, '3', false);

        expect(enqueueOfflineOperation).toHaveBeenCalledWith(
            'adulto_mayor',
            'crear',
            expect.objectContaining({ nombres: 'Ana Maria', genero: 'femenino' }),
        );
        expect(created.id).toBe('id-local-1');
        expect(created.created_by).toBe('3');
        expect(createApiOlderAdult).not.toHaveBeenCalled();
    });
});

describe('updatePatient', () => {
    const formData = {
        first_name: 'Ana',
        first_lastname: 'Perez',
        birth_date: new Date(1960, 4, 20),
        gender: 'male',
    };

    beforeEach(() => {
        vi.mocked(updateApiOlderAdult).mockReset();
        vi.mocked(fetchApiOlderAdult).mockReset();
        vi.mocked(enqueueOfflineOperation).mockClear();
    });

    it('actualiza y relee el recurso', async () => {
        vi.mocked(fetchApiOlderAdult).mockResolvedValue(adult() as never);

        const updated = await updatePatient('7', formData as never, true);

        expect(updateApiOlderAdult).toHaveBeenCalledWith(
            7,
            expect.objectContaining({ genero: 'masculino', idAdultoMayor: 7 }),
        );
        expect(fetchApiOlderAdult).toHaveBeenCalledWith(7);
        expect(updated.id).toBe('7');
    });

    it('modo offline encola la actualización', async () => {
        const updated = await updatePatient('7', formData as never, false);

        expect(enqueueOfflineOperation).toHaveBeenCalledWith(
            'adulto_mayor',
            'actualizar',
            expect.objectContaining({ idAdultoMayor: 7 }),
        );
        expect(updated.id).toBe('7');
        expect(updateApiOlderAdult).not.toHaveBeenCalled();
    });
});

describe('deletePatient', () => {
    it('no hace DELETE: marca el registro como inactivo', async () => {
        vi.mocked(updateApiOlderAdult).mockReset();

        await deletePatient('7');

        expect(updateApiOlderAdult).toHaveBeenCalledWith(7, {
            estado: 'inactivo',
            motivoInactivacion: 'Inactivado desde la aplicacion',
        });
    });
});

describe('fetchPatientById', () => {
    it('devuelve el paciente o null si la API falla', async () => {
        const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
        vi.mocked(fetchApiOlderAdult).mockRejectedValue(new Error('404'));

        await expect(fetchPatientById('7')).resolves.toBeNull();
        expect(spy).toHaveBeenCalled();
        spy.mockRestore();
    });

    it('devuelve el paciente cuando existe', async () => {
        vi.mocked(fetchApiOlderAdult).mockResolvedValue(adult() as never);
        const patient = await fetchPatientById('7');
        expect(patient?.first_name).toBe('Ana Maria');
    });
});

describe('cuidadores', () => {
    const users = [
        { idUsuario: 1, rol: 'cuidador', nombres: 'Carla', apellidos: 'Gomez', correo: 'c@x.com' },
        { idUsuario: 2, rol: 'profesional', nombres: 'Doc', apellidos: 'Torres', correo: 'd@x.com' },
        { idUsuario: 3, rol: 'cuidador', nombres: null, apellidos: null, correo: 'sin@x.com' },
    ];

    beforeEach(() => {
        vi.mocked(fetchApiUsers).mockReset();
        vi.mocked(fetchApiUsers).mockResolvedValue(users as never);
    });

    it('fetchProfessionalCaregivers filtra solo cuidadores', async () => {
        const result = await fetchProfessionalCaregivers();

        expect(result).toEqual([
            { id: '1', full_name: 'Carla Gomez', email: 'c@x.com' },
            { id: '3', full_name: 'sin@x.com', email: 'sin@x.com' },
        ]);
    });

    it('searchCaregivers filtra por nombre o correo sin distinguir mayúsculas', async () => {
        expect((await searchCaregivers('CARLA')).map((c) => c.id)).toEqual(['1']);
        expect((await searchCaregivers('sin@x')).map((c) => c.id)).toEqual(['3']);
        expect(await searchCaregivers('nada')).toEqual([]);
    });

    it('searchCaregivers limita el resultado a 10', async () => {
        vi.mocked(fetchApiUsers).mockResolvedValue(
            Array.from({ length: 30 }, (_, i) => ({
                idUsuario: i,
                rol: 'cuidador',
                nombres: `C${i}`,
                apellidos: 'X',
                correo: `c${i}@x.com`,
            })) as never,
        );

        expect(await searchCaregivers('c')).toHaveLength(10);
    });

    it('asignar/desasignar/transmitir delegan en la API', async () => {
        vi.mocked(assignCaregiverApi).mockReset();
        vi.mocked(unassignCaregiverApi).mockReset();
        vi.mocked(transferOlderAdultApi).mockReset();

        await assignCaregiver('12', '7');
        await unassignCaregiver('12', '7');
        await transferOlderAdult('7', 'otro@x.com');

        expect(assignCaregiverApi).toHaveBeenCalledWith(7, 12);
        expect(unassignCaregiverApi).toHaveBeenCalledWith(7);
        expect(transferOlderAdultApi).toHaveBeenCalledWith(7, 'otro@x.com');
    });

    it('fetchAssignedCaregiver devuelve null si no hay cuidador', async () => {
        vi.mocked(fetchApiOlderAdult).mockResolvedValue(
            adult({ cuidador: null }) as never,
        );
        await expect(fetchAssignedCaregiver('7')).resolves.toBeNull();
        await expect(fetchAssignedCaregivers('7')).resolves.toEqual([]);
    });

    it('fetchAssignedCaregivers devuelve el cuidador asignado', async () => {
        vi.mocked(fetchApiOlderAdult).mockResolvedValue(adult() as never);

        await expect(fetchAssignedCaregivers('7')).resolves.toEqual([
            { id: '12', caregiver_id: '12', profiles: { full_name: 'Carlos Rueda' } },
        ]);
    });
});

describe('fotos', () => {
    it('compressAndConvertPhoto redimensiona y descarga el blob', async () => {
        const fetchSpy = vi
            .spyOn(globalThis, 'fetch')
            .mockResolvedValue(new Response(new Blob(['img'])));

        const blob = await compressAndConvertPhoto('file://foto.jpg');

        expect(blob).toBeInstanceOf(Blob);
        fetchSpy.mockRestore();
    });
});

describe('fetchPatientThumbnails', () => {
    it('devuelve el mapa de miniaturas', async () => {
        vi.mocked(fetchApiOlderAdultsPhotos).mockResolvedValue({ '7': 'data:img' } as never);
        await expect(fetchPatientThumbnails()).resolves.toEqual({ '7': 'data:img' });
    });
});

describe('deletePatientPhoto', () => {
    it('llama a la API de borrado', async () => {
        vi.mocked(deletePatientPhotoApi).mockReset();
        vi.mocked(uploadPatientPhotoApi).mockReset();

        await deletePatientPhoto('7');

        expect(deletePatientPhotoApi).toHaveBeenCalledWith(7);
    });
});
