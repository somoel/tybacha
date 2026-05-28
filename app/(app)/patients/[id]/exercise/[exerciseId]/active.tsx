import { RepCounter } from '@/src/components/tests/RepCounter';
import { TimerDisplay } from '@/src/components/tests/TimerDisplay';
import { AppButton } from '@/src/components/ui/AppButton';
import { AppSnackbar } from '@/src/components/ui/AppSnackbar';
import { createApiExerciseRecord, fetchApiExerciseRecords } from '@/src/api/trackingApi';
import { fetchExercisePlans } from '@/src/services/exercisePlanService';
import type { Exercise } from '@/src/types/exercise.types';
import type { ApiExerciseRecord } from '@/src/types/apiTracking.types';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button as PaperButton, Dialog, IconButton, Portal, Text, TextInput, useTheme } from 'react-native-paper';

function getTodayKey(): string {
    const map = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    return map[new Date().getDay()];
}

export default function ActiveExerciseScreen() {
    const { id, exerciseId } = useLocalSearchParams<{ id: string; exerciseId: string }>();
    const navigation = useNavigation();
    const router = useRouter();
    const theme = useTheme();

    const [exercise, setExercise] = useState<Exercise | null>(null);
    const [todayExercises, setTodayExercises] = useState<Exercise[]>([]);
    const [existingRecord, setExistingRecord] = useState<ApiExerciseRecord | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const [value, setValue] = useState(0);
    const [testNotes, setTestNotes] = useState('');
    const [perceivedEffort, setPerceivedEffort] = useState(5);
    const [reportedPain, setReportedPain] = useState(0);
    const [timerCompleted, setTimerCompleted] = useState(false);
    const [snackbar, setSnackbar] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' });
    const [exitDialogVisible, setExitDialogVisible] = useState(false);
    const [saveMode, setSaveMode] = useState<'completed' | 'skipped' | null>(null);
    const allowExitRef = useRef(false);
    const pendingNavigationActionRef = useRef<unknown>(null);

    const hasTimer = exercise != null && exercise.duration_seconds != null && exercise.duration_seconds > 0;
    const hasReps = exercise != null && exercise.reps != null && exercise.reps > 0;
    const hasBoth = hasTimer && hasReps;

    const currentTodayIndex = todayExercises.findIndex((ex) => ex.id_ejercicio_plan === Number(exerciseId));
    const progress = todayExercises.length > 0 ? (currentTodayIndex + 1) / todayExercises.length : 0;

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

                const todayKey = getTodayKey();
                const todayExs = activePlan.exercises.filter((ex) => ex.frequency === todayKey);
                setTodayExercises(todayExs);

                try {
                    const today = new Date().toISOString().slice(0, 10);
                    const records = await fetchApiExerciseRecords(Number(id), today, today);
                    if (!isActive) return;
                    const existing = records.find(
                        (r) => r.idEjercicioPlan === Number(exerciseId)
                    );
                    if (existing) {
                        setExistingRecord(existing);
                        if (existing.repeticionesRealizadas != null) {
                            setValue(existing.repeticionesRealizadas);
                        }
                    }
                } catch {
                    // silent - records are optional
                }
            } catch (error) {
                console.error('Error cargando ejercicio:', error);
            } finally {
                if (isActive) setIsLoading(false);
            }
        };
        load();
        return () => { isActive = false; };
    }, [id, exerciseId]));

    useEffect(() => {
        setTestNotes('');
    }, [exerciseId]);

    useEffect(() => {
        const unsubscribe = navigation.addListener('beforeRemove', (event) => {
            if (allowExitRef.current) return;
            event.preventDefault();
            pendingNavigationActionRef.current = event.data.action;
            setExitDialogVisible(true);
        });
        return unsubscribe;
    }, [navigation]);

    const handleRequestExit = () => {
        pendingNavigationActionRef.current = null;
        setExitDialogVisible(true);
    };

    const handleCancelExit = () => {
        pendingNavigationActionRef.current = null;
        setExitDialogVisible(false);
    };

    const handleConfirmExit = () => {
        allowExitRef.current = true;
        setExitDialogVisible(false);
        if (pendingNavigationActionRef.current) {
            navigation.dispatch(pendingNavigationActionRef.current as never);
            pendingNavigationActionRef.current = null;
            return;
        }
        const destination = id ? `/(app)/patients/${id}` : '/(app)/patients';
        router.replace(destination as never);
    };

    const handleTimerComplete = useCallback((elapsed: number) => {
        setTimerCompleted(true);
        if (hasBoth) {
            // Timer completed, user can now input reps
        } else if (hasTimer && !hasReps) {
            setValue(parseFloat(elapsed.toFixed(1)));
        }
    }, [hasTimer, hasReps, hasBoth]);

    const handleValueChange = useCallback((newValue: number) => {
        setValue(newValue);
    }, []);

    const canSave = !hasTimer || timerCompleted;

    const handleSave = async (mode: 'completed' | 'skipped') => {
        if (!exercise || !id) return;
        setSaveMode(mode);

        try {
            const today = new Date().toISOString().slice(0, 10);
            const payload = {
                idEjercicioPlan: exercise.id_ejercicio_plan!,
                idAdultoMayor: Number(id),
                fechaProgramada: today,
                fechaRealizacion: new Date().toISOString(),
                estado: mode === 'completed' ? 'completado' as const : 'omitido' as const,
                repeticionesRealizadas: hasReps ? value : undefined,
                duracionRealSegundos: hasTimer ? (timerCompleted ? (hasBoth ? undefined : value) : undefined) : undefined,
                esfuerzoPercibido: mode === 'completed' ? perceivedEffort : undefined,
                dolorReportado: mode === 'completed' ? reportedPain : undefined,
                comentario: testNotes || undefined,
            };

            await createApiExerciseRecord(payload);

            setSnackbar({
                visible: true,
                message: mode === 'completed' ? 'Ejercicio completado' : 'Ejercicio omitido',
                type: 'success',
            });

            allowExitRef.current = true;
            setTimeout(() => {
                router.replace(`/(app)/patients/${id}` as never);
            }, 1000);
        } catch (error) {
            setSnackbar({
                visible: true,
                message: error instanceof Error ? error.message : 'Error guardando',
                type: 'error',
            });
        } finally {
            setSaveMode(null);
        }
    };

    if (isLoading) {
        return (
            <View style={styles.centered}>
                <Text style={styles.loadingText}>Cargando ejercicio...</Text>
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

    const isAlreadyCompleted = existingRecord?.estado === 'completado';

    return (
        <View style={styles.container}>
            <View style={styles.topBar}>
                <IconButton
                    icon="arrow-left"
                    mode="contained-tonal"
                    size={20}
                    onPress={handleRequestExit}
                    accessibilityLabel="Volver"
                />
                <View style={styles.topBarText}>
                    <Text style={styles.modeLabel}>Ejercicio de hoy</Text>
                    <Text style={styles.progressText}>
                        Ejercicio {currentTodayIndex + 1} de {todayExercises.length}
                    </Text>
                </View>
                <IconButton
                    icon="close"
                    mode="contained-tonal"
                    size={20}
                    onPress={handleRequestExit}
                    accessibilityLabel="Salir"
                />
            </View>
            <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: theme.colors.primary }]} />
            </View>

            <ScrollView style={styles.content} contentContainerStyle={styles.scroll}>
                <View style={[styles.instructionCard, { backgroundColor: theme.colors.primaryContainer }]}>
                    <MaterialCommunityIcons
                        name="dumbbell"
                        size={36}
                        color={theme.colors.primary}
                    />
                    <Text style={styles.testName}>{exercise.name}</Text>
                    <Text style={styles.testDescription}>{exercise.description}</Text>

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

                {hasTimer && (
                    <TimerDisplay
                        mode="countdown"
                        initialSeconds={exercise.duration_seconds}
                        onComplete={handleTimerComplete}
                    />
                )}

                {hasReps && (
                    <RepCounter
                        mode="increment"
                        allowNegative={false}
                        onValueChange={handleValueChange}
                        label="Repeticiones"
                    />
                )}

                {hasTimer && !hasReps && timerCompleted && (
                    <View style={styles.timerResultContainer}>
                        <Text style={styles.timerResultLabel}>Tiempo registrado:</Text>
                        <Text style={[styles.timerResultValue, { color: theme.colors.primary }]}>
                            {value.toFixed(1)} segundos
                        </Text>
                    </View>
                )}

                <TextInput
                    label="Observaciones (opcional)"
                    value={testNotes}
                    onChangeText={setTestNotes}
                    mode="outlined"
                    multiline
                    numberOfLines={3}
                    style={styles.notesInput}
                    outlineStyle={styles.notesOutline}
                    accessibilityLabel="Observaciones del ejercicio"
                />

                {!isAlreadyCompleted && (
                    <View style={styles.metricsContainer}>
                        <Text style={styles.metricsTitle}>Cómo se sintió</Text>

                        <View style={styles.metricRow}>
                            <View style={styles.metricLabelRow}>
                                <MaterialCommunityIcons name="arm-flex" size={18} color={theme.colors.primary} />
                                <Text style={styles.metricLabel}>Esfuerzo percibido</Text>
                                <Text style={[styles.metricValue, { color: theme.colors.primary }]}>{perceivedEffort}/10</Text>
                            </View>
                            <View style={styles.sliderRow}>
                                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                                    <View
                                        key={n}
                                        style={[
                                            styles.sliderDot,
                                            n <= perceivedEffort && { backgroundColor: theme.colors.primary },
                                        ]}
                                        onTouchEnd={() => setPerceivedEffort(n)}
                                    />
                                ))}
                            </View>
                            <View style={styles.sliderLabels}>
                                <Text style={styles.sliderLabelText}>Nada</Text>
                                <Text style={styles.sliderLabelText}>Máximo</Text>
                            </View>
                        </View>

                        <View style={styles.metricRow}>
                            <View style={styles.metricLabelRow}>
                                <MaterialCommunityIcons name="heart-pulse" size={18} color="#c62828" />
                                <Text style={styles.metricLabel}>Dolor reportado</Text>
                                <Text style={[styles.metricValue, { color: '#c62828' }]}>{reportedPain}/10</Text>
                            </View>
                            <View style={styles.sliderRow}>
                                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                                    <View
                                        key={n}
                                        style={[
                                            styles.sliderDot,
                                            n <= reportedPain && { backgroundColor: '#c62828' },
                                        ]}
                                        onTouchEnd={() => setReportedPain(n)}
                                    />
                                ))}
                            </View>
                            <View style={styles.sliderLabels}>
                                <Text style={styles.sliderLabelText}>Ninguno</Text>
                                <Text style={styles.sliderLabelText}>Intenso</Text>
                            </View>
                        </View>
                    </View>
                )}

                {isAlreadyCompleted ? (
                    <View style={styles.completedBanner}>
                        <MaterialCommunityIcons name="check-circle" size={20} color="#2e7d32" />
                        <Text style={styles.completedText}>Este ejercicio ya fue completado hoy</Text>
                    </View>
                ) : (
                    <View style={styles.actionButtons}>
                        <AppButton
                            label="Marcar como completado"
                            variant="filled"
                            icon="check"
                            onPress={() => handleSave('completed')}
                            disabled={!canSave || saveMode !== null}
                            loading={saveMode === 'completed'}
                            style={styles.completeButton}
                            accessibilityLabel="Marcar ejercicio como completado"
                        />
                        <AppButton
                            label="Marcar como omitido"
                            variant="outlined-error"
                            icon="close"
                            onPress={() => handleSave('skipped')}
                            disabled={saveMode !== null}
                            loading={saveMode === 'skipped'}
                            accessibilityLabel="Marcar ejercicio como omitido"
                        />
                    </View>
                )}

                <AppSnackbar
                    visible={snackbar.visible}
                    message={snackbar.message}
                    type={snackbar.type}
                    onDismiss={() => setSnackbar({ visible: false, message: '', type: 'success' })}
                />
            </ScrollView>

            <Portal>
                <Dialog visible={exitDialogVisible} onDismiss={handleCancelExit}>
                    <Dialog.Title>Salir del ejercicio</Dialog.Title>
                    <Dialog.Content>
                        <Text>Si sales ahora se perderán los datos no guardados. ¿Deseas salir?</Text>
                    </Dialog.Content>
                    <Dialog.Actions>
                        <PaperButton onPress={handleCancelExit}>Continuar</PaperButton>
                        <PaperButton onPress={handleConfirmExit}>Salir</PaperButton>
                    </Dialog.Actions>
                </Dialog>
            </Portal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { fontFamily: 'Montserrat_500Medium', fontSize: 14, color: '#6b7280' },
    errorText: { fontFamily: 'Montserrat_500Medium', fontSize: 14, color: '#c62828' },
    topBar: {
        backgroundColor: '#ffffff',
        borderBottomColor: '#e5e7eb',
        borderBottomWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 14,
        paddingBottom: 10,
    },
    topBarText: { flex: 1, paddingHorizontal: 12 },
    modeLabel: { fontFamily: 'Montserrat_700Bold', fontSize: 18, color: '#1f2937', marginBottom: 2 },
    progressText: { fontFamily: 'Montserrat_600SemiBold', fontSize: 13, color: '#6b7280' },
    progressTrack: { height: 6, backgroundColor: '#e5e7eb', overflow: 'hidden' },
    progressFill: { height: 6 },
    content: { flex: 1 },
    scroll: { padding: 16, paddingBottom: 40 },
    instructionCard: { borderRadius: 20, padding: 20, alignItems: 'center', gap: 8, marginBottom: 20 },
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
    timerResultContainer: { alignItems: 'center', paddingVertical: 16 },
    timerResultLabel: { fontFamily: 'Montserrat_600SemiBold', fontSize: 14, color: '#374151' },
    timerResultValue: { fontFamily: 'Montserrat_800ExtraBold', fontSize: 36, marginTop: 4 },
    notesInput: { marginTop: 20 },
    notesOutline: { borderRadius: 12 },
    metricsContainer: {
        marginTop: 20,
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    metricsTitle: {
        fontFamily: 'Montserrat_700Bold',
        fontSize: 15,
        color: '#1f2937',
        marginBottom: 16,
    },
    metricRow: { marginBottom: 16 },
    metricLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    metricLabel: { fontFamily: 'Montserrat_500Medium', fontSize: 13, color: '#374151', flex: 1 },
    metricValue: { fontFamily: 'Montserrat_700Bold', fontSize: 14 },
    sliderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 4,
    },
    sliderDot: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#e5e7eb',
    },
    sliderLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 4,
    },
    sliderLabelText: { fontFamily: 'Montserrat_400Regular', fontSize: 10, color: '#94a3b8' },
    actionButtons: { gap: 10, marginTop: 24 },
    completeButton: { marginBottom: 4 },
    completedBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#e8f5e9',
        borderRadius: 12,
        paddingVertical: 14,
        marginTop: 24,
    },
    completedText: { fontFamily: 'Montserrat_600SemiBold', fontSize: 14, color: '#2e7d32' },
});
