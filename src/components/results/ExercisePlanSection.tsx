import { ExercisePlanCard } from '@/src/components/results/ExercisePlanCard';
import { ExercisePlanForm, type ExercisePlanFormData } from '@/src/components/results/ExercisePlanForm';
import { AppButton } from '@/src/components/ui/AppButton';
import { AppCard } from '@/src/components/ui/AppCard';
import { AppLoader } from '@/src/components/ui/AppLoader';
import { AppSnackbar } from '@/src/components/ui/AppSnackbar';
import { usePermissions } from '@/src/hooks/usePermissions';
import { fetchExercisePlans, generateExercisePlan, logExerciseCompletion } from '@/src/services/exercisePlanService';
import { useAuthStore } from '@/src/stores/authStore';
import { useExercisePlanStore } from '@/src/stores/exercisePlanStore';
import type { BatteryWithResults } from '@/src/types/battery.types';
import type { ExercisePlan } from '@/src/types/exercise.types';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

type FormMode = 'idle' | 'generating' | 'ready';

interface ExercisePlanSectionProps {
    patientId: string;
    battery: BatteryWithResults;
    forceCreatePlan?: boolean;
    onPlanSaved?: () => void;
}

/**
 * Reusable section that displays exercise plan creation (AI / manual)
 * and active plan display with log-completion.
 */
export function ExercisePlanSection({ patientId, battery, forceCreatePlan, onPlanSaved }: ExercisePlanSectionProps) {
    const theme = useTheme();
    const { user } = useAuthStore();
    const { isAdmin, isProfessional } = usePermissions();
    const { addPlan } = useExercisePlanStore();

    const [plans, setPlans] = useState<ExercisePlan[]>([]);
    const [formMode, setFormMode] = useState<FormMode>(forceCreatePlan ? 'idle' : 'idle');
    const [formData, setFormData] = useState<ExercisePlanFormData | null>(null);
    const [aiError, setAiError] = useState<string | null>(null);
    const [snackbar, setSnackbar] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' });

    const hasStaffAccess = isAdmin || isProfessional;

    useEffect(() => {
        const load = async () => {
            try {
                const patientPlans = await fetchExercisePlans(patientId);
                setPlans(patientPlans);
            } catch {
                // silent
            }
        };
        load();
    }, [patientId]);

    const activePlan = plans.find((p) => p.status === 'active');
    const hasActivePlan = !!activePlan;
    const showPlanCreation = hasStaffAccess && battery.results.length > 0 && (!hasActivePlan || forceCreatePlan);

    const handleGeneratePlan = async () => {
        if (!user) return;
        setFormMode('generating');
        setAiError(null);
        try {
            const plan = await generateExercisePlan(
                { id: patientId } as never,
                battery.results,
                user.id,
                battery.id
            );
            setFormData({
                titulo: 'Plan semanal personalizado',
                objetivo: plan.summary ?? '',
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
            setFormMode('ready');
        } catch (error) {
            setAiError(error instanceof Error ? error.message : 'Error generando plan con IA.');
            setFormData(null);
            setFormMode('ready');
        }
    };

    const handleLogExercise = async (exerciseIndex: number) => {
        if (!plans[0] || !user) return;
        try {
            await logExerciseCompletion(plans[0].id, exerciseIndex, user.id, {
                completed: true,
            });
            setSnackbar({ visible: true, message: 'Ejercicio registrado', type: 'success' });
        } catch (error) {
            const msg = error instanceof Error ? error.message : 'Error registrando.';
            setSnackbar({ visible: true, message: msg, type: 'error' });
        }
    };

    const handlePlanSaved = async () => {
        try {
            const patientPlans = await fetchExercisePlans(patientId);
            setPlans(patientPlans);
            addPlan(patientPlans[0]);
        } catch {
            // silent
        }
        setFormMode('idle');
        setFormData(null);
        setAiError(null);
        onPlanSaved?.();
    };

    if (!showPlanCreation && !hasActivePlan) return null;

    return (
        <View style={styles.container}>
            {/* Plan creation flow */}
            {showPlanCreation && (
                <>
                    {forceCreatePlan && formMode === 'idle' && (
                        <AppCard style={styles.hintCard}>
                            <MaterialCommunityIcons name="lightbulb-outline" size={18} color={theme.colors.primary} />
                            <Text style={[styles.hintText, { color: theme.colors.primary }]}>
                                Bateria guardada. Genera el plan con estos resultados.
                            </Text>
                        </AppCard>
                    )}

                    {formMode === 'idle' && (
                        <View style={styles.generateSection}>
                            <AppButton
                                label="Generar plan de ejercicios con IA"
                                variant="filled"
                                icon="robot"
                                onPress={handleGeneratePlan}
                                accessibilityLabel="Generar plan de ejercicios con inteligencia artificial"
                            />
                            <AppButton
                                label="Crear plan manual"
                                variant="outlined"
                                icon="pencil"
                                onPress={() => { setFormData(null); setAiError(null); setFormMode('ready'); }}
                                style={styles.manualButton}
                                accessibilityLabel="Crear plan de ejercicios manualmente"
                            />
                        </View>
                    )}

                    {formMode === 'generating' && (
                        <AppLoader message="Generando plan con IA..." />
                    )}

                    {formMode === 'ready' && (
                        <ExercisePlanForm
                            patientId={patientId}
                            initialData={formData}
                            isAiFailed={!!aiError}
                            aiError={aiError}
                            onSuccess={handlePlanSaved}
                            onCancel={() => { setFormMode('idle'); setFormData(null); setAiError(null); }}
                        />
                    )}
                </>
            )}

            {/* Active exercise plan */}
            {activePlan && formMode === 'idle' && (
                <View style={styles.planSection}>
                    <Text style={styles.sectionTitle}>Plan de ejercicios activo</Text>
                    {activePlan.summary && (
                        <AppCard>
                            <Text style={styles.summary}>{activePlan.summary}</Text>
                        </AppCard>
                    )}
                    {activePlan.exercises.map((exercise) => (
                        <ExercisePlanCard
                            key={exercise.index}
                            exercise={exercise}
                            onLogPress={handleLogExercise}
                        />
                    ))}
                </View>
            )}

            <AppSnackbar
                visible={snackbar.visible}
                message={snackbar.message}
                type={snackbar.type}
                onDismiss={() => setSnackbar((s) => ({ ...s, visible: false }))}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { marginTop: 16 },
    hintCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    hintText: {
        fontFamily: 'Montserrat_500Medium',
        fontSize: 13,
        flex: 1,
    },
    generateSection: { gap: 8 },
    manualButton: { marginTop: 4 },
    planSection: { marginTop: 8 },
    sectionTitle: {
        fontFamily: 'Montserrat_700Bold',
        fontSize: 16,
        color: '#1f2937',
        marginBottom: 10,
    },
    summary: {
        fontFamily: 'Montserrat_400Regular',
        fontSize: 14,
        color: '#374151',
        lineHeight: 20,
        fontStyle: 'italic',
    },
});
