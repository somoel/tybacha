import {
    createOlderAdultSftApplication,
    fetchActiveSftBatteries,
    fetchOlderAdultSftApplications,
    fetchSftApplicationDetail,
    fetchSftBatteryTests,
} from '@/src/api/sftApi';
import { fetchApiExercisePlans } from '@/src/api/exercisePlansApi';
import { fetchApiExerciseRecords, fetchApiProgressStats } from '@/src/api/trackingApi';
import { fetchExercisePlans } from '@/src/services/exercisePlanService';
import { generateUUID } from '@/src/lib/sqlite';
import { SFT_TESTS } from '@/src/constants/sftTests';
import type { BatteryWithResults, SFTBattery, SFTResult, SFTTestType } from '@/src/types/battery.types';
import { format } from 'date-fns';

const pendingBatteryContext = new Map<string, { patientId: string; notes?: string; pesoKg?: number; estaturaCm?: number; imc?: number }>();

const TEST_TYPE_BY_ORDER: Record<number, SFTTestType> = {
    1: 'chair_stand',
    2: 'arm_curl',
    3: 'six_min_walk',
    4: 'two_min_step',
    5: 'chair_sit_reach',
    6: 'back_scratch',
    7: 'up_and_go',
};

const TEST_TYPE_BY_NORMALIZED_NAME: Record<string, SFTTestType> = {
    'sentarse y levantarse de silla': 'chair_stand',
    'flexion de codo': 'arm_curl',
    'flexion de codo arm curl': 'arm_curl',
    'caminata de 6 minutos': 'six_min_walk',
    'marcha estacionaria 2 minutos': 'two_min_step',
    'sentado y extenderse': 'chair_sit_reach',
    'sentado y extenderse chair sit and reach': 'chair_sit_reach',
    'rascarse la espalda': 'back_scratch',
    'rascarse la espalda back scratch': 'back_scratch',
    '8 foot up and go': 'up_and_go',
};

function normalizeTestName(name: string | null): string {
    return (name ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9]+/g, ' ')
        .trim()
        .toLowerCase();
}

function getTestTypeForApiTest(test: { orden: number; nombre?: string | null }): SFTTestType | undefined {
    return TEST_TYPE_BY_ORDER[test.orden] ?? TEST_TYPE_BY_NORMALIZED_NAME[normalizeTestName(test.nombre ?? null)];
}

export async function createBattery(
    patientId: string,
    performedBy: string,
    notes: string | undefined,
    _isOnline: boolean,
    pesoKg?: number,
    estaturaCm?: number,
    imc?: number,
): Promise<SFTBattery> {
    const tempId = generateUUID();
    pendingBatteryContext.set(tempId, { patientId, notes, pesoKg, estaturaCm, imc });

    return {
        id: tempId,
        patient_id: patientId,
        performed_by: performedBy,
        performed_at: new Date().toISOString(),
        notes,
        is_synced: false,
        peso_kg: pesoKg,
        estatura_cm: estaturaCm,
        imc,
    };
}

