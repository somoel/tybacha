import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    createApiExercisePlan,
    fetchApiExercisePlan,
    fetchApiExercisePlans,
    generateApiExercisePlan,
    updateApiExercisePlan,
    updateApiExercisePlanStatus,
} from '@/src/api/exercisePlansApi';
import { createApiExerciseRecord } from '@/src/api/trackingApi';
import { enqueueOfflineOperation } from '@/src/lib/offlineQueue';
import {
    createExercisePlan,
    fetchExerciseLogs,
    fetchExercisePlans,
    generateExercisePlan,
    logExerciseCompletion,
    updateExercisePlan,
    updatePlanStatus,
} from '@/src/services/exercisePlanService';
import type { Patient } from '@/src/types/patient.types';

vi.mock('@/src/api/exercisePlansApi', () => ({
    createApiExercisePlan: vi.fn(),
    fetchApiExercisePlan: vi.fn(),
    fetchApiExercisePlans: vi.fn(),
    generateApiExercisePlan: vi.fn(),
    updateApiExercisePlan: vi.fn(),
    updateApiExercisePlanStatus: vi.fn(),
}));

vi.mock('@/src/api/trackingApi', () => ({
    createApiExerciseRecord: vi.fn(),
}));

vi.mock('@/src/lib/offlineQueue', () => ({
    enqueueOfflineOperation: vi.fn().mockResolvedValue('id-local-log'),
}));

function apiPlan(overrides: Record<string, unknown> = {}) {
    return {
        idPlanEjercicio: 10,
        idAdultoMayor: 7,
        titulo: 'Plan semanal',
        objetivo: 'mejorar fuerza',
        origen: 'ia',
        estado: 'activo',
        nivelDificultad: 'medio',
        fechaInicio: '2026-01-01',
        fechaFin: '2026-02-01',
        creadoEn: '2026-01-01T10:00:00.000Z',
        creadoPor: 3,
        revisadoPor: null,
        asignadoPor: null,
        datosPersonalizacion: { resumen: 'resumen IA' },
        ejercicios: [
            {
                idEjercicioPlan: 101,
                idPlanEjercicio: 10,
                nombre: 'Sentadillas',
                descripcion: 'sillas estables',
                diaSemana: 'lunes',
                orden: 1,
                series: 3,
                repeticiones: 10,
                duracionSegundos: null,
                descansoSegundos: 30,
                dificultad: 'medio',
                instrucciones: 'mantener espalda recta',
            },
            {
                idEjercicioPlan: 102,
                idPlanEjercicio: 10,
                nombre: null,
                descripcion: null,
                diaSemana: 'martes',
                orden: 2,
                series: null,
                repeticiones: null,
                duracionSegundos: 60,
                descansoSegundos: null,
                dificultad: 'bajo',
                instrucciones: null,
            },
        ],
        ...overrides,
    };
}

const patient = { id: '7' } as Patient;

