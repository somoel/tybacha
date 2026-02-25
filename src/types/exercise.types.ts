export interface Exercise {
    index: number;
    name: string;
    description: string;
    sets: number;
    reps: number | null;
    duration_seconds: number | null;
    frequency: string;
    rationale: string;
}

export interface ExercisePlan {
    id: string;
    patient_id: string;
    battery_id: string;
    generated_by: string;
    generated_at: string;
    exercises: Exercise[];
    status: 'active' | 'completed' | 'cancelled';
    summary?: string;
}

export interface ExerciseLog {
    id: string;
    plan_id: string;
    exercise_index: number;
    logged_by: string;
    logged_at: string;
    completed: boolean;
    value_achieved?: number;
    notes?: string;
}

export interface ExerciseLogInput {
    completed: boolean;
    value_achieved?: number;
    notes?: string;
}

export interface GeminiExercisePlanResponse {
    summary: string;
    exercises: Exercise[];
}

export interface ExercisePlanState {
    plans: ExercisePlan[];
    activePlan: ExercisePlan | null;
    isGenerating: boolean;
    generationError: string | null;
    generatePlan: (patientId: string, batteryId: string) => Promise<void>;
    logExercise: (planId: string, exerciseIndex: number, data: ExerciseLogInput) => Promise<void>;
}