export async function saveBatteryResults(
    batteryId: string,
    results: Partial<Record<SFTTestType, number>>,
    resultNotes: Partial<Record<SFTTestType, string>> = {},
    _isOnline: boolean,
): Promise<SFTResult[]> {
    const context = pendingBatteryContext.get(batteryId);
    if (!context) {
        throw new Error('No se encontro la bateria SFT activa.');
    }

    const batteries = await fetchActiveSftBatteries();
    const activeBattery =
        batteries.find((battery) => battery.nombre.trim().toLowerCase() === 'senior fitness test') ??
        batteries.find((battery) => battery.nombre.trim().toLowerCase().includes('senior fitness test'));
    if (!activeBattery) {
        throw new Error('No hay bateria SFT activa en el servidor.');
    }

    const tests = await fetchSftBatteryTests(activeBattery.idBateriaSft);
    const payloadResults = tests
        .map((test) => {
            const testType = getTestTypeForApiTest(test);
            const value = testType ? results[testType] : undefined;
            if (value === undefined) return null;

            const note = testType ? resultNotes[testType] : undefined;
            return {
                idPruebaSft: test.idPruebaSft,
                valorNumerico: value,
                ...(note ? { observaciones: note } : {}),
            };
        })
        .filter((item): item is { idPruebaSft: number; valorNumerico: number; observaciones?: string } => item !== null);

    if (payloadResults.length === 0) {
        throw new Error('No hay resultados SFT para guardar. Revisa que las pruebas tengan valores registrados.');
    }

    const created = await createOlderAdultSftApplication(Number(context.patientId), {
        idBateriaSft: activeBattery.idBateriaSft,
        observaciones: context.notes,
        pesoKg: context.pesoKg,
        estaturaCm: context.estaturaCm,
        imc: context.imc,
        resultados: payloadResults,
    });

    pendingBatteryContext.delete(batteryId);

    return payloadResults.map((result) => {
        const test = tests.find((item) => item.idPruebaSft === result.idPruebaSft);
        const testType = test ? getTestTypeForApiTest(test) : undefined;
        const definition = SFT_TESTS.find((item) => item.type === testType);

        return {
            id: `${created.idAplicacionSft}-${result.idPruebaSft}`,
            battery_id: String(created.idAplicacionSft),
            test_type: testType ?? 'chair_stand',
            value: result.valorNumerico,
            unit: definition?.unit ?? 'reps',
            notes: result.observaciones,
        };
    });
}

export async function saveBatteryWithResults(
    batteryId: string,
    results: Partial<Record<SFTTestType, number>>,
    resultNotes: Partial<Record<SFTTestType, string>>,
    isOnline: boolean,
): Promise<{ batteryId: string; results: SFTResult[] }> {
    const savedResults = await saveBatteryResults(batteryId, results, resultNotes, isOnline);
    const savedBatteryId = savedResults[0]?.battery_id;

    if (!savedBatteryId) {
        throw new Error('No se pudo identificar la bateria SFT guardada.');
    }

    return {
        batteryId: savedBatteryId,
        results: savedResults,
    };
}

export async function fetchBatteries(patientId: string): Promise<SFTBattery[]> {
    const applications = await fetchOlderAdultSftApplications(Number(patientId));

    return applications
        .filter((application) => application.estado === 'finalizada')
        .sort((left, right) => new Date(right.fechaAplicacion).getTime() - new Date(left.fechaAplicacion).getTime())
        .map((application) => ({
            id: String(application.idAplicacionSft),
            patient_id: String(application.idAdultoMayor),
            performed_by: application.responsable ? String(application.responsable) : '',
            performed_at: application.fechaAplicacion,
            notes: application.observaciones ?? undefined,
            is_synced: true,
            peso_kg: application.pesoKg ?? undefined,
            estatura_cm: application.estaturaCm ?? undefined,
            imc: application.imc ?? undefined,
        }));
}

export async function fetchBatteryWithResults(batteryId: string): Promise<BatteryWithResults | null> {
    const application = await fetchSftApplicationDetail(Number(batteryId));

    return {
        id: String(application.idAplicacionSft),
        patient_id: String(application.idAdultoMayor),
        performed_by: application.responsable ? String(application.responsable) : '',
        performed_at: application.fechaAplicacion,
        notes: application.observaciones ?? undefined,
        is_synced: true,
        peso_kg: application.pesoKg ?? undefined,
        estatura_cm: application.estaturaCm ?? undefined,
        imc: application.imc ?? undefined,
        results: application.resultados.map((result) => {
            const testType = result.orden ? TEST_TYPE_BY_ORDER[result.orden] : TEST_TYPE_BY_NORMALIZED_NAME[normalizeTestName(result.pruebaNombre)];
            const definition = SFT_TESTS.find((item) => item.type === testType);

            return {
                id: String(result.idResultadoSft),
                battery_id: String(application.idAplicacionSft),
                test_type: testType ?? 'chair_stand',
                value: result.valorNumerico ?? Number(result.valorTexto ?? 0),
                unit: definition?.unit ?? 'reps',
                notes: result.observaciones ?? undefined,
            };
        }),
    };
}

