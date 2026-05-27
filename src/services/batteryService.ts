import {
    createOlderAdultSftApplication,
    fetchActiveSftBatteries,
    fetchOlderAdultSftApplications,
    fetchSftApplicationDetail,
    fetchSftBatteryTests,
} from '@/src/api/sftApi';
import { fetchApiExercisePlans } from '@/src/api/exercisePlansApi';
import { generateUUID } from '@/src/lib/sqlite';
import { SFT_TESTS } from '@/src/constants/sftTests';
import type { BatteryWithResults, SFTBattery, SFTResult, SFTTestType } from '@/src/types/battery.types';

const pendingBatteryContext = new Map<string, { patientId: string; notes?: string }>();

const TEST_TYPE_BY_ORDER: Record<number, SFTTestType> = {
    1: 'chair_stand',
    2: 'arm_curl',
    3: 'six_min_walk',
    4: 'two_min_step',
    5: 'chair_sit_reach',
    6: 'back_scratch',
    7: 'up_and_go',
};

export async function createBattery(
    patientId: string,
    performedBy: string,
    notes: string | undefined,
    _isOnline: boolean,
): Promise<SFTBattery> {
    const tempId = generateUUID();
    pendingBatteryContext.set(tempId, { patientId, notes });

    return {
        id: tempId,
        patient_id: patientId,
        performed_by: performedBy,
        performed_at: new Date().toISOString(),
        notes,
        is_synced: false,
    };
}

export async function saveBatteryResults(
    batteryId: string,
    results: Partial<Record<SFTTestType, number>>,
    _isOnline: boolean,
): Promise<SFTResult[]> {
    const context = pendingBatteryContext.get(batteryId);
    if (!context) {
        throw new Error('No se encontro la bateria SFT activa.');
    }

    const batteries = await fetchActiveSftBatteries();
    const activeBattery = batteries[0];
    if (!activeBattery) {
        throw new Error('No hay bateria SFT activa en el servidor.');
    }

    const tests = await fetchSftBatteryTests(activeBattery.idBateriaSft);
    const payloadResults = tests
        .map((test) => {
            const testType = TEST_TYPE_BY_ORDER[test.orden];
            const value = testType ? results[testType] : undefined;
            if (value === undefined) return null;

            return {
                idPruebaSft: test.idPruebaSft,
                valorNumerico: value,
            };
        })
        .filter((item): item is { idPruebaSft: number; valorNumerico: number } => item !== null);

    const created = await createOlderAdultSftApplication(Number(context.patientId), {
        idBateriaSft: activeBattery.idBateriaSft,
        observaciones: context.notes,
        resultados: payloadResults,
    });

    pendingBatteryContext.delete(batteryId);

    return payloadResults.map((result) => {
        const test = tests.find((item) => item.idPruebaSft === result.idPruebaSft);
        const testType = test ? TEST_TYPE_BY_ORDER[test.orden] : undefined;
        const definition = SFT_TESTS.find((item) => item.type === testType);

        return {
            id: `${created.idAplicacionSft}-${result.idPruebaSft}`,
            battery_id: String(created.idAplicacionSft),
            test_type: testType ?? 'chair_stand',
            value: result.valorNumerico,
            unit: definition?.unit ?? 'reps',
        };
    });
}

export async function saveBatteryWithResults(
    batteryId: string,
    results: Partial<Record<SFTTestType, number>>,
    isOnline: boolean,
): Promise<{ batteryId: string; results: SFTResult[] }> {
    const savedResults = await saveBatteryResults(batteryId, results, isOnline);
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
        results: application.resultados.map((result) => {
            const testType = result.orden ? TEST_TYPE_BY_ORDER[result.orden] : undefined;
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
