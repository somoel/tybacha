import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    createOlderAdultSftApplication,
    fetchActiveSftBatteries,
    fetchOlderAdultSftApplications,
    fetchSftApplicationDetail,
    fetchSftBatteryTests,
} from '@/src/api/sftApi';
import {
    buildSftApplicationPayload,
    fetchBatteries,
    fetchBatteryWithResults,
    submitSftApplication,
} from '@/src/services/batteryService';
import type { SFTTestType } from '@/src/types/battery.types';

vi.mock('@/src/api/sftApi', () => ({
    createOlderAdultSftApplication: vi.fn(),
    fetchActiveSftBatteries: vi.fn(),
    fetchOlderAdultSftApplications: vi.fn(),
    fetchSftApplicationDetail: vi.fn(),
    fetchSftBatteryTests: vi.fn(),
}));

describe('buildSftApplicationPayload', () => {
    it('convierte el id a número y usa la fecha actual por defecto', () => {
        const before = Date.now();
        const payload = buildSftApplicationPayload({
            patientId: '42',
            results: { chair_stand: 14 },
            resultNotes: {},
        });

        expect(payload.idAdultoMayor).toBe(42);
        expect(payload.resultados).toEqual([{ testType: 'chair_stand', valorNumerico: 14 }]);
        expect(Date.parse(payload.fechaAplicacion)).toBeGreaterThanOrEqual(before);
    });

    it('respeta la fecha de aplicación indicada', () => {
        const payload = buildSftApplicationPayload({
            patientId: '1',
            results: { arm_curl: 12 },
            resultNotes: {},
            fechaAplicacion: '2026-01-01T00:00:00.000Z',
        });

        expect(payload.fechaAplicacion).toBe('2026-01-01T00:00:00.000Z');
    });

    it('descarta resultados con valor undefined', () => {
        const payload = buildSftApplicationPayload({
            patientId: '1',
            results: { chair_stand: 14, arm_curl: undefined, up_and_go: 4.5 },
            resultNotes: {},
        });

        expect(payload.resultados.map((r) => r.testType)).toEqual(['chair_stand', 'up_and_go']);
    });

    it('incluye observaciones por prueba solo si no están vacías', () => {
        const payload = buildSftApplicationPayload({
            patientId: '1',
            results: { chair_stand: 14, arm_curl: 12, back_scratch: 0 },
            resultNotes: {
                chair_stand: 'dolor leve',
                arm_curl: '   ',
                back_scratch: '',
            },
        });

        expect(payload.resultados).toEqual([
            { testType: 'chair_stand', valorNumerico: 14, observaciones: 'dolor leve' },
            { testType: 'arm_curl', valorNumerico: 12 },
            { testType: 'back_scratch', valorNumerico: 0 },
        ]);
    });

    it('omite las observaciones generales si están vacías', () => {
        const base = { patientId: '1', results: { chair_stand: 1 }, resultNotes: {} };

        expect(buildSftApplicationPayload({ ...base, notes: '  ' })).not.toHaveProperty(
            'observaciones',
        );
        expect(buildSftApplicationPayload({ ...base, notes: 'ok' }).observaciones).toBe('ok');
    });

    it('omite peso, estatura e IMC cuando son null', () => {
        const payload = buildSftApplicationPayload({
            patientId: '1',
            results: { chair_stand: 1 },
            resultNotes: {},
            pesoKg: null,
            estaturaCm: null,
            imc: null,
        });

        expect(payload).not.toHaveProperty('pesoKg');
        expect(payload).not.toHaveProperty('estaturaCm');
        expect(payload).not.toHaveProperty('imc');
    });

    it('incluye peso, estatura e IMC cuando hay valores', () => {
        const payload = buildSftApplicationPayload({
            patientId: '1',
            results: { chair_stand: 1 },
            resultNotes: {},
            pesoKg: 70,
            estaturaCm: 170,
            imc: 24.22,
        });

        expect(payload).toMatchObject({ pesoKg: 70, estaturaCm: 170, imc: 24.22 });
    });
});