describe('mapApiPlan (a través de generateExercisePlan)', () => {
    beforeEach(() => vi.mocked(generateApiExercisePlan).mockReset());

    it('llama al generador con los ids normalizados', async () => {
        vi.mocked(generateApiExercisePlan).mockResolvedValue(apiPlan() as never);

        await generateExercisePlan(patient, [], '3', '99');

        expect(generateApiExercisePlan).toHaveBeenCalledWith({
            idAdultoMayor: 7,
            idAplicacionSft: 99,
            titulo: 'Plan semanal personalizado',
        });
    });

    it('mapea el plan completo con ejercicios', async () => {
        vi.mocked(generateApiExercisePlan).mockResolvedValue(apiPlan() as never);

        const plan = await generateExercisePlan(patient, [], '3', '99');

        expect(plan).toMatchObject({
            id: '10',
            patient_id: '7',
            battery_id: '',
            generated_by: '3',
            status: 'active',
            titulo: 'Plan semanal',
            resumen: 'resumen IA',
            summary: 'mejorar fuerza',
        });
        expect(plan.exercises).toEqual([
            {
                index: 0,
                id_ejercicio_plan: 101,
                name: 'Sentadillas',
                description: 'sillas estables',
                sets: 3,
                reps: 10,
                duration_seconds: null,
                frequency: 'lunes',
                rationale: 'mantener espalda recta',
            },
            {
                index: 1,
                id_ejercicio_plan: 102,
                name: 'Ejercicio 2',
                description: '',
                sets: 1,
                reps: null,
                duration_seconds: 60,
                frequency: 'martes',
                rationale: '',
            },
        ]);
    });

    it('mapea estado finalizado y cancelado', async () => {
        vi.mocked(generateApiExercisePlan).mockResolvedValueOnce(
            apiPlan({ estado: 'finalizado' }) as never,
        );
        vi.mocked(generateApiExercisePlan).mockResolvedValueOnce(
            apiPlan({ estado: 'cancelado', creadoPor: null }) as never,
        );
        vi.mocked(generateApiExercisePlan).mockResolvedValueOnce(
            apiPlan({ creadoPor: null }) as never,
        );

        expect((await generateExercisePlan(patient, [], '3', '1')).status).toBe('completed');
        expect((await generateExercisePlan(patient, [], '3', '1')).status).toBe('cancelled');
        expect((await generateExercisePlan(patient, [], '3', '1')).generated_by).toBe('');
    });
});

describe('createExercisePlan / updateExercisePlan', () => {
    beforeEach(() => {
        vi.mocked(createApiExercisePlan).mockReset();
        vi.mocked(updateApiExercisePlan).mockReset();
    });

    it('crea el plan con el id del adulto convertido', async () => {
        vi.mocked(createApiExercisePlan).mockResolvedValue(apiPlan({ estado: 'borrador' }) as never);

        const plan = await createExercisePlan('7', {
            titulo: 'Manual',
            nivelDificultad: 'bajo',
            ejercicios: [],
        });

        expect(createApiExercisePlan).toHaveBeenCalledWith({
            idAdultoMayor: 7,
            titulo: 'Manual',
            nivelDificultad: 'bajo',
            ejercicios: [],
        });
        expect(plan.status).toBe('active');
    });

    it('actualiza el plan inyectando idAdultoMayor 0', async () => {
        vi.mocked(updateApiExercisePlan).mockResolvedValue(apiPlan() as never);

        await updateExercisePlan('10', { titulo: 'x', ejercicios: [] });

        expect(updateApiExercisePlan).toHaveBeenCalledWith(10, {
            idAdultoMayor: 0,
            titulo: 'x',
            ejercicios: [],
        });
    });
});

describe('fetchExercisePlans', () => {
    beforeEach(() => {
        vi.mocked(fetchApiExercisePlans).mockReset();
        vi.mocked(fetchApiExercisePlan).mockReset();
    });

    it('prefiere el detalle y cae al resumen si falla', async () => {
        vi.mocked(fetchApiExercisePlans).mockResolvedValue([
            { idPlanEjercicio: 10, idAdultoMayor: 7, creadoEn: 'x', titulo: 'a', estado: 'activo' },
            { idPlanEjercicio: 11, idAdultoMayor: 7, creadoEn: 'x', titulo: 'b', estado: 'finalizado' },
        ] as never);
        vi.mocked(fetchApiExercisePlan).mockImplementation(async (id) => {
            if (id === 10) return apiPlan() as never;
            throw new Error('sin detalle');
        });

        const plans = await fetchExercisePlans('7');

        expect(plans).toHaveLength(2);
        expect(plans[0].exercises).toHaveLength(2);
        expect(plans[1].exercises).toEqual([]);
        expect(plans[1].titulo).toBe('b');
        expect(plans[1].status).toBe('completed');
    });
});

