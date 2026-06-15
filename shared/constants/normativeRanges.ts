/**
 * Normative ranges for the Senior Fitness Test (Rikli & Jones, 2001).
 *
 * The PDF provides the 25th–75th percentile (normal range) for each gender
 * and 5-year age band (60-64 … 90-94).
 *
 * Units in the code:
 *  - chair_stand / arm_curl / two_min_step: same as PDF (reps, steps)
 *  - six_min_walk: metres (PDF uses yards → × 0.9144)
 *  - chair_sit_reach / back_scratch: cm (PDF uses inches → × 2.54)
 *  - up_and_go: seconds (same as PDF)
 */

export type AgeBand = '60-64' | '65-69' | '70-74' | '75-79' | '80-84' | '85-89' | '90-94';
export type PatientGender = 'M' | 'F';

export type SFTTestType =
    | 'chair_stand'
    | 'arm_curl'
    | 'six_min_walk'
    | 'two_min_step'
    | 'chair_sit_reach'
    | 'back_scratch'
    | 'up_and_go';

export interface NormativeRange {
    /** 25th percentile */
    low: number;
    /** 75th percentile */
    high: number;
}

// ────────────────────────────────────────────────────────────
//  Ranges by gender × age band (units already converted)
// ────────────────────────────────────────────────────────────

/** Canonical display names for each SFT test (Spanish). */
export const TEST_NAMES: Record<SFTTestType, string> = {
    chair_stand: 'Sentarse y levantarse de una silla',
    arm_curl: 'Flexiones del brazo',
    six_min_walk: 'Caminar 6 minutos',
    two_min_step: 'Marcha de dos minutos',
    chair_sit_reach: 'Flexión del tronco en silla',
    back_scratch: 'Juntar las manos tras la espalda',
    up_and_go: 'Levantarse, caminar y volverse a sentar',
};

export const NORMATIVE_RANGES: Record<SFTTestType, Record<PatientGender, Record<AgeBand, NormativeRange>>> = {
    // ─── Sentarse y levantarse de una silla (reps) ───
    chair_stand: {
        M: {
            '60-64': { low: 14, high: 19 },
            '65-69': { low: 12, high: 18 },
            '70-74': { low: 12, high: 17 },
            '75-79': { low: 11, high: 17 },
            '80-84': { low: 10, high: 15 },
            '85-89': { low: 8, high: 14 },
            '90-94': { low: 7, high: 12 },
        },
        F: {
            '60-64': { low: 12, high: 17 },
            '65-69': { low: 11, high: 16 },
            '70-74': { low: 10, high: 15 },
            '75-79': { low: 10, high: 15 },
            '80-84': { low: 9, high: 14 },
            '85-89': { low: 8, high: 13 },
            '90-94': { low: 4, high: 11 },
        },
    },

    // ─── Flexiones del brazo (reps) ───
    arm_curl: {
        M: {
            '60-64': { low: 16, high: 22 },
            '65-69': { low: 15, high: 21 },
            '70-74': { low: 14, high: 21 },
            '75-79': { low: 13, high: 19 },
            '80-84': { low: 13, high: 19 },
            '85-89': { low: 11, high: 17 },
            '90-94': { low: 10, high: 14 },
        },
        F: {
            '60-64': { low: 13, high: 19 },
            '65-69': { low: 12, high: 18 },
            '70-74': { low: 12, high: 17 },
            '75-79': { low: 11, high: 17 },
            '80-84': { low: 10, high: 16 },
            '85-89': { low: 10, high: 15 },
            '90-94': { low: 8, high: 13 },
        },
    },

    // ─── Caminar 6 minutos (metres — converted from yards × 0.9144) ───
    six_min_walk: {
        M: {
            '60-64': { low: 558, high: 672 },
            '65-69': { low: 512, high: 640 },
            '70-74': { low: 498, high: 622 },
            '75-79': { low: 430, high: 585 },
            '80-84': { low: 407, high: 553 },
            '85-89': { low: 348, high: 521 },
            '90-94': { low: 279, high: 457 },
        },
        F: {
            '60-64': { low: 498, high: 604 },
            '65-69': { low: 457, high: 581 },
            '70-74': { low: 439, high: 563 },
            '75-79': { low: 398, high: 535 },
            '80-84': { low: 352, high: 494 },
            '85-89': { low: 311, high: 466 },
            '90-94': { low: 252, high: 402 },
        },
    },

    // ─── Marcha de dos minutos (pasos — rodilla derecha) ───
    two_min_step: {
        M: {
            '60-64': { low: 87, high: 115 },
            '65-69': { low: 86, high: 116 },
            '70-74': { low: 80, high: 110 },
            '75-79': { low: 73, high: 109 },
            '80-84': { low: 71, high: 103 },
            '85-89': { low: 59, high: 91 },
            '90-94': { low: 52, high: 86 },
        },
        F: {
            '60-64': { low: 75, high: 107 },
            '65-69': { low: 73, high: 107 },
            '70-74': { low: 68, high: 101 },
            '75-79': { low: 68, high: 100 },
            '80-84': { low: 60, high: 90 },
            '85-89': { low: 55, high: 85 },
            '90-94': { low: 44, high: 72 },
        },
    },

    // ─── Flexión del tronco en silla (cm — converted from inches × 2.54) ───
    chair_sit_reach: {
        M: {
            '60-64': { low: -6.4, high: 10.2 },
            '65-69': { low: -7.6, high: 7.6 },
            '70-74': { low: -7.6, high: 7.6 },
            '75-79': { low: -10.2, high: 5.1 },
            '80-84': { low: -14.0, high: 3.8 },
            '85-89': { low: -14.0, high: 1.3 },
            '90-94': { low: -16.5, high: -1.3 },
        },
        F: {
            '60-64': { low: -1.3, high: 12.7 },
            '65-69': { low: -1.3, high: 11.4 },
            '70-74': { low: -2.5, high: 10.2 },
            '75-79': { low: -3.8, high: 8.9 },
            '80-84': { low: -5.1, high: 7.6 },
            '85-89': { low: -6.4, high: 6.4 },
            '90-94': { low: -11.4, high: 2.5 },
        },
    },

    // ─── Juntar las manos tras la espalda (cm — converted from inches × 2.54) ───
    back_scratch: {
        M: {
            '60-64': { low: -16.5, high: 0.0 },
            '65-69': { low: -19.1, high: -2.5 },
            '70-74': { low: -20.3, high: -2.5 },
            '75-79': { low: -22.9, high: -5.1 },
            '80-84': { low: -24.1, high: -5.1 },
            '85-89': { low: -24.1, high: -7.6 },
            '90-94': { low: -26.7, high: -10.2 },
        },
        F: {
            '60-64': { low: -7.6, high: 3.8 },
            '65-69': { low: -8.9, high: 3.8 },
            '70-74': { low: -10.2, high: 2.5 },
            '75-79': { low: -12.7, high: 1.3 },
            '80-84': { low: -14.0, high: 0.0 },
            '85-89': { low: -17.8, high: -2.5 },
            '90-94': { low: -20.3, high: -2.5 },
        },
    },

    // ─── Levantarse, caminar y volverse a sentar (seconds — lower is better) ───
    up_and_go: {
        M: {
            '60-64': { low: 3.8, high: 5.6 },
            '65-69': { low: 4.3, high: 5.9 },
            '70-74': { low: 4.4, high: 6.2 },
            '75-79': { low: 4.6, high: 7.2 },
            '80-84': { low: 5.2, high: 7.6 },
            '85-89': { low: 5.5, high: 8.9 },
            '90-94': { low: 6.2, high: 10.0 },
        },
        F: {
            '60-64': { low: 4.4, high: 6.0 },
            '65-69': { low: 4.8, high: 6.4 },
            '70-74': { low: 4.9, high: 7.1 },
            '75-79': { low: 5.2, high: 7.4 },
            '80-84': { low: 5.7, high: 8.7 },
            '85-89': { low: 6.2, high: 9.6 },
            '90-94': { low: 7.3, high: 11.5 },
        },
    },
};

