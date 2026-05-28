import { ExercisePlanCard } from '@/src/components/results/ExercisePlanCard';
import { ExercisePlanForm, type ExercisePlanFormData } from '@/src/components/results/ExercisePlanForm';
import { ResultChart } from '@/src/components/results/ResultChart';
import { AppButton } from '@/src/components/ui/AppButton';
import { AppCard } from '@/src/components/ui/AppCard';
import { AppLoader } from '@/src/components/ui/AppLoader';
import { AppSnackbar } from '@/src/components/ui/AppSnackbar';
import { usePermissions } from '@/src/hooks/usePermissions';
import { fetchBatteries, fetchBatteryWithResults } from '@/src/services/batteryService';
import { fetchExercisePlans, generateExercisePlan, logExerciseCompletion } from '@/src/services/exercisePlanService';
import { fetchPatients } from '@/src/services/patientService';
import { useAuthStore } from '@/src/stores/authStore';
import { useExercisePlanStore } from '@/src/stores/exercisePlanStore';
import { usePatientsStore } from '@/src/stores/patientsStore';
import type { BatteryWithResults } from '@/src/types/battery.types';
import type { ExercisePlan } from '@/src/types/exercise.types';
import type { Patient } from '@/src/types/patient.types';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

type FormMode = 'idle' | 'generating' | 'ready';

/**
 * RF-09/RF-10: Results screen with chart display and exercise plan generation.
 * Flow: try AI first → form (pre-filled or empty) → save.
 */