describe('submitSftApplication', () => {
    const activeBatteries = [
        { idBateriaSft: 1, nombre: 'Batería geriátrica' },
        { idBateriaSft: 2, nombre: 'Senior Fitness Test' },
    ];

    const tests = [
        { idPruebaSft: 101, orden: 1 },
        { idPruebaSft: 102, orden: 2 },
        { idPruebaSft: 104, orden: 4 },
        { idPruebaSft: 107, orden: 7 },
    ];

    beforeEach(() => {
        vi.mocked(fetchActiveSftBatteries).mockResolvedValue(activeBatteries as never);
        vi.mocked(fetchSftBatteryTests).mockResolvedValue(tests as never);
        vi.mocked(createOlderAdultSftApplication).mockResolvedValue({
            idAplicacionSft: 500,
        } as never);
    });

    it('falla si no hay batería SFT activa', async () => {
        vi.mocked(fetchActiveSftBatteries).mockResolvedValue([
            { idBateriaSft: 1, nombre: 'Otra' },
        ] as never);

        await expect(
            submitSftApplication({
                idAdultoMayor: 1,
                fechaAplicacion: 'x',
                resultados: [{ testType: 'chair_stand', valorNumerico: 10 }],
            }),
        ).rejects.toThrow('No hay bateria SFT activa');
    });

    it('elige la batería por nombre exacto antes que por coincidencia parcial', async () => {
        vi.mocked(fetchActiveSftBatteries).mockResolvedValue([
            { idBateriaSft: 1, nombre: 'Senior Fitness Test 2026' },
            { idBateriaSft: 2, nombre: 'Senior Fitness Test' },
        ] as never);

        await submitSftApplication({
            idAdultoMayor: 1,
            fechaAplicacion: 'x',
            resultados: [{ testType: 'chair_stand', valorNumerico: 10 }],
        });

        expect(fetchSftBatteryTests).toHaveBeenCalledWith(2);
    });

    it('acepta una batería cuyo nombre contenga "Senior Fitness Test"', async () => {
        vi.mocked(fetchActiveSftBatteries).mockResolvedValue([
            { idBateriaSft: 9, nombre: 'SFT — Senior Fitness Test anual' },
        ] as never);

        await submitSftApplication({
            idAdultoMayor: 1,
            fechaAplicacion: 'x',
            resultados: [{ testType: 'chair_stand', valorNumerico: 10 }],
        });

        expect(fetchSftBatteryTests).toHaveBeenCalledWith(9);
    });

    it('mapea testType → idPruebaSft por orden', async () => {
        const result = await submitSftApplication({
            idAdultoMayor: 1,
            fechaAplicacion: 'x',
            resultados: [
                { testType: 'chair_stand', valorNumerico: 14 },
                { testType: 'up_and_go', valorNumerico: 4.5, observaciones: 'rápido' },
            ],
        });

        expect(createOlderAdultSftApplication).toHaveBeenCalledWith(
            1,
            expect.objectContaining({
                idBateriaSft: 2,
                resultados: [
                    { idPruebaSft: 101, valorNumerico: 14 },
                    { idPruebaSft: 107, valorNumerico: 4.5, observaciones: 'rápido' },
                ],
            }),
        );
        expect(result.batteryId).toBe('500');
        expect(result.results).toEqual([
            {
                id: '500-101',
                battery_id: '500',
                test_type: 'chair_stand',
                value: 14,
                unit: 'reps',
                notes: undefined,
            },
            {
                id: '500-107',
                battery_id: '500',
                test_type: 'up_and_go',
                value: 4.5,
                unit: 'seconds',
                notes: 'rápido',
            },
        ]);
    });

    it('descarta resultados cuya prueba no exista en la batería', async () => {
        const result = await submitSftApplication({
            idAdultoMayor: 1,
            fechaAplicacion: 'x',
            resultados: [
                { testType: 'six_min_walk' as SFTTestType, valorNumerico: 500 },
                { testType: 'chair_stand', valorNumerico: 14 },
            ],
        });

        expect(result.results).toHaveLength(1);
        expect(result.results[0].test_type).toBe('chair_stand');
    });

    it('falla si ninguna prueba tiene prueba asociada', async () => {
        await expect(
            submitSftApplication({
                idAdultoMayor: 1,
                fechaAplicacion: 'x',
                resultados: [{ testType: 'six_min_walk' as SFTTestType, valorNumerico: 500 }],
            }),
        ).rejects.toThrow('No hay resultados SFT para guardar');
    });

    it('propaga el idLocal de idempotencia cuando se pasa', async () => {
        await submitSftApplication(
            {
                idAdultoMayor: 1,
                fechaAplicacion: 'x',
                resultados: [{ testType: 'chair_stand', valorNumerico: 14 }],
            },
            'local-uuid-1',
        );

        expect(createOlderAdultSftApplication).toHaveBeenCalledWith(
            1,
            expect.objectContaining({ idLocalSincronizacion: 'local-uuid-1' }),
        );
    });

    it('no envía idLocalSincronizacion si no se pasa', async () => {
        await submitSftApplication({
            idAdultoMayor: 1,
            fechaAplicacion: 'x',
            resultados: [{ testType: 'chair_stand', valorNumerico: 14 }],
        });

        expect(createOlderAdultSftApplication).not.toHaveBeenCalledWith(
            1,
            expect.objectContaining({ idLocalSincronizacion: expect.anything() }),
        );
    });
});

