import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    fetchApiCaregiver,
    fetchApiCaregiverPatients,
    fetchApiCaregivers,
} from '@/src/api/caregiversApi';
import {
    fetchCaregiverDetail,
    fetchCaregiverPatients,
    fetchCaregivers,
    mapCaregiverPatientToPatient,
} from '@/src/services/caregiverService';

vi.mock('@/src/api/caregiversApi', () => ({
    fetchApiCaregiver: vi.fn(),
    fetchApiCaregiverPatients: vi.fn(),
    fetchApiCaregivers: vi.fn(),
}));

function summary(overrides: Record<string, unknown> = {}) {
    return {
        idUsuario: 12,
        correo: 'cuidador@x.com',
        estado: 'activo',
        nombres: 'Carla',
        apellidos: 'Gomez',
        telefono: '555',
        ciudad: 'Bogota',
        creadoEn: 'a',
        ultimoAccesoEn: 'b',
        cantidadPacientes: 2,
        pacientesConPlanActivo: 1,
        cumplimientoSemanalPromedio: 80,
        ...overrides,
    };
}

function caregiverPatient(overrides: Record<string, unknown> = {}) {
    return {
        idAdultoMayor: 7,
        nombres: 'Ana',
        apellidos: 'Perez',
        fechaNacimiento: '1960-05-20',
        genero: 'femenino',
        tienePlanActivo: true,
        cumplimientoSemanal: 90,
        tieneAlertaActiva: false,
        cantidadBaterias: 3,
        ...overrides,
    };
}

describe('fetchCaregivers', () => {
    beforeEach(() => vi.mocked(fetchApiCaregivers).mockReset());

    it('delega la búsqueda y mapea los resúmenes', async () => {
        vi.mocked(fetchApiCaregivers).mockResolvedValue([summary()] as never);

        const caregivers = await fetchCaregivers('carla');

        expect(fetchApiCaregivers).toHaveBeenCalledWith('carla');
        expect(caregivers[0]).toMatchObject({
            id: '12',
            fullName: 'Carla Gomez',
            correo: 'cuidador@x.com',
            cantidadPacientes: 2,
            pacientesConPlanActivo: 1,
            cumplimientoSemanalPromedio: 80,
        });
    });

    it('usa el correo como nombre cuando faltan nombres y apellidos', async () => {
        vi.mocked(fetchApiCaregivers).mockResolvedValue([
            summary({ nombres: null, apellidos: null }),
        ] as never);

        const [caregiver] = await fetchCaregivers();
        expect(caregiver.fullName).toBe('cuidador@x.com');
    });

    it('concatena solo la parte del nombre existente', async () => {
        vi.mocked(fetchApiCaregivers).mockResolvedValue([
            summary({ nombres: 'Carla', apellidos: null }),
        ] as never);

        const [caregiver] = await fetchCaregivers();
        expect(caregiver.fullName).toBe('Carla');
    });
});

describe('fetchCaregiverDetail', () => {
    it('incluye los pacientes mapeados', async () => {
        vi.mocked(fetchApiCaregiver).mockResolvedValue({
            ...summary(),
            pacientes: [caregiverPatient()],
        } as never);

        const detail = await fetchCaregiverDetail('12');

        expect(fetchApiCaregiver).toHaveBeenCalledWith(12);
        expect(detail.fullName).toBe('Carla Gomez');
        expect(detail.pacientes).toEqual([
            {
                id: '7',
                nombres: 'Ana',
                apellidos: 'Perez',
                fullName: 'Ana Perez',
                fechaNacimiento: '1960-05-20',
                genero: 'femenino',
                tienePlanActivo: true,
                cumplimientoSemanal: 90,
                tieneAlertaActiva: false,
                cantidadBaterias: 3,
            },
        ]);
    });
});

describe('fetchCaregiverPatients', () => {
    it('delega en la API', async () => {
        vi.mocked(fetchApiCaregiverPatients).mockResolvedValue([
            caregiverPatient({ genero: 'masculino' }),
        ] as never);

        const patients = await fetchCaregiverPatients('12');

        expect(fetchApiCaregiverPatients).toHaveBeenCalledWith(12);
        expect(patients[0].genero).toBe('masculino');
    });
});

describe('mapCaregiverPatientToPatient', () => {
    it('adapta el género al modelo de Patient', () => {
        const male = mapCaregiverPatientToPatient({
            id: '7',
            nombres: 'Ana',
            apellidos: 'Perez',
            fullName: 'Ana Perez',
            fechaNacimiento: '1960-05-20',
            genero: 'masculino',
            tienePlanActivo: true,
            cumplimientoSemanal: 90,
            tieneAlertaActiva: false,
            cantidadBaterias: 3,
        });

        expect(male).toMatchObject({
            id: '7',
            first_name: 'Ana',
            first_lastname: 'Perez',
            birth_date: '1960-05-20',
            gender: 'male',
            has_photo: false,
            photo_data: null,
        });
    });

    it('por defecto es female', () => {
        const female = mapCaregiverPatientToPatient({
            id: '8',
            nombres: 'Bea',
            apellidos: 'Ruiz',
            fullName: 'Bea Ruiz',
            fechaNacimiento: '1970-01-01',
            genero: 'femenino',
            tienePlanActivo: false,
            cumplimientoSemanal: 0,
            tieneAlertaActiva: true,
            cantidadBaterias: 0,
        });

        expect(female.gender).toBe('female');
    });
});