export default function ResultsScreen() {
    const theme = useTheme();
    const { patientId, batteryId, createPlan } = useLocalSearchParams<{ patientId?: string; batteryId?: string; createPlan?: string }>();
    const { user } = useAuthStore();
    const { isAdmin, isProfessional } = usePermissions();
    const { patients, setPatients } = usePatientsStore();
    const { addPlan } = useExercisePlanStore();

    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
    const [latestBattery, setLatestBattery] = useState<BatteryWithResults | null>(null);
    const [plans, setPlans] = useState<ExercisePlan[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [snackbar, setSnackbar] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' });

    const [formMode, setFormMode] = useState<FormMode>('idle');
    const [formData, setFormData] = useState<ExercisePlanFormData | null>(null);
    const [aiError, setAiError] = useState<string | null>(null);

    const makeFallbackPatient = (id: string): Patient => ({
        id,
        created_by: user?.id ?? '',
        first_name: 'Adulto',
        first_lastname: 'mayor',
        birth_date: new Date().toISOString(),
        gender: 'other',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    });

    useEffect(() => {
        const load = async () => {
            if (!user) {
                if (patientId) {
                    setSelectedPatient(makeFallbackPatient(patientId));
                }
                setIsLoading(false);
                return;
            }
            try {
                const role = isAdmin || isProfessional ? 'profesional' : 'cuidador';
                const data = await fetchPatients(user.id, role);
                setPatients(data);
                if (data.length > 0 || patientId) {
                    setSelectedPatient(data.find((patient) => patient.id === patientId) ?? data[0] ?? makeFallbackPatient(patientId!));
                }
            } catch (error) {
                console.error('Error:', error);
                if (patientId) {
                    setSelectedPatient(makeFallbackPatient(patientId));
                }
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, [user, isAdmin, isProfessional, setPatients, patientId]);
    const hasStaffAccess = isAdmin || isProfessional;
    const isCreatePlanMode = createPlan === '1';

    useEffect(() => {
        const loadBatteryAndPlans = async () => {
            if (!selectedPatient) return;
            try {
                const batteries = await fetchBatteries(selectedPatient.id);
                const selectedBatteryId = selectedPatient.id === patientId ? batteryId : undefined;
                const targetBatteryId = selectedBatteryId ?? batteries[0]?.id;

                if (targetBatteryId) {
                    const latest = await fetchBatteryWithResults(targetBatteryId);
                    setLatestBattery(latest);
                } else {
                    setLatestBattery(null);
                }
                const patientPlans = await fetchExercisePlans(selectedPatient.id);
                setPlans(patientPlans);
            } catch {
                // Handle error silently
            }
        };
        loadBatteryAndPlans();
    }, [selectedPatient, patientId, batteryId]);

    const handleGeneratePlan = async () => {
        if (!selectedPatient || !latestBattery || !user) return;
        setFormMode('generating');
        setAiError(null);
        try {
            const plan = await generateExercisePlan(
                selectedPatient,
                latestBattery.results,
                user.id,
                latestBattery.id
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
        if (!selectedPatient) return;
        try {
            const patientPlans = await fetchExercisePlans(selectedPatient.id);
            setPlans(patientPlans);
            addPlan(patientPlans[0]);
        } catch {
            // silent
        }
        setFormMode('idle');
        setFormData(null);
        setAiError(null);
    };

    if (isLoading) return <AppLoader />;

    const activePlan = plans.find((p) => p.status === 'active');
    const hasActivePlan = !!activePlan;

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            {/* Patient selector */}
            <Text style={styles.sectionTitle}>Seleccionar adulto mayor</Text>
            <FlatList
                data={patients}
                horizontal
                keyExtractor={(p) => p.id}
                renderItem={({ item }) => (
                    <AppCard
                        onPress={() => setSelectedPatient(item)}
                        style={selectedPatient?.id === item.id ? { ...styles.patientChip, ...styles.selectedChip } : styles.patientChip}
                    >
                        <Text style={[styles.chipText, selectedPatient?.id === item.id && styles.selectedChipText]}>
                            {item.first_name} {item.first_lastname}
                        </Text>
                    </AppCard>
                )}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipList}
            />

            {selectedPatient && (
                <>
                    {/* Latest battery results */}
                    {latestBattery ? (
                        <AppCard>
                            <ResultChart results={latestBattery.results} />
                        </AppCard>
                    ) : (
                        <AppCard>
                            <View style={styles.empty}>
                                <MaterialCommunityIcons name="chart-line-variant" size={40} color={theme.colors.outline} />
                                <Text style={styles.emptyText}>No hay baterías registradas para este adulto mayor.</Text>
                            </View>
                        </AppCard>
                    )}

                    {/* Plan creation flow */}
                    {hasStaffAccess && latestBattery && (!hasActivePlan || isCreatePlanMode) && (
                        <>
                            {formMode === 'idle' && (
                                <View style={styles.generateSection}>
                                    {isCreatePlanMode && (
                                        <Text style={styles.createPlanHint}>
                                            Batería guardada. Genera el plan con estos resultados.
                                        </Text>
                                    )}
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
                                    patientId={selectedPatient.id}
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
                </>
            )}

            <View style={styles.bottomPad} />
            <AppSnackbar visible={snackbar.visible} message={snackbar.message} type={snackbar.type} onDismiss={() => setSnackbar((s) => ({ ...s, visible: false }))} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc', padding: 16 },
    sectionTitle: { fontFamily: 'Montserrat_700Bold', fontSize: 16, color: '#1f2937', marginBottom: 10, marginTop: 8 },
    chipList: { gap: 8, marginBottom: 16 },
    patientChip: { paddingHorizontal: 4 },
    selectedChip: { borderColor: '#006d77', borderWidth: 2 },
    chipText: { fontFamily: 'Montserrat_500Medium', fontSize: 13, color: '#374151' },
    selectedChipText: { color: '#006d77', fontFamily: 'Montserrat_600SemiBold' },
    empty: { alignItems: 'center', gap: 8, paddingVertical: 16 },
    emptyText: { fontFamily: 'Montserrat_400Regular', fontSize: 14, color: '#6b7280', textAlign: 'center' },
    generateSection: { marginTop: 16, gap: 8 },
    createPlanHint: { fontFamily: 'Montserrat_500Medium', fontSize: 13, color: '#374151', textAlign: 'center' },
    manualButton: { marginTop: 4 },
    planSection: { marginTop: 16 },
    summary: { fontFamily: 'Montserrat_400Regular', fontSize: 14, color: '#374151', lineHeight: 20, fontStyle: 'italic' },
    bottomPad: { height: 32 },
});
