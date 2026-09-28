import {
    createOlderAdultSftApplication,
    fetchActiveSftBatteries,
    fetchOlderAdultSftApplications,
    fetchSftApplicationDetail,
    fetchSftBatteryTests,
} from '@/src/api/sftApi';
import { SFT_TESTS } from '@/src/constants/sftTests';
import type { BatteryWithResults, SFTBattery, SFTResult, SFTTestType } from '@/src/types/battery.types';

const TEST_TYPE_BY_ORDER: Record<number, SFTTestType> = {
    1: 'chair_stand',
    2: 'arm_curl',
    3: 'six_min_walk',
    4: 'two_min_step',
    5: 'chair_sit_reach',
    6: 'back_scratch',
    7: 'up_and_go',
};

const TEST_ORDER_BY_TYPE: Partial<Record<SFTTestType, number>> = Object.fromEntries(
    Object.entries(TEST_TYPE_BY_ORDER).map(([order, testType]) => [testType, Number(order)]),
) as Partial<Record<SFTTestType, number>>;

const TEST_TYPE_BY_NORMALIZED_NAME: Record<string, SFTTestType> = {
    // Canonical names (matching seed / TEST_NAMES)
    'sentarse y levantarse de una silla': 'chair_stand',
    'flexiones del brazo': 'arm_curl',
    'caminar 6 minutos': 'six_min_walk',
    'marcha de dos minutos': 'two_min_step',
    'flexion del tronco en silla': 'chair_sit_reach',
    'juntar las manos tras la espalda': 'back_scratch',
    'levantarse caminar y volverse a sentar': 'up_and_go',
    // Legacy seed names (for databases that haven't been re-seeded)
    'sentarse y levantarse de silla': 'chair_stand',
    'flexion de codo': 'arm_curl',
    'caminata de 6 minutos': 'six_min_walk',
    'marcha estacionaria 2 minutos': 'two_min_step',
    'sentado y extenderse': 'chair_sit_reach',
    'rascarse la espalda': 'back_scratch',
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

export interface SftApplicationPayload {
    idAdultoMayor: number;
    fechaAplicacion: string;
    observaciones?: string;
    pesoKg?: number;
    estaturaCm?: number;
    imc?: number;
    resultados: { testType: SFTTestType; valorNumerico: number; observaciones?: string }[];
}

export function buildSftApplicationPayload(input: {
    patientId: string;
    results: Partial<Record<SFTTestType, number>>;
    resultNotes: Partial<Record<SFTTestType, string>>;
    notes?: string;
    pesoKg?: number | null;
    estaturaCm?: number | null;
    imc?: number | null;
    fechaAplicacion?: string;
}): SftApplicationPayload {
    const resultados = (Object.keys(input.results) as SFTTestType[])
        .filter((testType) => input.results[testType] !== undefined)
        .map((testType) => {
            const note = input.resultNotes[testType];
            return {
                testType,
                valorNumerico: input.results[testType] as number,
                ...(note && note.trim().length > 0 ? { observaciones: note } : {}),
            };
        });

    const payload: SftApplicationPayload = {
        idAdultoMayor: Number(input.patientId),
        fechaAplicacion: input.fechaAplicacion ?? new Date().toISOString(),
        resultados,
    };

    if (input.notes && input.notes.trim().length > 0) {
        payload.observaciones = input.notes;
    }
    if (input.pesoKg !== null && input.pesoKg !== undefined) {
        payload.pesoKg = input.pesoKg;
    }
    if (input.estaturaCm !== null && input.estaturaCm !== undefined) {
        payload.estaturaCm = input.estaturaCm;
    }
    if (input.imc !== null && input.imc !== undefined) {
        payload.imc = input.imc;
    }

    return payload;
}

export async function submitSftApplication(
    payload: SftApplicationPayload,
    idLocalSincronizacion?: string,
): Promise<{ batteryId: string; results: SFTResult[] }> {
    const batteries = await fetchActiveSftBatteries();
    const activeBattery =
        batteries.find((battery) => battery.nombre.trim().toLowerCase() === 'senior fitness test') ??
        batteries.find((battery) => battery.nombre.trim().toLowerCase().includes('senior fitness test'));
    if (!activeBattery) {
        throw new Error('No hay bateria SFT activa en el servidor.');
    }

    const tests = await fetchSftBatteryTests(activeBattery.idBateriaSft);
    const payloadResults = payload.resultados
        .map((result) => {
            const order = TEST_ORDER_BY_TYPE[result.testType];
            const test = order === undefined ? undefined : tests.find((item) => item.orden === order);
            if (!test) return null;

            return {
                idPruebaSft: test.idPruebaSft,
                valorNumerico: result.valorNumerico,
                ...(result.observaciones ? { observaciones: result.observaciones } : {}),
            };
        })
        .filter((item): item is { idPruebaSft: number; valorNumerico: number; observaciones?: string } => item !== null);

    if (payloadResults.length === 0) {
        throw new Error('No hay resultados SFT para guardar. Revisa que las pruebas tengan valores registrados.');
    }

    const created = await createOlderAdultSftApplication(payload.idAdultoMayor, {
        idBateriaSft: activeBattery.idBateriaSft,
        observaciones: payload.observaciones,
        pesoKg: payload.pesoKg,
        estaturaCm: payload.estaturaCm,
        imc: payload.imc,
        fechaAplicacion: payload.fechaAplicacion,
        ...(idLocalSincronizacion ? { idLocalSincronizacion } : {}),
        resultados: payloadResults,
    });

    return {
        batteryId: String(created.idAplicacionSft),
        results: payloadResults.map((result) => {
            const test = tests.find((item) => item.idPruebaSft === result.idPruebaSft);
            const testType = test ? TEST_TYPE_BY_ORDER[test.orden] : undefined;
            const definition = SFT_TESTS.find((item) => item.type === testType);

            return {
                id: `${created.idAplicacionSft}-${result.idPruebaSft}`,
                battery_id: String(created.idAplicacionSft),
                test_type: testType ?? 'chair_stand',
                value: result.valorNumerico,
                unit: definition?.unit ?? 'reps',
                notes: result.observaciones,
            };
        }),
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

export interface WeeklyExerciseData {
    todayCompleted: number;
    todayTotal: number;
    weeklyCompliance: number;
    lastExerciseDate: string | null;
}
