import { beforeEach, describe, expect, it } from 'vitest';
import { useExercisePlanStore } from '@/src/stores/exercisePlanStore';
import type { ExercisePlan } from '@/src/types/exercise.types';

function plan(id: string, status: ExercisePlan['status'] = 'active'): ExercisePlan {
    return { id, status } as unknown as ExercisePlan;
}

const store = () => useExercisePlanStore.getState();

describe('exercisePlanStore', () => {
    beforeEach(() => {
        store().setPlans([]);
        store().setActivePlan(null);
        store().setGenerating(false);
        store().setGenerationError(null);
    });

    it('arranca sin planes', () => {
        expect(store().plans).toEqual([]);
        expect(store().activePlan).toBeNull();
        expect(store().isGenerating).toBe(false);
        expect(store().generationError).toBeNull();
    });

    it('addPlan prepend y activa el plan nuevo', () => {
        store().setPlans([plan('old')]);
        store().addPlan(plan('new'));

        expect(store().plans.map((p) => p.id)).toEqual(['new', 'old']);
        expect(store().activePlan?.id).toBe('new');
    });

    it('setGenerating(true) limpia el error anterior', () => {
        store().setGenerationError('fallo');
        store().setGenerating(true);

        expect(store().isGenerating).toBe(true);
        expect(store().generationError).toBeNull();
    });

    it('setGenerating(false) detiene la generación', () => {
        store().setGenerating(true);
        store().setGenerating(false);
        expect(store().isGenerating).toBe(false);
    });

    it('setGenerationError detiene la generación', () => {
        store().setGenerating(true);
        store().setGenerationError('sin cupo');

        expect(store().generationError).toBe('sin cupo');
        expect(store().isGenerating).toBe(false);
    });

    it('updatePlanStatus cambia el estado en la lista y en el activo', () => {
        store().setPlans([plan('a'), plan('b')]);
        store().setActivePlan(plan('a'));

        store().updatePlanStatus('a', 'completed');

        expect(store().plans.find((p) => p.id === 'a')?.status).toBe('completed');
        expect(store().plans.find((p) => p.id === 'b')?.status).toBe('active');
        expect(store().activePlan?.status).toBe('completed');
    });

    it('updatePlanStatus no toca el plan activo si el id no coincide', () => {
        store().setPlans([plan('a')]);
        store().setActivePlan(plan('other'));

        store().updatePlanStatus('a', 'cancelled');

        expect(store().activePlan?.status).toBe('active');
    });
});
