import { AppButton } from '@/src/components/ui/AppButton';
import { fetchApiExerciseRecords } from '@/src/api/trackingApi';
import { fetchExercisePlans } from '@/src/services/exercisePlanService';
import type { Exercise } from '@/src/types/exercise.types';
import type { ApiExerciseRecord } from '@/src/types/apiTracking.types';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

export default function ExerciseDetailScreen() {
    const { id, exerciseId } = useLocalSearchParams<{ id: string; exerciseId: string }>();
    const router = useRouter();
    const theme = useTheme();

    const [exercise, setExercise] = useState<Exercise | null>(null);
    const [record, setRecord] = useState<ApiExerciseRecord | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useFocusEffect(useCallback(() => {
        let isActive = true;
        const load = async () => {
            if (!id || !exerciseId) return;
            setIsLoading(true);
            try {
                const plans = await fetchExercisePlans(id);
                const activePlan = plans.find((p) => p.status === 'active');
                if (!isActive || !activePlan) return;

                const foundExercise = activePlan.exercises.find(
                    (ex) => ex.id_ejercicio_plan === Number(exerciseId)
                );
                if (!isActive || !foundExercise) return;

                setExercise(foundExercise);

                try {
                    const now = new Date();
                    const dayOfWeek = now.getDay();
                    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
                    const monday = new Date(now);
                    monday.setDate(now.getDate() + mondayOffset);
                    const weekFrom = monday.toISOString().slice(0, 10);
                    const weekTo = now.toISOString().slice(0, 10);
                    const records = await fetchApiExerciseRecords(Number(id), weekFrom, weekTo);
                    if (!isActive) return;
                    const existing = records.find(
                        (r) => r.idEjercicioPlan === Number(exerciseId)
                    );
                    if (existing) {
                        setRecord(existing);
                    }
                } catch {
                    // silent
                }
            } catch (error) {
                console.error('Error cargando detalle del ejercicio:', error);
            } finally {
                if (isActive) setIsLoading(false);
            }
        };
        load();
        return () => { isActive = false; };
    }, [id, exerciseId]));

    if (isLoading) {
        return (
            <View style={styles.centered}>
                <Text style={styles.loadingText}>Cargando detalle...</Text>
            </View>
        );
    }

    if (!exercise) {
        return (
            <View style={styles.centered}>
                <Text style={styles.errorText}>Ejercicio no encontrado</Text>
            </View>
        );
    }

    const isCompleted = record?.estado === 'completado';
    const isSkipped = record?.estado === 'omitido';
    const hasNoRecord = !record;

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ title: 'Detalle del ejercicio' }} />

            <ScrollView style={styles.content} contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.scroll}>
                {/* Exercise info card */}
                <View style={[styles.instructionCard, { backgroundColor: theme.colors.primaryContainer }]}>
                    <MaterialCommunityIcons
                        name="dumbbell"
                        size={36}
                        color={theme.colors.primary}
                    />
                    <Text style={styles.testName}>{exercise.name}</Text>
                    {exercise.description ? (
                        <Text style={styles.testDescription}>{exercise.description}</Text>
                    ) : null}

                    <View style={styles.prescriptionRow}>
                        {exercise.sets > 0 && (
                            <View style={styles.prescriptionChip}>
                                <MaterialCommunityIcons name="repeat" size={14} color={theme.colors.primary} />
                                <Text style={styles.prescriptionText}>{exercise.sets} series</Text>
                            </View>
                        )}
                        {exercise.reps !== null && (
                            <View style={styles.prescriptionChip}>
                                <MaterialCommunityIcons name="counter" size={14} color={theme.colors.primary} />
                                <Text style={styles.prescriptionText}>{exercise.reps} reps</Text>
                            </View>
                        )}
                        {exercise.duration_seconds !== null && (
                            <View style={styles.prescriptionChip}>
                                <MaterialCommunityIcons name="timer-outline" size={14} color={theme.colors.primary} />
                                <Text style={styles.prescriptionText}>{exercise.duration_seconds}s</Text>
                            </View>
                        )}
                    </View>

                    {exercise.rationale ? (
                        <View style={styles.rationaleContainer}>
                            <MaterialCommunityIcons name="lightbulb-outline" size={14} color={theme.colors.secondary} />
                            <Text style={styles.rationale}>{exercise.rationale}</Text>
                        </View>
                    ) : null}
                </View>

                {/* Status banner */}
                {hasNoRecord && (
                    <View style={styles.statusBanner}>
                        <MaterialCommunityIcons name="circle-outline" size={20} color="#94a3b8" />
                        <Text style={styles.statusText}>Sin registro</Text>
                    </View>
                )}

                {isCompleted && (
                    <View style={[styles.statusBanner, { backgroundColor: '#e8f5e9' }]}>
                        <MaterialCommunityIcons name="check-circle" size={20} color="#2e7d32" />
                        <Text style={[styles.statusText, { color: '#2e7d32' }]}>Completado</Text>
                    </View>
                )}

                {isSkipped && (
                    <View style={[styles.statusBanner, { backgroundColor: '#ffebee' }]}>
                        <MaterialCommunityIcons name="close-circle" size={20} color="#c62828" />
                        <Text style={[styles.statusText, { color: '#c62828' }]}>Omitido</Text>
                    </View>
                )}

                {/* Results section */}
                {record && (
                    <View style={styles.resultsContainer}>
                        <Text style={styles.resultsTitle}>Resultados</Text>

                        {record.repeticionesRealizadas != null && (
                            <View style={styles.resultRow}>
                                <MaterialCommunityIcons name="counter" size={18} color={theme.colors.primary} />
                                <Text style={styles.resultLabel}>Repeticiones realizadas</Text>
                                <Text style={styles.resultValue}>{record.repeticionesRealizadas}</Text>
                            </View>
                        )}

                        {record.duracionRealSegundos != null && (
                            <View style={styles.resultRow}>
                                <MaterialCommunityIcons name="timer-outline" size={18} color={theme.colors.primary} />
                                <Text style={styles.resultLabel}>Duración real</Text>
                                <Text style={styles.resultValue}>{record.duracionRealSegundos}s</Text>
                            </View>
                        )}

                        {record.esfuerzoPercibido != null && (
                            <View style={styles.resultRow}>
                                <MaterialCommunityIcons name="arm-flex" size={18} color={theme.colors.primary} />
                                <Text style={styles.resultLabel}>Esfuerzo percibido</Text>
                                <Text style={styles.resultValue}>{record.esfuerzoPercibido}/10</Text>
                            </View>
                        )}

                        {record.dolorReportado != null && (
                            <View style={styles.resultRow}>
                                <MaterialCommunityIcons name="heart-pulse" size={18} color="#c62828" />
                                <Text style={styles.resultLabel}>Dolor reportado</Text>
                                <Text style={[styles.resultValue, { color: '#c62828' }]}>{record.dolorReportado}/10</Text>
                            </View>
                        )}

                        {record.fechaRealizacion && (
                            <View style={styles.resultRow}>
                                <MaterialCommunityIcons name="calendar" size={18} color="#6b7280" />
                                <Text style={styles.resultLabel}>Fecha de realización</Text>
                                <Text style={[styles.resultValue, { color: '#6b7280' }]}>
                                    {new Date(record.fechaRealizacion).toLocaleDateString('es-ES', {
                                        day: 'numeric',
                                        month: 'short',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                    })}
                                </Text>
                            </View>
                        )}

                        {record.comentario && (
                            <View style={styles.notesContainer}>
                                <Text style={styles.notesLabel}>Observaciones</Text>
                                <Text style={styles.notesText}>{record.comentario}</Text>
                            </View>
                        )}
                    </View>
                )}

                <AppButton
                    label="Volver"
                    variant="filled"
                    icon="arrow-left"
                    onPress={() => router.back()}
                    style={styles.backButton}
                />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { fontFamily: 'Montserrat_500Medium', fontSize: 14, color: '#6b7280' },
    errorText: { fontFamily: 'Montserrat_500Medium', fontSize: 14, color: '#c62828' },
    content: { flex: 1 },
    scroll: { padding: 16, paddingBottom: 40 },
    instructionCard: {
        borderRadius: 20,
        padding: 20,
        alignItems: 'center',
        gap: 8,
        marginBottom: 16,
    },
    testName: { fontFamily: 'Montserrat_700Bold', fontSize: 20, color: '#004d40', textAlign: 'center' },
    testDescription: { fontFamily: 'Montserrat_400Regular', fontSize: 14, color: '#004d40', textAlign: 'center', lineHeight: 20 },
    prescriptionRow: { flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap', justifyContent: 'center' },
    prescriptionChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(255,255,255,0.6)',
        borderRadius: 8,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    prescriptionText: { fontFamily: 'Montserrat_600SemiBold', fontSize: 12, color: '#004d40' },
    rationaleContainer: {
        flexDirection: 'row',
        gap: 6,
        backgroundColor: 'rgba(255,255,255,0.4)',
        borderRadius: 8,
        padding: 10,
        marginTop: 8,
    },
    rationale: { fontFamily: 'Montserrat_400Regular', fontSize: 12, color: '#004d40', lineHeight: 16, flex: 1, fontStyle: 'italic' },
    statusBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#f1f5f9',
        borderRadius: 12,
        paddingVertical: 14,
        marginBottom: 16,
    },
    statusText: { fontFamily: 'Montserrat_600SemiBold', fontSize: 15, color: '#6b7280' },
    resultsContainer: {
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        marginBottom: 16,
    },
    resultsTitle: {
        fontFamily: 'Montserrat_700Bold',
        fontSize: 15,
        color: '#1f2937',
        marginBottom: 14,
    },
    resultRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    resultLabel: {
        fontFamily: 'Montserrat_400Regular',
        fontSize: 14,
        color: '#374151',
        flex: 1,
    },
    resultValue: {
        fontFamily: 'Montserrat_700Bold',
        fontSize: 14,
        color: '#1f2937',
    },
    notesContainer: {
        marginTop: 8,
        padding: 12,
        backgroundColor: '#f8fafc',
        borderRadius: 10,
    },
    notesLabel: {
        fontFamily: 'Montserrat_600SemiBold',
        fontSize: 13,
        color: '#374151',
        marginBottom: 4,
    },
    notesText: {
        fontFamily: 'Montserrat_400Regular',
        fontSize: 13,
        color: '#6b7280',
        lineHeight: 18,
    },
    backButton: {
        marginTop: 8,
    },
});