describe('logExerciseCompletion', () => {
    beforeEach(() => {
        vi.mocked(fetchApiExercisePlan).mockReset();
        vi.mocked(createApiExerciseRecord).mockReset();
        vi.mocked(enqueueOfflineOperation).mockClear();
    });

    it('falla si el índice no existe en el plan', async () => {
        vi.mocked(fetchApiExercisePlan).mockResolvedValue(
            apiPlan({ ejercicios: [] }) as never,
        );

        await expect(
            logExerciseCompletion('10', 0, '3', { completed: true }),
        ).rejects.toThrow('Ejercicio no encontrado en el plan.');
    });

    it('registra la actividad y mapea la respuesta', async () => {
        vi.mocked(fetchApiExercisePlan).mockResolvedValue(apiPlan() as never);
        vi.mocked(createApiExerciseRecord).mockResolvedValue({
            idRegistroEjercicioPlan: 55,
            fechaRealizacion: '2026-05-05T12:00:00.000Z',
        } as never);

        const log = await logExerciseCompletion('10', 0, '3', {
            completed: true,
            value_achieved: 12,
            perceived_effort: 4,
            reported_pain: 0,
            notes: 'bien',
        });

        expect(createApiExerciseRecord).toHaveBeenCalledWith(
            expect.objectContaining({
                idEjercicioPlan: 101,
                idAdultoMayor: 7,
                estado: 'completado',
                repeticionesRealizadas: 12,
                esfuerzoPercibido: 4,
                dolorReportado: 0,
                comentario: 'bien',
            }),
        );
        expect(log).toMatchObject({
            id: '55',
            plan_id: '10',
            exercise_index: 0,
            logged_by: '3',
            logged_at: '2026-05-05T12:00:00.000Z',
            completed: true,
            value_achieved: 12,
            notes: 'bien',
        });
    });

    it('estado omitido cuando no se completó', async () => {
        vi.mocked(fetchApiExercisePlan).mockResolvedValue(apiPlan() as never);
        vi.mocked(createApiExerciseRecord).mockResolvedValue({
            idRegistroEjercicioPlan: 56,
            fechaRealizacion: null,
        } as never);

        const log = await logExerciseCompletion('10', 1, '3', { completed: false });

        expect(createApiExerciseRecord).toHaveBeenCalledWith(
            expect.objectContaining({ estado: 'omitido', idEjercicioPlan: 102 }),
        );
        expect(log.completed).toBe(false);
        expect(log.logged_at).toBeTruthy();
    });

    it('si la API falla encola la operación y devuelve un log optimista', async () => {
        vi.mocked(fetchApiExercisePlan).mockResolvedValue(apiPlan() as never);
        vi.mocked(createApiExerciseRecord).mockRejectedValue(new TypeError('Network request failed'));

        const log = await logExerciseCompletion('10', 0, '3', {
            completed: true,
            value_achieved: 5,
        });

        expect(enqueueOfflineOperation).toHaveBeenCalledWith(
            'registro_ejercicio_plan',
            'crear',
            expect.objectContaining({ idEjercicioPlan: 101, repeticionesRealizadas: 5 }),
        );
        expect(log.id).toMatch(/^10-0-\d{4}-\d{2}-\d{2}$/);
        expect(log.plan_id).toBe('10');
        expect(log.value_achieved).toBe(5);
        expect(log.logged_by).toBe('3');
    });
});

describe('updatePlanStatus / fetchExerciseLogs', () => {
    beforeEach(() => vi.mocked(updateApiExercisePlanStatus).mockReset());

    it('traduce el estado al vocabulario del API', async () => {
        vi.mocked(updateApiExercisePlanStatus).mockResolvedValue(undefined as never);

        await updatePlanStatus('10', 'completed');
        await updatePlanStatus('10', 'cancelled');
        await updatePlanStatus('10', 'active');

        expect(updateApiExercisePlanStatus).toHaveBeenCalledWith(10, 'finalizado');
        expect(updateApiExercisePlanStatus).toHaveBeenCalledWith(10, 'cancelado');
        expect(updateApiExercisePlanStatus).toHaveBeenCalledWith(10, 'activo');
    });

    it('fetchExerciseLogs todavía devuelve vacío', async () => {
        await expect(fetchExerciseLogs()).resolves.toEqual([]);
    });
});
