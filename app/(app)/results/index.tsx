import { ExercisePlanCard } from '@/src/components/results/ExercisePlanCard';
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
import React, { useEffect, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

/**
 * RF-09/RF-10: Results screen with chart display and AI exercise plan generation.
 */
export default function ResultsScreen() {
    const theme = useTheme();
    const { user } = useAuthStore();
    const { isProfessional } = usePermissions();
    const { patients, setPatients } = usePatientsStore();
    const { isGenerating, setGenerating, setGenerationError, generationError, addPlan } = useExercisePlanStore();

    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
    const [latestBattery, setLatestBattery] = useState<BatteryWithResults | null>(null);
    const [plans, setPlans] = useState<ExercisePlan[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [snackbar, setSnackbar] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' });

    useEffect(() => {
        const load = async () => {
            if (!user) return;
            try {
                const role = isProfessional ? 'professional' : 'caregiver';
                const data = await fetchPatients(user.id, role);
                setPatients(data);
                if (data.length > 0) {
                    setSelectedPatient(data[0]);
                }
            } catch (error) {
                console.error('Error:', error);
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, [user, isProfessional, setPatients]);

    useEffect(() => {
        const loadBatteryAndPlans = async () => {
            if (!selectedPatient) return;
            try {
                const batteries = await fetchBatteries(selectedPatient.id);
                if (batteries.length > 0) {
                    const latest = await fetchBatteryWithResults(batteries[0].id);
                    setLatestBattery(latest);
                } else {
                    setLatestBattery(null);
                }
                const patientPlans = await fetchExercisePlans(selectedPatient.id);
                setPlans(patientPlans);
            } catch (error) {
                console.error('Error:', error);
            }
        };
        loadBatteryAndPlans();
    }, [selectedPatient]);

    const handleGeneratePlan = async () => {
        if (!selectedPatient || !latestBattery || !user) return;
        setGenerating(true);
        try {
            const plan = await generateExercisePlan(
                selectedPatient,
                latestBattery.results,
                user.id,
                latestBattery.id
            );
            addPlan(plan);
            setPlans((prev) => [plan, ...prev]);
            setSnackbar({ visible: true, message: 'Plan generado exitosamente ✓', type: 'success' });
        } catch (error) {
            const msg = error instanceof Error ? error.message : 'Error generando plan.';
            setGenerationError(msg);
            setSnackbar({ visible: true, message: msg, type: 'error' });
        } finally {
            setGenerating(false);
        }
    };

    const handleLogExercise = async (exerciseIndex: number) => {
        if (!plans[0] || !user) return;
        try {
            await logExerciseCompletion(plans[0].id, exerciseIndex, user.id, {
                completed: true,
            });
            setSnackbar({ visible: true, message: 'Ejercicio registrado ✓', type: 'success' });
        } catch (error) {
            const msg = error instanceof Error ? error.message : 'Error registrando.';
            setSnackbar({ visible: true, message: msg, type: 'error' });
        }
    };

    if (isLoading) return <AppLoader />;

    const activePlan = plans.find((p) => p.status === 'active');
    const hasActivePlan = !!activePlan;

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            {/* Patient selector */}
            <Text style={styles.sectionTitle}>Seleccionar paciente</Text>
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
                                <Text style={styles.emptyText}>No hay baterías registradas para este paciente.</Text>
                            </View>
                        </AppCard>
                    )}

                    {/* Generate AI plan button */}
                    {isProfessional && latestBattery && !hasActivePlan && (
                        <View style={styles.generateSection}>
                            <AppButton
                                label="Generar plan de ejercicios con IA"
                                variant="filled"
                                icon="robot"
                                onPress={handleGeneratePlan}
                                loading={isGenerating}
                                accessibilityLabel="Generar plan de ejercicios con inteligencia artificial"
                            />
                            {generationError && (
                                <Text style={styles.errorText}>{generationError}</Text>
                            )}
                        </View>
                    )}

                    {/* Exercise plans */}
                    {activePlan && (
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
    errorText: { fontFamily: 'Montserrat_400Regular', fontSize: 13, color: '#c62828', textAlign: 'center' },
    planSection: { marginTop: 16 },
    summary: { fontFamily: 'Montserrat_400Regular', fontSize: 14, color: '#374151', lineHeight: 20, fontStyle: 'italic' },
    bottomPad: { height: 32 },
});
