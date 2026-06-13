import type { AgeBand as SharedAgeBand, NormativeRange as SharedNormativeRange, PatientGender as SharedPatientGender, SFTTestType as SharedSFTTestType } from '@shared/constants/normativeRanges';

export type SFTTestType = SharedSFTTestType;

export type SFTUnit = 'reps' | 'meters' | 'steps' | 'cm' | 'seconds';

export type TimerMode = 'countdown' | 'stopwatch' | 'none';

export type CounterMode = 'increment' | 'manual_input' | 'timer_result';

export type PatientGender = SharedPatientGender;
export type AgeBand = SharedAgeBand;
export type NormativeRange = SharedNormativeRange;

/**
 * @deprecated Use NormativeRange from shared/constants/normativeRanges.ts instead.
 * This flat structure is kept for backward compatibility with ResultChart and sftTests.ts.
 */
export interface NormativeRanges {
    belowBelowAvg: number;
    belowAvg: number;
    avg: number;
    aboveAvg: number;
    excellent: number;
    higherIsBetter: boolean;
}

export type SoundVariant = 'bell' | 'chime' | 'end';

export interface EncouragementCue {
    atSecond: number;
    message?: string;
    sound?: SoundVariant;
}

export interface SFTTestDefinition {
    type: SFTTestType;
    name: string;
    shortName: string;
    description: string;
    icon: string;
    unit: SFTUnit;
    timerMode: TimerMode;
    timerSeconds?: number;
    counterMode: CounterMode;
    allowNegative: boolean;
    inputLabel: string;
    lapTracking?: boolean;
    lapLengthMeters?: number;
    /** @deprecated Use getNormativeRange() from @shared/constants/normativeRanges.ts instead */
    normativeRanges?: NormativeRanges;
    encouragementCues?: EncouragementCue[];
    soundCues?: boolean;
    endSound?: SoundVariant;
    safetyTips?: string[];
}

export interface SFTBattery {
    id: string;
    patient_id: string;
    performed_by: string;
    performed_at: string;
    notes?: string;
    is_synced: boolean;
    peso_kg?: number;
    estatura_cm?: number;
    imc?: number;
}

export interface SFTResult {
    id: string;
    battery_id: string;
    test_type: SFTTestType;
    value: number;
    unit: SFTUnit;
    notes?: string;
}

export interface BatteryWithResults extends SFTBattery {
    results: SFTResult[];
}

export interface BatteryState {
    activeBatteryId: string | null;
    patientId: string | null;
    results: Partial<Record<SFTTestType, number>>;
    resultNotes: Partial<Record<SFTTestType, string>>;
    completedTests: SFTTestType[];
    notes: string;
    pesoKg: number | null;
    estaturaCm: number | null;
    imc: number | null;
    startBattery: (patientId: string) => void;
    saveResult: (testType: SFTTestType, value: number, notes?: string) => void;
    setNotes: (notes: string) => void;
    setBodyMetrics: (pesoKg: number, estaturaCm: number) => void;
    finalizeBattery: () => Promise<void>;
    clearSession: () => void;
    resetBattery: () => void;
}