export async function fetchBatteryCountsForPatients(
    patientIds: string[],
): Promise<Record<string, number>> {
    const counts: Record<string, number> = {};

    await Promise.all(
        patientIds.map(async (patientId) => {
            const batteries = await fetchBatteries(patientId);
            counts[patientId] = batteries.length;
        }),
    );

    return counts;
}

export async function fetchActivePlanStatus(
    patientIds: string[],
): Promise<Record<string, boolean>> {
    const entries = await Promise.all(
        patientIds.map(async (patientId) => {
            const plans = await fetchApiExercisePlans(Number(patientId));
            const hasActive = plans.some((plan) => ['asignado', 'activo', 'generado', 'revisado'].includes(plan.estado));
            return [patientId, hasActive] as const;
        }),
    );

    return Object.fromEntries(entries);
}

export interface WeeklyExerciseData {
    todayCompleted: number;
    todayTotal: number;
    weeklyCompliance: number;
    lastExerciseDate: string | null;
}

function getWeekRange(): { from: string; to: string } {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(now);
    monday.setDate(now.getDate() + mondayOffset);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return {
        from: format(monday, 'yyyy-MM-dd'),
        to: format(sunday, 'yyyy-MM-dd'),
    };
}

function getTodayKey(): string {
    const day = new Date().getDay();
    const map = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    return map[day];
}

/**
 * Fetches today's exercise completion status and weekly compliance for each patient.
 * Uses the active plan to determine today's total exercises scheduled.
 */
export async function fetchWeeklyExerciseDataForPatients(
    patientIds: string[],
): Promise<Record<string, WeeklyExerciseData>> {
    const todayKey = getTodayKey();
    const weekRange = getWeekRange();

    const results = await Promise.all(
        patientIds.map(async (patientId) => {
            try {
                const [records, progressStats, plans] = await Promise.all([
                    fetchApiExerciseRecords(Number(patientId), weekRange.from, weekRange.to),
                    fetchApiProgressStats(Number(patientId)),
                    fetchExercisePlans(patientId),
                ]);

                const activePlan = plans.find((p) => p.status === 'active');

                const todayExercises = activePlan?.exercises.filter((ex) => ex.frequency === todayKey) ?? [];
                const todayTotal = todayExercises.length;

                const completedTodayIds = new Set<number>();
                for (const record of records) {
                    if (record.estado === 'completado') {
                        const isTodayExercise = todayExercises.some(
                            (ex) => ex.id_ejercicio_plan === record.idEjercicioPlan
                        );
                        if (isTodayExercise) {
                            completedTodayIds.add(record.idEjercicioPlan);
                        }
                    }
                }
                const todayCompleted = completedTodayIds.size;

                const latestStats = progressStats[0];
                const weeklyCompliance = latestStats?.porcentaje_cumplimiento ?? 0;

                let lastExerciseDate: string | null = null;
                const completedRecords = records
                    .filter((r) => r.estado === 'completado' && r.fechaRealizacion)
                    .sort((a, b) => new Date(b.fechaRealizacion!).getTime() - new Date(a.fechaRealizacion!).getTime());
                if (completedRecords.length > 0) {
                    lastExerciseDate = completedRecords[0].fechaRealizacion!;
                }

                return [patientId, {
                    todayCompleted,
                    todayTotal,
                    weeklyCompliance,
                    lastExerciseDate,
                }] as const;
            } catch {
                return [patientId, {
                    todayCompleted: 0,
                    todayTotal: 0,
                    weeklyCompliance: 0,
                    lastExerciseDate: null,
                }] as const;
            }
        }),
    );

    return Object.fromEntries(results);
}
