import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchApiPatientsSummary } from '@/src/api/olderAdultsApi';
import {
    createPatient,
    deletePatient,
    fetchPatientById,
    fetchPatientThumbnails,
    fetchPatients,
    updatePatient,
} from '@/src/services/patientService';
import { usePatientsStore } from '@/src/stores/patientsStore';
import type { Patient } from '@/src/types/patient.types';

vi.mock('@/src/api/olderAdultsApi', () => ({
    fetchApiPatientsSummary: vi.fn(),
}));

vi.mock('@/src/services/patientService', () => ({
    createPatient: vi.fn(),
    deletePatient: vi.fn(),
    fetchPatientById: vi.fn(),
    fetchPatientThumbnails: vi.fn(),
    fetchPatients: vi.fn(),
    updatePatient: vi.fn(),
    fetchProfessionalCaregivers: vi.fn(),
    searchCaregivers: vi.fn(),
    assignCaregiver: vi.fn(),
    unassignCaregiver: vi.fn(),
    transferOlderAdult: vi.fn(),
    fetchAssignedCaregiver: vi.fn(),
    fetchAssignedCaregivers: vi.fn(),
    fetchCaregiverAssignments: vi.fn(),
    compressAndConvertPhoto: vi.fn(),
    uploadPatientPhoto: vi.fn(),
    deletePatientPhoto: vi.fn(),
}));

const INITIAL = {
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
};

const store = () => usePatientsStore.getState();

function patient(id: string, name: Partial<Patient> = {}): Patient {
    return {
        id,
        first_name: 'Ana',
        second_name: null,
        first_lastname: 'Perez',
        second_lastname: null,
        birth_date: '1960-01-01',
        gender: 'female',
        ...name,
    } as unknown as Patient;
}

function summaryItem(id: number, overrides: Record<string, unknown> = {}) {
    return {
        idAdultoMayor: id,
        todayCompleted: 1,
        todayTotal: 2,
        weeklyCompliance: 80,
        lastExerciseDate: '2026-01-01',
        batteryCount: 1,
        hasActivePlan: true,
        ...overrides,
    };
}

