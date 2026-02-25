import { SFT_TESTS } from '@/src/constants/sftTests';
import { addToSyncQueue, generateUUID, getDatabase } from '@/src/lib/sqlite';
import { supabase } from '@/src/lib/supabase';
import type { BatteryWithResults, SFTBattery, SFTResult, SFTTestType } from '@/src/types/battery.types';

/**
 * Create a new SFT battery for a patient.
 */
export async function createBattery(
    patientId: string,
    performedBy: string,
    notes: string | undefined,
    isOnline: boolean
): Promise<SFTBattery> {
    const batteryData = {
        id: generateUUID(),
        patient_id: patientId,
        performed_by: performedBy,
        notes: notes || null,
        is_synced: isOnline,
    };

    try {
        if (isOnline) {
            const { data, error } = await supabase
                .from('sft_batteries')
                .insert(batteryData)
                .select()
                .single();

            if (error) throw new Error('Error al crear batería: ' + error.message);
            return data as SFTBattery;
        } else {
            const db = await getDatabase();
            await db.runAsync(
                `INSERT INTO sft_batteries_local (id, patient_id, performed_by, notes, is_synced, synced)
         VALUES (?, ?, ?, ?, 0, 0)`,
                [batteryData.id, batteryData.patient_id, batteryData.performed_by, batteryData.notes]
            );
            await addToSyncQueue('sft_batteries', 'INSERT', batteryData);

            return {
                ...batteryData,
                performed_at: new Date().toISOString(),
                is_synced: false,
            } as SFTBattery;
        }
    } catch (error) {
        if (error instanceof Error) throw error;
        throw new Error('Error inesperado al crear batería.');
    }
}

/**
 * Save all test results for a battery.
 */
export async function saveBatteryResults(
    batteryId: string,
    results: Partial<Record<SFTTestType, number>>,
    isOnline: boolean
): Promise<SFTResult[]> {
    const resultRows: Array<{
        id: string;
        battery_id: string;
        test_type: SFTTestType;
        value: number;
        unit: string;
        notes: string | null;
    }> = [];

    for (const [testType, value] of Object.entries(results)) {
        if (value === undefined) continue;
        const testDef = SFT_TESTS.find((t) => t.type === testType);
        if (!testDef) continue;

        resultRows.push({
            id: generateUUID(),
            battery_id: batteryId,
            test_type: testType as SFTTestType,
            value,
            unit: testDef.unit,
            notes: null,
        });
    }

    try {
        if (isOnline) {
            const { data, error } = await supabase
                .from('sft_results')
                .insert(resultRows)
                .select();

            if (error) throw new Error('Error al guardar resultados: ' + error.message);
            return (data ?? []) as SFTResult[];
        } else {
            const db = await getDatabase();
            for (const row of resultRows) {
                await db.runAsync(
                    `INSERT INTO sft_results_local (id, battery_id, test_type, value, unit, notes, synced)
           VALUES (?, ?, ?, ?, ?, ?, 0)`,
                    [row.id, row.battery_id, row.test_type, row.value, row.unit, row.notes]
                );
                await addToSyncQueue('sft_results', 'INSERT', row);
            }
            return resultRows as SFTResult[];
        }
    } catch (error) {
        if (error instanceof Error) throw error;
        throw new Error('Error inesperado al guardar resultados.');
    }
}

/**
 * Fetch all batteries for a patient, ordered by date descending.
 */
export async function fetchBatteries(patientId: string): Promise<SFTBattery[]> {
    try {
        const { data, error } = await supabase
            .from('sft_batteries')
            .select('*')
            .eq('patient_id', patientId)
            .order('performed_at', { ascending: false });

        if (error) throw new Error('Error al obtener baterías: ' + error.message);
        return (data ?? []) as SFTBattery[];
    } catch (error) {
        if (error instanceof Error) throw error;
        throw new Error('Error inesperado al obtener baterías.');
    }
}

/**
 * Fetch a battery with all its results.
 */
export async function fetchBatteryWithResults(batteryId: string): Promise<BatteryWithResults | null> {
    try {
        const { data: battery, error: batteryError } = await supabase
            .from('sft_batteries')
            .select('*')
            .eq('id', batteryId)
            .single();

        if (batteryError) throw new Error('Error al obtener batería: ' + batteryError.message);

        const { data: results, error: resultsError } = await supabase
            .from('sft_results')
            .select('*')
            .eq('battery_id', batteryId);

        if (resultsError) throw new Error('Error al obtener resultados: ' + resultsError.message);

        return {
            ...(battery as SFTBattery),
            results: (results ?? []) as SFTResult[],
        };
    } catch (error) {
        if (error instanceof Error) throw error;
        throw new Error('Error inesperado al obtener detalles de batería.');
    }
}

/**
 * Get battery count per patient (for sectioned list).
 */
export async function fetchBatteryCountsForPatients(
    patientIds: string[]
): Promise<Record<string, number>> {
    if (patientIds.length === 0) return {};

    try {
        const { data, error } = await supabase
            .from('sft_batteries')
            .select('patient_id')
            .in('patient_id', patientIds);

        if (error) throw new Error('Error al contar baterías: ' + error.message);

        const counts: Record<string, number> = {};
        for (const row of data ?? []) {
            const pid = (row as { patient_id: string }).patient_id;
            counts[pid] = (counts[pid] ?? 0) + 1;
        }
        return counts;
    } catch (error) {
        if (error instanceof Error) throw error;
        throw new Error('Error inesperado al contar baterías.');
    }
}

/**
 * Check which patients have active exercise plans.
 */
export async function fetchActivePlanStatus(
    patientIds: string[]
): Promise<Record<string, boolean>> {
    if (patientIds.length === 0) return {};

    try {
        const { data, error } = await supabase
            .from('exercise_plans')
            .select('patient_id')
            .in('patient_id', patientIds)
            .eq('status', 'active');

        if (error) throw new Error('Error al verificar planes: ' + error.message);

        const status: Record<string, boolean> = {};
        for (const row of data ?? []) {
            status[(row as { patient_id: string }).patient_id] = true;
        }
        return status;
    } catch (error) {
        if (error instanceof Error) throw error;
        throw new Error('Error inesperado al verificar planes.');
    }
}
