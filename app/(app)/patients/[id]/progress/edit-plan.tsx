import { ExercisePlanForm, type ExercisePlanFormData } from '@/src/components/results/ExercisePlanForm';
import { ProgressSkeleton } from '@/src/components/ui/PatientDetailSkeletons';
import { fetchExercisePlans } from '@/src/services/exercisePlanService';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { View } from 'react-native';

export default function EditPlanSheet() {
    const { id: patientId } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const [planId, setPlanId] = useState<string | null>(null);
    const [initialData, setInitialData] = useState<ExercisePlanFormData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useFocusEffect(useCallback(() => {
        let isActive = true;
        const load = async () => {
            if (!patientId) return;
            setIsLoading(true);
            try {
                const plans = await fetchExercisePlans(patientId);
                if (!isActive) return;
                const plan = plans[0];
                if (!plan) return;
                setPlanId(plan.id);
                setInitialData({
                    titulo: plan.titulo || 'Plan semanal personalizado',
                    objetivo: plan.resumen || plan.summary || '',
                    nivelDificultad: 'bajo',
                    ejercicios: plan.exercises.map((ex) => ({
                        nombre: ex.name,
                        descripcion: ex.description,
                        series: ex.sets,
                        repeticiones: ex.reps ?? undefined,
                        duracionSegundos: ex.duration_seconds ?? undefined,
                        descansoSegundos: undefined,
                        dificultad: 'bajo',
                        instrucciones: ex.rationale,
                    })),
                });
            } catch (error) {
                console.error('Error cargando plan para editar:', error);
            } finally {
                if (isActive) setIsLoading(false);
            }
        };
        load();
        return () => { isActive = false; };
    }, [patientId]));

    if (isLoading) return <ProgressSkeleton />;
    if (!planId || !initialData) return <ProgressSkeleton />;

    return (
        <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
            <Stack.Screen options={{ title: 'Editar plan de ejercicios' }} />
            <ExercisePlanForm
                patientId={patientId!}
                initialData={initialData}
                editMode
                planId={planId}
                onSuccess={() => {
                    router.back();
                }}
                onCancel={() => {
                    router.back();
                }}
            />
        </View>
    );
}