describe('patientsStore', () => {
    beforeEach(() => {
        usePatientsStore.setState({ ...INITIAL });
        vi.mocked(fetchPatients).mockReset();
        vi.mocked(fetchApiPatientsSummary).mockReset();
        vi.mocked(fetchPatientThumbnails).mockReset();
        vi.mocked(createPatient).mockReset();
        vi.mocked(updatePatient).mockReset();
        vi.mocked(deletePatient).mockReset();
        vi.mocked(fetchPatientById).mockReset();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('setters', () => {
        it('setPatients reemplaza la lista', () => {
            store().setPatients([patient('1')]);
            store().setPatients([patient('2')]);
            expect(store().patients.map((p) => p.id)).toEqual(['2']);
        });

        it('addPatient prepend', () => {
            store().setPatients([patient('1')]);
            store().addPatient(patient('0'));
            expect(store().patients.map((p) => p.id)).toEqual(['0', '1']);
        });

        it('updatePatient cambia el paciente y también el seleccionado', () => {
            store().setPatients([patient('1')]);
            store().setSelectedPatient(patient('1'));

            store().updatePatient(patient('1', { first_name: 'Maria' }));

            expect(store().patients[0].first_name).toBe('Maria');
            expect(store().selectedPatient?.first_name).toBe('Maria');
        });

        it('updatePatient ignora ids distintos', () => {
            store().setPatients([patient('1')]);
            store().updatePatient(patient('9', { first_name: 'Otra' }));
            expect(store().patients[0].first_name).toBe('Ana');
        });

        it('removePatient limpia también el seleccionado', () => {
            store().setPatients([patient('1'), patient('2')]);
            store().setSelectedPatient(patient('1'));

            store().removePatient('1');

            expect(store().patients.map((p) => p.id)).toEqual(['2']);
            expect(store().selectedPatient).toBeNull();
        });

        it('removePatient conserva otro paciente seleccionado', () => {
            store().setPatients([patient('1'), patient('2')]);
            store().setSelectedPatient(patient('2'));

            store().removePatient('1');

            expect(store().selectedPatient?.id).toBe('2');
        });
    });

    describe('searchPatients', () => {
        beforeEach(() => {
            store().setPatients([
                patient('1', { first_name: 'Ana', first_lastname: 'Garcia' }),
                patient('2', { first_name: 'Luis', second_name: 'Alberto', first_lastname: 'Lopez' }),
                patient('3', { first_name: 'Maria', first_lastname: 'Garcia' }),
            ]);
        });

        it('filtra por apellido sin distinguir mayúsculas', async () => {
            await store().searchPatients('GARCIA');
            expect(store().patients.map((p) => p.id)).toEqual(['1', '3']);
        });

        it('filtra por nombre de pila', async () => {
            await store().searchPatients('luis');
            expect(store().patients.map((p) => p.id)).toEqual(['2']);
        });

        it('filtra por nombre del segundo apellido incluido', async () => {
            await store().searchPatients('alberto');
            expect(store().patients.map((p) => p.id)).toEqual(['2']);
        });

        it('con string vacío devuelve todos', async () => {
            await store().searchPatients('');
            expect(store().patients).toHaveLength(3);
        });

        it('guarda la consulta y apaga isLoading', async () => {
            await store().searchPatients('garcia');
            expect(store().searchQuery).toBe('garcia');
            expect(store().isLoading).toBe(false);
        });
    });

    describe('loadDashboard', () => {
        beforeEach(() => {
            vi.useFakeTimers();
            vi.setSystemTime(new Date('2026-06-15T12:00:00Z'));
            vi.mocked(fetchPatients).mockResolvedValue([patient('1')] as never);
            vi.mocked(fetchApiPatientsSummary).mockResolvedValue({
                items: [summaryItem(1), summaryItem(2, { batteryCount: 0, hasActivePlan: false })],
                totalAdultos: 2,
                conPlanActivo: 1,
            } as never);
            vi.mocked(fetchPatientThumbnails).mockResolvedValue({ '1': 'data:img' } as never);
        });

        it('carga la lista reciente con limit=3 por defecto', async () => {
            await store().loadDashboard();

            expect(fetchPatients).toHaveBeenCalledWith({ limit: 3, order: 'recientes' });
            expect(store().patientsScope).toBe('recent');
        });

        it('transforma el resumen en mapas de apoyo', async () => {
            await store().loadDashboard();

            expect(store().batteryCounts).toEqual({ 1: 1, 2: 0 });
            expect(store().activePlanMap).toEqual({ 1: true, 2: false });
            expect(store().exerciseData['1']).toEqual({
                todayCompleted: 1,
                todayTotal: 2,
                weeklyCompliance: 80,
                lastExerciseDate: '2026-01-01',
            });
            expect(store().totals).toEqual({ totalAdultos: 2, conPlanActivo: 1 });
            expect(store().photoThumbnails).toEqual({ '1': 'data:img' });
        });

        it('usa el caché mientras no pase el TTL de 60 s', async () => {
            await store().loadDashboard();
            expect(fetchPatients).toHaveBeenCalledTimes(1);

            vi.setSystemTime(new Date('2026-06-15T12:00:30Z'));
            await store().loadDashboard();

            expect(fetchPatients).toHaveBeenCalledTimes(1);
            expect(fetchApiPatientsSummary).toHaveBeenCalledTimes(1);
        });

        it('refresca al superar el TTL', async () => {
            await store().loadDashboard();

            vi.setSystemTime(new Date('2026-06-15T12:01:01Z'));
            await store().loadDashboard();

            expect(fetchPatients).toHaveBeenCalledTimes(2);
            expect(fetchApiPatientsSummary).toHaveBeenCalledTimes(2);
        });

        it('force refresca aunque el caché esté fresco', async () => {
            await store().loadDashboard();
            await store().loadDashboard({ force: true });

            expect(fetchPatients).toHaveBeenCalledTimes(2);
        });

        it('scope all pide la lista completa aunque el caché de "recent" esté fresco', async () => {
            await store().loadDashboard();
            await store().loadDashboard({ scope: 'all' });

            expect(fetchPatients).toHaveBeenLastCalledWith({});
            expect(store().patientsScope).toBe('all');
        });

        it('si todo el caché sirve no marca isLoading', async () => {
            await store().loadDashboard();
            const spy = vi.fn();
            usePatientsStore.subscribe(spy);
            spy.mockClear();

            await store().loadDashboard();

            expect(spy).not.toHaveBeenCalled();
        });

        it('apaga isLoading aunque la API falle', async () => {
            vi.mocked(fetchPatients).mockRejectedValue(new Error('sin red'));

            await store().loadDashboard();

            expect(store().isLoading).toBe(false);
        });
    });

    describe('CRUD', () => {
        it('createPatient añade el paciente devuelto', async () => {
            vi.mocked(createPatient).mockResolvedValue(patient('nuevo') as never);

            const ok = await store().createPatient({} as never, '7');

            expect(ok).toBe(true);
            expect(store().patients[0].id).toBe('nuevo');
        });

        it('createPatient devuelve false si la API no devuelve paciente', async () => {
            vi.mocked(createPatient).mockResolvedValue(null as never);
            expect(await store().createPatient({} as never, '7')).toBe(false);
        });

        it('createPatient devuelve false si la API lanza', async () => {
            vi.mocked(createPatient).mockRejectedValue(new Error('fallo'));
            expect(await store().createPatient({} as never, '7')).toBe(false);
            expect(store().isLoading).toBe(false);
        });

        it('updatePatientData hace merge con el paciente actual', async () => {
            store().setPatients([
                patient('1', { first_name: 'Ana', first_lastname: 'Garcia', gender: 'female' }),
            ]);
            vi.mocked(updatePatient).mockResolvedValue(
                patient('1', { first_name: 'Maria', first_lastname: 'Garcia' }) as never,
            );

            const ok = await store().updatePatientData('1', { first_name: 'Maria' });

            expect(ok).toBe(true);
            expect(updatePatient).toHaveBeenCalledWith(
                '1',
                expect.objectContaining({
                    first_name: 'Maria',
                    first_lastname: 'Garcia',
                    gender: 'female',
                }),
            );
            expect(store().patients[0].first_name).toBe('Maria');
        });

        it('updatePatientData devuelve false si el paciente no está en la lista', async () => {
            expect(await store().updatePatientData('404', {} as never)).toBe(false);
            expect(updatePatient).not.toHaveBeenCalled();
        });

        it('deletePatient elimina de la lista', async () => {
            store().setPatients([patient('1'), patient('2')]);
            vi.mocked(deletePatient).mockResolvedValue(true as never);

            const ok = await store().deletePatientData('1');

            expect(ok).toBe(true);
            expect(store().patients.map((p) => p.id)).toEqual(['2']);
        });

        it('deletePatient devuelve false si la API falla', async () => {
            store().setPatients([patient('1')]);
            vi.mocked(deletePatient).mockRejectedValue(new Error('sin permisos'));

            expect(await store().deletePatientData('1')).toBe(false);
            expect(store().patients).toHaveLength(1);
        });

        it('loadPatientDetails selecciona el paciente', async () => {
            vi.mocked(fetchPatientById).mockResolvedValue(patient('5') as never);

            await store().loadPatientDetails('5');

            expect(store().selectedPatient?.id).toBe('5');
            expect(store().isLoading).toBe(false);
        });

        it('loadPatientDetails no cambia la selección si la API devuelve null', async () => {
            store().setSelectedPatient(patient('1'));
            vi.mocked(fetchPatientById).mockResolvedValue(null as never);

            await store().loadPatientDetails('9');

            expect(store().selectedPatient?.id).toBe('1');
        });
    });
});
