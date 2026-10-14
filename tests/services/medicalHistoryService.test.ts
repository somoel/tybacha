import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    createApiMedicalNote,
    createApiMedication,
    createApiPathology,
    deleteApiMedicalNote,
    deleteApiMedication,
    deleteApiPathology,
    fetchApiMedicalNotes,
    fetchApiMedications,
    fetchApiPathologies,
    updateApiMedicalNote,
    updateApiMedication,
    updateApiPathology,
} from '@/src/api/medicalHistoryApi';
import { enqueueOfflineOperation } from '@/src/lib/offlineQueue';
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

vi.mock('@/src/api/medicalHistoryApi', () => ({
    createApiMedicalNote: vi.fn(),
    createApiMedication: vi.fn(),
    createApiPathology: vi.fn(),
    deleteApiMedicalNote: vi.fn(),
    deleteApiMedication: vi.fn(),
    deleteApiPathology: vi.fn(),
    fetchApiMedicalNotes: vi.fn(),
    fetchApiMedications: vi.fn(),
    fetchApiPathologies: vi.fn(),
    updateApiMedicalNote: vi.fn(),
    updateApiMedication: vi.fn(),
    updateApiPathology: vi.fn(),
}));

vi.mock('@/src/lib/offlineQueue', () => ({
    enqueueOfflineOperation: vi.fn().mockResolvedValue('uuid-local'),
}));

describe('pathologies', () => {
    beforeEach(() => {
        vi.mocked(fetchApiPathologies).mockReset();
        vi.mocked(createApiPathology).mockReset();
    });

    it('fetchPathologies mapea los campos', async () => {
        vi.mocked(fetchApiPathologies).mockResolvedValue([
            {
                idPatologiaAdultoMayor: 1,
                idAdultoMayor: 7,
                nombre: 'Hipertensión',
                descripcion: 'controlada',
                fechaDiagnostico: '2010-01-01',
                estado: 'activa',
                registradoPor: 3,
                registradoPorNombre: 'Doc',
                creadoEn: 'a',
                actualizadoEn: 'b',
            },
        ] as never);

        const [pathology] = await fetchPathologies(7);

        expect(pathology).toEqual({
            id: '1',
            olderAdultId: '7',
            nombre: 'Hipertensión',
            descripcion: 'controlada',
            fechaDiagnostico: '2010-01-01',
            estado: 'activa',
            registradoPor: '3',
            registradoPorNombre: 'Doc',
            creadoEn: 'a',
            actualizadoEn: 'b',
        });
    });

    it('createPathology online envía solo los campos del formulario', async () => {
        vi.mocked(createApiPathology).mockResolvedValue({
            idPatologiaAdultoMayor: 2,
            idAdultoMayor: 7,
            nombre: 'Diabetes',
            estado: 'activa',
            creadoEn: 'a',
            actualizadoEn: 'a',
        } as never);

        const created = await createPathology(
            7,
            {
                nombre: 'Diabetes',
                descripcion: 'tipo 2',
                fechaDiagnostico: '2015-05-05',
                estado: 'activa',
            },
            true,
        );

        expect(createApiPathology).toHaveBeenCalledWith(7, {
            nombre: 'Diabetes',
            descripcion: 'tipo 2',
            fechaDiagnostico: '2015-05-05',
            estado: 'activa',
        });
        expect(created.id).toBe('2');
    });

    it('createPathology offline encola la operación', async () => {
        const created = await createPathology(
            7,
            { nombre: 'Diabetes', estado: 'activa' },
            false,
        );

        expect(enqueueOfflineOperation).toHaveBeenCalledWith(
            'patologia_adulto_mayor',
            'crear',
            { nombre: 'Diabetes', estado: 'activa', idAdultoMayor: 7 },
        );
        expect(created.id).toBe('uuid-local');
        expect(created.olderAdultId).toBe('7');
        expect(created.creadoEn).toBeTruthy();
    });

    it('update/delete delegan en la API', async () => {
        vi.mocked(updateApiPathology).mockReset();
        vi.mocked(deleteApiPathology).mockReset();

        await updatePathology(7, 1, { estado: 'resuelta' });
        await deletePathology(7, 1);

        expect(updateApiPathology).toHaveBeenCalledWith(7, 1, { estado: 'resuelta' });
        expect(deleteApiPathology).toHaveBeenCalledWith(7, 1);
    });
});

