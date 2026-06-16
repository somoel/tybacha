import { AppButton } from '@/src/components/ui/AppButton';
import { ExercisePlanForm, type ExercisePlanFormData } from '@/src/components/results/ExercisePlanForm';
import { ProgressSkeleton } from '@/src/components/ui/PatientDetailSkeletons';
import { ShimmerOverlay } from '@/src/components/ui/ShimmerOverlay';
import { fetchOlderAdultSftApplications } from '@/src/api/sftApi';
import { fetchExercisePlans, generateExercisePlan } from '@/src/services/exercisePlanService';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { Text } from 'react-native-paper';

export default function EditPlanSheet() {
    const { id: patientId } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const [planId, setPlanId] = useState<string | null>(null);
    const [initialData, setInitialData] = useState<ExercisePlanFormData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRegenerating, setIsRegenerating] = useState(false);

    const formOpacity = useSharedValue(1);
    const formTranslateY = useSharedValue(0);

    const prevRegenerating = useRef(false);

    useEffect(() => {
        if (prevRegenerating.current && !isRegenerating) {
            formOpacity.value = 0;
            formTranslateY.value = 20;
            formOpacity.value = withTiming(1, { duration: 400 });
            formTranslateY.value = withTiming(0, { duration: 400 });
        }
        prevRegenerating.current = isRegenerating;
    }, [isRegenerating, formOpacity, formTranslateY]);

    const animatedFormStyle = useAnimatedStyle(() => ({
        opacity: formOpacity.value,
        transform: [{ translateY: formTranslateY.value }],
    }));

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
            const applications = await fetchOlderAdultSftApplications(Number(patientId));
            if (!applications || applications.length === 0) {
                console.error('No hay baterías SFT registradas para este paciente');
                return;
            }
            const latestApp = applications[0];
            const batteryId = String(latestApp.idAplicacionSft);

            await generateExercisePlan(
                { id: patientId } as any,
                [],
                '',
                batteryId,
            );

            const plans = await fetchExercisePlans(patientId);
            const plan = plans[0];
            if (plan) {
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
            }
        } catch (error) {
            console.error('Error regenerando plan:', error);
        } finally {
            setIsRegenerating(false);
        }
    };

    if (isLoading) return <ProgressSkeleton />;
    if (!planId || !initialData) return <ProgressSkeleton />;

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.scrollContent}
            contentInsetAdjustmentBehavior="automatic"
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
        >
            <View style={styles.regenerateSection}>
                <ShimmerOverlay visible={isRegenerating}>
                    <AppButton
                        label={isRegenerating ? 'Regenerando con IA...' : 'Regenerar con IA'}
                        variant="outlined"
                        icon="magic-staff"
                        onPress={handleRegenerate}
                        loading={isRegenerating}
                        disabled={isRegenerating || isLoading}
                        style={styles.regenerateButton}
                        accessibilityLabel="Regenerar plan con inteligencia artificial"
                    />
                </ShimmerOverlay>
                <Text style={styles.regenerateHint}>
                    Genera un nuevo plan basado en los resultados más recientes de SFT
                </Text>
            </View>

            <View style={styles.divider} />

            <Animated.View style={animatedFormStyle}>
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
            </Animated.View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc', paddingHorizontal: 16 },
    scrollContent: {
        paddingTop: 60,
        paddingBottom: 32,
    },
    regenerateSection: {
        paddingVertical: 12,
        gap: 6,
    },
    regenerateButton: {
        alignSelf: 'stretch',
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
        marginVertical: 8,
    },
});
