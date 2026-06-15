import { AppButton } from '@/src/components/ui/AppButton';
import { ExercisePlanForm, type ExercisePlanFormData } from '@/src/components/results/ExercisePlanForm';
import { ProgressSkeleton } from '@/src/components/ui/PatientDetailSkeletons';
import { fetchOlderAdultSftApplications } from '@/src/api/sftApi';
import { fetchExercisePlans, generateExercisePlan } from '@/src/services/exercisePlanService';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

export default function EditPlanSheet() {
    const { id: patientId } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const [planId, setPlanId] = useState<string | null>(null);
    const [initialData, setInitialData] = useState<ExercisePlanFormData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRegenerating, setIsRegenerating] = useState(false);

    const loadPlan = useCallback(async () => {
        if (!patientId) return;
        setIsLoading(true);
        try {
            const plans = await fetchExercisePlans(patientId);
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
            setIsLoading(false);
        }
    }, [patientId]);

    useFocusEffect(useCallback(() => {
        loadPlan();
    }, [loadPlan]));

    const handleRegenerate = async () => {
        if (!patientId || isRegenerating) return;
        setIsRegenerating(true);
        try {
            // Get latest SFT application
            const applications = await fetchOlderAdultSftApplications(Number(patientId));
            if (!applications || applications.length === 0) {
                console.error('No hay baterías SFT registradas para este paciente');
                return;
            }
            const latestApp = applications[0];
            const batteryId = String(latestApp.idAplicacionSft);

            // Generate new plan with IA
            await generateExercisePlan(
                { id: patientId } as any,
                [],
                '',
                batteryId,
            );

            // Reload the plan
            await loadPlan();
        } catch (error) {
            console.error('Error regenerando plan:', error);
        } finally {
            setIsRegenerating(false);
        }
    };

    if (isLoading) return <ProgressSkeleton />;
    if (!planId || !initialData) return <ProgressSkeleton />;

    return (
        <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
            <Stack.Screen options={{ title: 'Editar plan de ejercicios' }} />
            <View style={styles.container}>
                {/* Regenerate button */}
                <View style={styles.regenerateSection}>
                    <AppButton
                        label={isRegenerating ? 'Regenerando con IA...' : 'Regenerar con IA'}
                        variant="outlined"
                        icon="magic-staff"
                        onPress={handleRegenerate}
                        loading={isRegenerating}
                        disabled={isRegenerating || isLoading}
                        accessibilityLabel="Regenerar plan con inteligencia artificial"
                    />
                    <Text style={styles.regenerateHint}>
                        Genera un nuevo plan basado en los resultados más recientes de SFT
                    </Text>
                </View>

                <View style={styles.divider} />

                {/* Existing form */}
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
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    regenerateSection: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 4,
    },
    regenerateHint: {
        fontFamily: 'Montserrat_400Regular',
        fontSize: 12,
        color: '#6b7280',
        textAlign: 'center',
    },
    divider: {
        height: 1,
        backgroundColor: '#e5e7eb',
        marginHorizontal: 16,
        marginBottom: 8,
    },
});