describe('fetchBatteries', () => {
    it('filtra las no finalizadas y ordena de más reciente a más antigua', async () => {
        vi.mocked(fetchOlderAdultSftApplications).mockResolvedValue([
            {
                idAplicacionSft: 1,
                idAdultoMayor: 5,
                estado: 'finalizada',
                fechaAplicacion: '2026-01-01T10:00:00.000Z',
                responsable: 3,
                observaciones: 'ok',
                pesoKg: 70,
                estaturaCm: 170,
                imc: 24.2,
            },
            {
                idAplicacionSft: 2,
                idAdultoMayor: 5,
                estado: 'borrador',
                fechaAplicacion: '2026-03-01T10:00:00.000Z',
            },
            {
                idAplicacionSft: 3,
                idAdultoMayor: 5,
                estado: 'finalizada',
                fechaAplicacion: '2026-02-01T10:00:00.000Z',
                responsable: null,
            },
        ] as never);

        const batteries = await fetchBatteries('5');

        expect(batteries.map((b) => b.id)).toEqual(['3', '1']);
        expect(batteries[0].performed_by).toBe('');
        expect(batteries[1].performed_by).toBe('3');
        expect(batteries[1]).toMatchObject({
            patient_id: '5',
            notes: 'ok',
            is_synced: true,
            peso_kg: 70,
            estatura_cm: 170,
            imc: 24.2,
        });
    });

    it('devuelve lista vacía si no hay aplicaciones', async () => {
        vi.mocked(fetchOlderAdultSftApplications).mockResolvedValue([] as never);
        expect(await fetchBatteries('5')).toEqual([]);
    });
});

describe('fetchBatteryWithResults', () => {
    it('mapea los resultados por orden de prueba', async () => {
        vi.mocked(fetchSftApplicationDetail).mockResolvedValue({
            idAplicacionSft: 7,
            idAdultoMayor: 5,
            estado: 'finalizada',
            fechaAplicacion: '2026-01-01T10:00:00.000Z',
            responsable: 3,
            observaciones: 'nota',
            resultados: [
                { idResultadoSft: 1, orden: 1, valorNumerico: 14, pruebaNombre: 'x' },
                { idResultadoSft: 2, orden: 7, valorNumerico: 4.2, pruebaNombre: 'y' },
            ],
        } as never);

        const battery = await fetchBatteryWithResults('7');

        expect(battery?.results.map((r) => r.test_type)).toEqual(['chair_stand', 'up_and_go']);
        expect(battery?.results.map((r) => r.unit)).toEqual(['reps', 'seconds']);
        expect(battery?.results[1].value).toBe(4.2);
    });

    it('usa el nombre normalizado cuando falta el orden', async () => {
        vi.mocked(fetchSftApplicationDetail).mockResolvedValue({
            idAplicacionSft: 7,
            idAdultoMayor: 5,
            fechaAplicacion: '2026-01-01T10:00:00.000Z',
            responsable: 3,
            resultados: [
                {
                    idResultadoSft: 1,
                    orden: null,
                    valorNumerico: null,
                    valorTexto: '12',
                    pruebaNombre: 'Flexión del tronco en silla',
                },
            ],
        } as never);

        const battery = await fetchBatteryWithResults('7');

        expect(battery?.results[0].test_type).toBe('chair_sit_reach');
        expect(battery?.results[0].value).toBe(12);
        expect(battery?.results[0].unit).toBe('cm');
    });

    it('acepta nombres legados de la semilla antigua', async () => {
        vi.mocked(fetchSftApplicationDetail).mockResolvedValue({
            idAplicacionSft: 7,
            idAdultoMayor: 5,
            fechaAplicacion: '2026-01-01T10:00:00.000Z',
            resultados: [
                { idResultadoSft: 1, orden: null, valorNumerico: 9, pruebaNombre: 'Flexion de codo' },
            ],
        } as never);

        const battery = await fetchBatteryWithResults('7');
        expect(battery?.results[0].test_type).toBe('arm_curl');
    });

    it('cae a chair_stand si no reconoce la prueba', async () => {
        vi.mocked(fetchSftApplicationDetail).mockResolvedValue({
            idAplicacionSft: 7,
            idAdultoMayor: 5,
            fechaAplicacion: '2026-01-01T10:00:00.000Z',
            resultados: [
                { idResultadoSft: 1, orden: null, valorNumerico: 1, pruebaNombre: 'desconocida' },
            ],
        } as never);

        const battery = await fetchBatteryWithResults('7');
        expect(battery?.results[0].test_type).toBe('chair_stand');
    });

    it('cae a 0 si no hay ni valor numérico ni texto', async () => {
        vi.mocked(fetchSftApplicationDetail).mockResolvedValue({
            idAplicacionSft: 7,
            idAdultoMayor: 5,
            fechaAplicacion: '2026-01-01T10:00:00.000Z',
            resultados: [{ idResultadoSft: 1, orden: 1, valorNumerico: null, valorTexto: null }],
        } as never);

        const battery = await fetchBatteryWithResults('7');
        expect(battery?.results[0].value).toBe(0);
    });
});