describe('medications', () => {
    beforeEach(() => {
        vi.mocked(fetchApiMedications).mockReset();
        vi.mocked(createApiMedication).mockReset();
    });

    it('fetchMedications mapea los campos', async () => {
        vi.mocked(fetchApiMedications).mockResolvedValue([
            {
                idMedicamentoAdultoMayor: 4,
                idAdultoMayor: 7,
                nombre: 'Metformina',
                dosis: '850mg',
                frecuencia: 'cada 12h',
                viaAdministracion: 'oral',
                fechaInicio: '2015-01-01',
                fechaFin: null,
                estado: 'activo',
                observaciones: 'con comida',
                registradoPor: 3,
                registradoPorNombre: 'Doc',
                creadoEn: 'a',
                actualizadoEn: 'b',
            },
        ] as never);

        const [medication] = await fetchMedications(7);

        expect(medication).toMatchObject({
            id: '4',
            olderAdultId: '7',
            nombre: 'Metformina',
            dosis: '850mg',
            frecuencia: 'cada 12h',
            viaAdministracion: 'oral',
            fechaInicio: '2015-01-01',
            fechaFin: undefined,
            estado: 'activo',
            observaciones: 'con comida',
            registradoPor: '3',
            registradoPorNombre: 'Doc',
        });
    });

    it('createMedication online envía el payload', async () => {
        vi.mocked(createApiMedication).mockResolvedValue({
            idMedicamentoAdultoMayor: 5,
            idAdultoMayor: 7,
            nombre: 'Metformina',
            estado: 'activo',
            creadoEn: 'a',
            actualizadoEn: 'a',
        } as never);

        const created = await createMedication(7, {
            nombre: 'Metformina',
            dosis: '850mg',
            frecuencia: 'cada 12h',
            viaAdministracion: 'oral',
            fechaInicio: '2015-01-01',
            fechaFin: undefined,
            estado: 'activo',
            observaciones: null as never,
        });

        expect(createApiMedication).toHaveBeenCalledWith(7, {
            nombre: 'Metformina',
            dosis: '850mg',
            frecuencia: 'cada 12h',
            viaAdministracion: 'oral',
            fechaInicio: '2015-01-01',
            fechaFin: undefined,
            estado: 'activo',
            observaciones: null,
        });
        expect(created.id).toBe('5');
    });

    it('createMedication offline encola la operación', async () => {
        const created = await createMedication(
            7,
            { nombre: 'Ibuprofeno', estado: 'activo' },
            false,
        );

        expect(enqueueOfflineOperation).toHaveBeenCalledWith(
            'medicamento_adulto_mayor',
            'crear',
            { nombre: 'Ibuprofeno', estado: 'activo', idAdultoMayor: 7 },
        );
        expect(created.id).toBe('uuid-local');
    });

    it('update/delete delegan en la API', async () => {
        vi.mocked(updateApiMedication).mockReset();
        vi.mocked(deleteApiMedication).mockReset();

        await updateMedication(7, 4, { estado: 'suspendido' });
        await deleteMedication(7, 4);

        expect(updateApiMedication).toHaveBeenCalledWith(7, 4, { estado: 'suspendido' });
        expect(deleteApiMedication).toHaveBeenCalledWith(7, 4);
    });
});

describe('medical notes', () => {
    beforeEach(() => {
        vi.mocked(fetchApiMedicalNotes).mockReset();
        vi.mocked(createApiMedicalNote).mockReset();
    });

    it('fetchMedicalNotes mapea los campos', async () => {
        vi.mocked(fetchApiMedicalNotes).mockResolvedValue([
            {
                idNotaHistorialMedico: 9,
                idAdultoMayor: 7,
                tipoNota: 'consulta',
                contenido: 'todo estable',
                registradoPor: 3,
                registradoPorNombre: 'Doc',
                creadoEn: 'a',
            },
        ] as never);

        const [note] = await fetchMedicalNotes(7);

        expect(note).toEqual({
            id: '9',
            olderAdultId: '7',
            tipoNota: 'consulta',
            contenido: 'todo estable',
            registradoPor: '3',
            registradoPorNombre: 'Doc',
            creadoEn: 'a',
        });
    });

    it('createMedicalNote online envía solo tipo y contenido', async () => {
        vi.mocked(createApiMedicalNote).mockResolvedValue({
            idNotaHistorialMedico: 10,
            idAdultoMayor: 7,
            tipoNota: 'evolucion',
            contenido: 'mejora',
            creadoEn: 'a',
        } as never);

        const created = await createMedicalNote(7, {
            tipoNota: 'evolucion',
            contenido: 'mejora',
        } as never);

        expect(createApiMedicalNote).toHaveBeenCalledWith(7, {
            tipoNota: 'evolucion',
            contenido: 'mejora',
        });
        expect(created.id).toBe('10');
    });

    it('createMedicalNote offline encola la operación', async () => {
        const created = await createMedicalNote(
            7,
            { tipoNota: 'evolucion', contenido: 'mejora' } as never,
            false,
        );

        expect(enqueueOfflineOperation).toHaveBeenCalledWith(
            'nota_historial_medico',
            'crear',
            { tipoNota: 'evolucion', contenido: 'mejora', idAdultoMayor: 7 },
        );
        expect(created.id).toBe('uuid-local');
        expect(created).not.toHaveProperty('actualizadoEn');
    });

    it('update/delete delegan en la API', async () => {
        vi.mocked(updateApiMedicalNote).mockReset();
        vi.mocked(deleteApiMedicalNote).mockReset();

        await updateMedicalNote(7, 9, { contenido: 'x' });
        await deleteMedicalNote(7, 9);

        expect(updateApiMedicalNote).toHaveBeenCalledWith(7, 9, { contenido: 'x' });
        expect(deleteApiMedicalNote).toHaveBeenCalledWith(7, 9);
    });
});
