export type SFTTestType =
    | 'chair_stand'
    | 'arm_curl'
    | 'six_min_walk'
    | 'two_min_step'
    | 'chair_sit_reach'
    | 'back_scratch'
    | 'up_and_go';

export type SFTUnit = 'reps' | 'meters' | 'steps' | 'cm' | 'seconds';

export type TimerMode = 'countdown' | 'stopwatch' | 'none';

export type CounterMode = 'increment' | 'manual_input' | 'timer_result';

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
    normativeRanges?: NormativeRanges;
    encouragementCues?: EncouragementCue[];
    soundCues?: boolean;
    endSound?: SoundVariant;
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
