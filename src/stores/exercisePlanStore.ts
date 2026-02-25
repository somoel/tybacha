import type { ExercisePlan } from '@/src/types/exercise.types';
import { create } from 'zustand';

interface ExercisePlanState {
    plans: ExercisePlan[];
    activePlan: ExercisePlan | null;
    isGenerating: boolean;
    generationError: string | null;

    /** Set all plans for the current context */
    setPlans: (plans: ExercisePlan[]) => void;
    /** Set the currently active plan */
    setActivePlan: (plan: ExercisePlan | null) => void;
    /** Add a newly generated plan */
    addPlan: (plan: ExercisePlan) => void;
    /** Update generation state */
    setGenerating: (isGenerating: boolean) => void;
    /** Set generation error message */
    setGenerationError: (error: string | null) => void;
    /** Update a plan's status */
    updatePlanStatus: (planId: string, status: ExercisePlan['status']) => void;
}

/**
 * Exercise plan store – manages AI-generated exercise plans
 * and their execution state.
 */
export const useExercisePlanStore = create<ExercisePlanState>()((set) => ({
    plans: [],
    activePlan: null,
    isGenerating: false,
    generationError: null,

    setPlans: (plans) => set({ plans }),

    setActivePlan: (plan) => set({ activePlan: plan }),

    addPlan: (plan) =>
        set((state) => ({
            plans: [plan, ...state.plans],
            activePlan: plan,
        })),

    setGenerating: (isGenerating) =>
        set({ isGenerating, generationError: isGenerating ? null : undefined }),

    setGenerationError: (generationError) =>
        set({ generationError, isGenerating: false }),

    updatePlanStatus: (planId, status) =>
        set((state) => ({
            plans: state.plans.map((p) =>
                p.id === planId ? { ...p, status } : p
            ),
            activePlan:
                state.activePlan?.id === planId
                    ? { ...state.activePlan, status }
                    : state.activePlan,
        })),
}));
