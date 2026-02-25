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
}

export interface SFTBattery {
    id: string;
    patient_id: string;
    performed_by: string;
    performed_at: string;
    notes?: string;
    is_synced: boolean;
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
    completedTests: SFTTestType[];
    startBattery: (patientId: string) => void;
    saveResult: (testType: SFTTestType, value: number) => void;
    finalizeBattery: () => Promise<void>;
    resetBattery: () => void;
}