// ────────────────────────────────────────────────────────────
//  Helper functions
// ────────────────────────────────────────────────────────────

export function getNormativeRange(
    testType: SFTTestType,
    gender: PatientGender,
    ageBand: AgeBand,
): NormativeRange | null {
    return NORMATIVE_RANGES[testType]?.[gender]?.[ageBand] ?? null;
}

/** Calculate the 5-year age band string from a birth date. Returns null if outside 60-94. */
export function calculateAgeBand(birthDate: string): AgeBand | null {
    const birth = new Date(birthDate);
    if (isNaN(birth.getTime())) return null;

    const now = Date.now();
    const ageMs = now - birth.getTime();
    const ageYears = Math.floor(ageMs / (365.25 * 24 * 60 * 60 * 1000));

    if (ageYears < 60 || ageYears > 94) return null;
    const bandStart = Math.floor(ageYears / 5) * 5;
    return `${bandStart}-${bandStart + 4}` as AgeBand;
}

/**
 * Classify a value into one of the normative categories.
 *
 * - Below 25th percentile  → 'Bajo promedio'
 * - 25th–75th percentile   → 'Promedio'
 * - Above 75th percentile  → 'Por encima del promedio'
 * - Above 90th (estimated) → 'Excelente'
 */
export function getPerformanceCategory(
    value: number,
    range: NormativeRange,
    higherIsBetter: boolean,
): 'Bajo promedio' | 'Promedio' | 'Por encima del promedio' | 'Excelente' {
    if (higherIsBetter) {
        const { low, high } = range;
        const rangeSize = high - low;
        if (value < low) return 'Bajo promedio';
        if (value <= high) return 'Promedio';
        if (value <= high + rangeSize * 0.5) return 'Por encima del promedio';
        return 'Excelente';
    }
    // Inverse: lower is better (e.g., up_and_go)
    const { low, high } = range;
    const rangeSize = low - high;
    if (value > low) return 'Bajo promedio';
    if (value >= high) return 'Promedio';
    if (value >= high - rangeSize * 0.5) return 'Por encima del promedio';
    return 'Excelente';
}

/**
 * Map a performance category to a percentage for bar display.
 * This maps the continuous value into a 0-100 percentage.
 */
export function calculateNormativePercentage(
    value: number,
    range: NormativeRange,
    higherIsBetter: boolean,
): number {
    const { low, high } = range;

    if (higherIsBetter) {
        const rangeSize = high - low;
        if (rangeSize <= 0) return 50;
        if (value < low) return Math.max(0, ((value - low) / rangeSize) * 25);
        if (value <= high) return 25 + ((value - low) / rangeSize) * 50;
        return Math.min(100, 75 + ((value - high) / (rangeSize * 0.5)) * 25);
    }

    // Inverse: lower is better
    const rangeSize = low - high;
    if (rangeSize <= 0) return 50;
    if (value > low) return Math.max(0, ((low - value) / rangeSize) * 25);
    if (value >= high) return 25 + ((low - value) / rangeSize) * 50;
    return Math.min(100, 75 + ((high - value) / (rangeSize * 0.5)) * 25);
}
