import { ExerciseActiveSkeleton } from '@/src/components/exercises/ExerciseActiveSkeleton';
import { RepCounter } from '@/src/components/tests/RepCounter';
import { TimerDisplay } from '@/src/components/tests/TimerDisplay';
import { AppButton } from '@/src/components/ui/AppButton';
import { AppSnackbar } from '@/src/components/ui/AppSnackbar';
import { EffortPainScale } from '@/src/components/ui/EffortPainScale';
import { OfflineBanner } from '@/src/components/ui/OfflineBanner';
import { StickyBottomBar } from '@/src/components/ui/StickyBottomBar';
import { borderRadius, spacing } from '@/src/constants/theme';
import { createApiExerciseRecord, fetchApiExerciseRecords } from '@/src/api/trackingApi';
import { fetchExercisePlans } from '@/src/services/exercisePlanService';
import { useSyncStore } from '@/src/stores/syncStore';
import type { Exercise } from '@/src/types/exercise.types';
import type { ApiExerciseRecord, ApiExerciseRecordStatus } from '@/src/types/apiTracking.types';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Stack, useFocusEffect, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button as PaperButton, Dialog, IconButton, Portal, Text, TextInput, useTheme } from 'react-native-paper';

type Phase = 'timer' | 'reps';
type SaveMode = 'completed' | 'skipped';
type SaveResult = { mode: SaveMode; status: ApiExerciseRecordStatus };

function formatSeconds(totalSeconds: number): string {
    const safe = Math.max(0, totalSeconds);
    const mins = Math.floor(safe / 60);
    const secs = Math.floor(safe % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function formatDuration(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    const mins = seconds / 60;
    return Number.isInteger(mins) ? `${mins}m` : `${mins.toFixed(1)}m`;
}

export default function ActiveExerciseScreen() {
    const { id, exerciseId } = useLocalSearchParams<{ id: string; exerciseId: string }>();
    const navigation = useNavigation();
    const router = useRouter();
    const theme = useTheme();
    const isOnline = useSyncStore((s) => s.isOnline);

    const [exercise, setExercise] = useState<Exercise | null>(null);
    const [existingRecord, setExistingRecord] = useState<ApiExerciseRecord | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    const [value, setValue] = useState(0);
    const [testNotes, setTestNotes] = useState('');
    const [perceivedEffort, setPerceivedEffort] = useState(5);
    const [reportedPain, setReportedPain] = useState(0);
    const [setTimerCompleted, setSetTimerCompleted] = useState(false);
    const [setPhase, setSetPhase] = useState<Phase>('timer');
    const [currentSet, setCurrentSet] = useState(1);
    const [repsPerSet, setRepsPerSet] = useState<number[]>([]);
    const [durationsPerSet, setDurationsPerSet] = useState<number[]>([]);
    const [currentSetDuration, setCurrentSetDuration] = useState(0);
    const [allSetsDone, setAllSetsDone] = useState(false);
    const [savedSummary, setSavedSummary] = useState<SaveResult | null>(null);
    const [snackbar, setSnackbar] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' });
    const [exitDialogVisible, setExitDialogVisible] = useState(false);
    const [skipDialogVisible, setSkipDialogVisible] = useState(false);
    const [saveMode, setSaveMode] = useState<SaveMode | null>(null);

    const allowExitRef = useRef(false);
    const pendingNavigationActionRef = useRef<unknown>(null);

    const hasTimer = exercise != null && exercise.duration_seconds != null && exercise.duration_seconds > 0;
    const hasReps = exercise != null && exercise.reps != null && exercise.reps > 0;
    const hasBoth = hasTimer && hasReps;
    const isAlreadyCompleted = existingRecord?.estado === 'completado';
    const totalSets = exercise != null && exercise.sets > 0 ? exercise.sets : 1;
    const hasSets = totalSets > 1;
    const totalReps = hasReps
        ? (hasSets ? repsPerSet.reduce((a, b) => a + b, 0) : value)
        : 0;
    const totalDuration = hasTimer && !hasReps
        ? (hasSets ? durationsPerSet.reduce((a, b) => a + b, 0) : value)
        : 0;
    const setAdvanceReady = hasReps
        ? (hasTimer ? setPhase === 'reps' : true)
        : setTimerCompleted;

    const canSave = isAlreadyCompleted || (hasSets ? allSetsDone : (!hasTimer || setTimerCompleted));
    const isDirty = isAlreadyCompleted
        ? (value !== (existingRecord?.repeticionesRealizadas ?? 0) ||
           perceivedEffort !== (existingRecord?.esfuerzoPercibido ?? 5) ||
           reportedPain !== (existingRecord?.dolorReportado ?? 0) ||
           testNotes !== (existingRecord?.comentario ?? ''))
        : (value > 0 ||
           repsPerSet.length > 0 ||
           durationsPerSet.length > 0 ||
           testNotes !== '' ||
           perceivedEffort !== 5 ||
           reportedPain !== 0);

    const loadExercise = useCallback(async () => {
        if (!id || !exerciseId) return;
        setIsLoading(true);
        setLoadError(null);
        try {
            const plans = await fetchExercisePlans(id);
            const activePlan = plans[0] ?? null;
            if (!activePlan) {
                setLoadError('No se encontró un plan activo para este paciente.');
                return;
            }

            const foundExercise = activePlan.exercises.find(
                (ex) => ex.id_ejercicio_plan === Number(exerciseId)
            );
            if (!foundExercise) {
                setLoadError('El ejercicio ya no está disponible en el plan.');
                return;
            }

            setExercise(foundExercise);

            try {
                const today = new Date().toISOString().slice(0, 10);
                const records = await fetchApiExerciseRecords(Number(id), today, today);
                const existing = records.find((r) => r.idEjercicioPlan === Number(exerciseId)) ?? null;
                setExistingRecord(existing);
                setValue(existing?.repeticionesRealizadas ?? 0);
                setPerceivedEffort(existing?.esfuerzoPercibido ?? 5);
                setReportedPain(existing?.dolorReportado ?? 0);
                setTestNotes(existing?.comentario ?? '');
                setSetTimerCompleted(
                    existing?.duracionRealSegundos != null && (foundExercise.duration_seconds ?? 0) > 0
                );
                setSetPhase(existing ? 'reps' : (foundExercise.duration_seconds ? 'timer' : 'reps'));
                setCurrentSet(1);
                setRepsPerSet([]);
                setDurationsPerSet([]);
                setCurrentSetDuration(0);
                setAllSetsDone(false);
            } catch {
                setExistingRecord(null);
                setValue(0);
                setPerceivedEffort(5);
                setReportedPain(0);
                setTestNotes('');
                setSetTimerCompleted(false);
                setSetPhase(foundExercise.duration_seconds ? 'timer' : 'reps');
                setCurrentSet(1);
                setRepsPerSet([]);
                setDurationsPerSet([]);
                setCurrentSetDuration(0);
                setAllSetsDone(false);
            }
        } catch (error) {
            setLoadError(
                error instanceof Error ? error.message : 'No se pudo cargar el ejercicio.'
            );
        } finally {
            setIsLoading(false);
        }
    }, [id, exerciseId]);

    useFocusEffect(useCallback(() => {
        loadExercise();
    }, [loadExercise]));

    useEffect(() => {
        const unsubscribe = navigation.addListener('beforeRemove', (event) => {
            if (allowExitRef.current) return;
            if (savedSummary != null) return;
            if (isAlreadyCompleted && !isDirty) return;
            if (!isDirty) return;
            event.preventDefault();
            pendingNavigationActionRef.current = event.data.action;
            setExitDialogVisible(true);
        });
        return unsubscribe;
    }, [navigation, savedSummary, isAlreadyCompleted, isDirty]);

    const handleRequestExit = () => {
        if (savedSummary != null) {
            confirmExit();
            return;
        }
        if (isAlreadyCompleted && !isDirty) {
            confirmExit();
            return;
        }
        if (!isDirty) {
            confirmExit();
            return;
        }
        pendingNavigationActionRef.current = null;
        setExitDialogVisible(true);
    };

    const handleCancelExit = () => {
        pendingNavigationActionRef.current = null;
        setExitDialogVisible(false);
    };

    const confirmExit = () => {
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
        setSetTimerCompleted(true);
        setCurrentSetDuration(elapsed);
        if (hasBoth) {
            setSetPhase('reps');
        } else if (hasTimer && !hasReps && !hasSets) {
            setValue(parseFloat(elapsed.toFixed(1)));
        }
    }, [hasTimer, hasReps, hasBoth, hasSets]);

    const handleAdvanceSet = useCallback(() => {
        Haptics.selectionAsync().catch(() => {});
        if (hasReps) {
            setRepsPerSet(prev => [...prev, value]);
        }
        if (hasTimer && !hasReps) {
            setDurationsPerSet(prev => [...prev, currentSetDuration]);
        }
        if (currentSet < totalSets) {
            setCurrentSet(prev => prev + 1);
            setValue(0);
            setCurrentSetDuration(0);
            setSetTimerCompleted(false);
            setSetPhase(hasTimer ? 'timer' : 'reps');
        } else {
            setAllSetsDone(true);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        }
    }, [hasReps, hasTimer, value, currentSetDuration, currentSet, totalSets]);

    const handleValueChange = useCallback((newValue: number) => {
        setValue(newValue);
    }, []);

    const handleSave = async (mode: SaveMode) => {
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
                repeticionesRealizadas: hasReps ? totalReps : undefined,
                duracionRealSegundos: hasTimer && !hasReps
                    ? (hasSets ? (allSetsDone ? totalDuration : undefined) : (setTimerCompleted ? value : undefined))
                    : undefined,
                esfuerzoPercibido: mode === 'completed' ? perceivedEffort : undefined,
                dolorReportado: mode === 'completed' ? reportedPain : undefined,
                comentario: testNotes || undefined,
            };

            await createApiExerciseRecord(payload);

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

            setSavedSummary({
                mode,
                status: mode === 'completed' ? 'completado' : 'omitido',
            });
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

    const handleReturnToPatient = () => {
        allowExitRef.current = true;
        const destination = id ? `/(app)/patients/${id}` : '/(app)/patients';
        router.replace(destination as never);
    };

    if (isLoading) {
        return (
            <View style={styles.container}>
                <Stack.Screen options={{ title: 'Ejercicio de hoy', headerRight: undefined }} />
                <ExerciseActiveSkeleton />
            </View>
        );
    }

    if (loadError || !exercise) {
        return (
            <View style={styles.container}>
                <Stack.Screen options={{ title: 'Ejercicio de hoy', headerRight: undefined }} />
                <View style={styles.centered}>
                    <View style={[styles.errorIconWrap, { backgroundColor: theme.colors.errorContainer }]}>
                        <MaterialCommunityIcons name="alert-circle-outline" size={36} color={theme.colors.error} />
                    </View>
                    <Text style={styles.errorTitle}>No se pudo cargar el ejercicio</Text>
                    <Text style={styles.errorBody}>{loadError ?? 'Inténtalo de nuevo.'}</Text>
                    <AppButton
                        label="Reintentar"
                        variant="filled"
                        icon="refresh"
                        onPress={loadExercise}
                        style={styles.retryButton}
                        accessibilityLabel="Reintentar carga del ejercicio"
                    />
                </View>
            </View>
        );
    }

    if (savedSummary) {
        return (
            <View style={styles.container}>
                <Stack.Screen
                    options={{
                        title: 'Listo',
                        headerRight: undefined,
                    }}
                />
                <ScrollView contentContainerStyle={styles.successContent}>
                    <View
                        style={[styles.successIconWrap, { backgroundColor: theme.colors.primaryContainer }]}
                    >
                        <MaterialCommunityIcons
                            name={savedSummary.mode === 'completed' ? 'check-circle' : 'minus-circle'}
                            size={48}
                            color={theme.colors.primary}
                        />
                    </View>

                    <Text style={styles.successTitle}>
                        {savedSummary.mode === 'completed'
                            ? 'Ejercicio registrado'
                            : 'Ejercicio marcado como omitido'}
                    </Text>
                    <Text style={styles.successSubtitle}>
                        {savedSummary.mode === 'completed'
                            ? 'Guardamos el resultado de la sesión de hoy.'
                            : 'Lo registramos como no realizado. No afecta los próximos ejercicios.'}
                    </Text>

                    {savedSummary.mode === 'completed' && (
                        <View style={[styles.summaryCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}>
                            <SummaryRow
                                icon="counter"
                                label={`Repeticiones${hasSets ? ` (${totalSets} series)` : ''}`}
                                value={hasReps ? String(totalReps) : '—'}
                            />
                            {hasSets && hasReps && repsPerSet.length > 0 && (
                                <Text style={styles.summaryBreakdown}>
                                    {repsPerSet.join(' + ')} = {totalReps}
                                </Text>
                            )}
                            <SummaryDivider />
                            <SummaryRow
                                icon="timer-outline"
                                label="Duración"
                                value={hasTimer && !hasReps
                                    ? formatSeconds(totalDuration)
                                    : (hasTimer && hasReps ? formatSeconds(exercise.duration_seconds ?? 0) : '—')}
                            />
                            <SummaryDivider />
                            <SummaryRow
                                icon="arm-flex"
                                label="Esfuerzo percibido"
                                value={`${perceivedEffort}/10`}
                            />
                            <SummaryDivider />
                            <SummaryRow
                                icon="heart-pulse"
                                label="Dolor reportado"
                                value={`${reportedPain}/10`}
                            />
                            {testNotes.trim().length > 0 && (
                                <>
                                    <SummaryDivider />
                                    <SummaryRow icon="note-text-outline" label="Observaciones" value={testNotes} multiline />
                                </>
                            )}
                        </View>
                    )}
                </ScrollView>
                <StickyBottomBar>
                    <AppButton
                        label="Volver al paciente"
                        variant="filled"
                        icon="arrow-left"
                        onPress={handleReturnToPatient}
                        accessibilityLabel="Volver a la ficha del paciente"
                    />
                </StickyBottomBar>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Stack.Screen
                options={{
                    title: exercise.name,
                    headerRight: () => (
                        <IconButton icon="close" size={24} onPress={handleRequestExit} />
                    ),
                }}
            />

            <ScrollView
                style={styles.content}
                contentInsetAdjustmentBehavior="automatic"
                contentContainerStyle={styles.scroll}
                keyboardShouldPersistTaps="handled"
            >
                {!isOnline && <OfflineBanner visible />}

                {isAlreadyCompleted && (
                    <View style={[styles.completedBadge, { backgroundColor: theme.colors.primaryContainer }]}>
                        <MaterialCommunityIcons name="check-circle" size={18} color={theme.colors.primary} />
                        <Text style={[styles.completedBadgeText, { color: theme.colors.onPrimaryContainer }]}>
                            Completado hoy · puedes actualizar el registro
                        </Text>
                    </View>
                )}

                <View style={[styles.instructionCard, { backgroundColor: theme.colors.primaryContainer }]}>
                    <View style={styles.objectiveHeader}>
                        <View style={styles.objectiveIconWrap}>
                            <MaterialCommunityIcons
                                name="dumbbell"
                                size={24}
                                color={theme.colors.onPrimaryContainer}
                            />
                        </View>
                        <Text style={styles.objectiveLabel}>OBJETIVO</Text>
                    </View>
                    <Text style={styles.testName}>{exercise.name}</Text>

                    <View style={styles.prescriptionRow}>
                        {exercise.sets > 0 && (
                            <View style={styles.prescriptionChip}>
                                <MaterialCommunityIcons name="repeat" size={14} color={theme.colors.onPrimaryContainer} />
                                <Text style={styles.prescriptionText}>{exercise.sets} series</Text>
                            </View>
                        )}
                        {exercise.reps != null && exercise.reps > 0 && (
                            <View style={styles.prescriptionChip}>
                                <MaterialCommunityIcons name="counter" size={14} color={theme.colors.onPrimaryContainer} />
                                <Text style={styles.prescriptionText}>{exercise.reps} reps</Text>
                            </View>
                        )}
                        {exercise.duration_seconds != null && exercise.duration_seconds > 0 && (
                            <View style={styles.prescriptionChip}>
                                <MaterialCommunityIcons name="timer-outline" size={14} color={theme.colors.onPrimaryContainer} />
                                <Text style={styles.prescriptionText}>{formatDuration(exercise.duration_seconds)}</Text>
                            </View>
                        )}
                    </View>

                    {exercise.rationale ? (
                        <View style={styles.rationaleContainer}>
                            <View style={styles.rationaleHeader}>
                                <MaterialCommunityIcons name="lightbulb-outline" size={14} color={theme.colors.onPrimaryContainer} />
                                <Text style={styles.rationaleLabel}>POR QUÉ</Text>
                            </View>
                            <Text style={styles.rationale}>{exercise.rationale}</Text>
                        </View>
                    ) : null}
                </View>

                {exercise.description ? (
                    <Text style={styles.description}>{exercise.description}</Text>
                ) : null}

                {hasSets && !isAlreadyCompleted && (
                    <View style={styles.setTracker}>
                        <Text style={styles.setTrackerLabel}>Serie {currentSet} de {totalSets}</Text>
                        <View style={styles.setTrackerDots}>
                            {Array.from({ length: totalSets }, (_, i) => {
                                const isCompleted = allSetsDone || i < currentSet - 1;
                                const isCurrent = !allSetsDone && i === currentSet - 1;
                                return (
                                    <View
                                        key={i}
                                        style={[
                                            styles.setTrackerDot,
                                            {
                                                backgroundColor: isCompleted || isCurrent
                                                    ? theme.colors.primary
                                                    : theme.colors.surfaceVariant,
                                                opacity: isCurrent && !isCompleted ? 0.4 : 1,
                                            },
                                        ]}
                                    />
                                );
                            })}
                        </View>
                    </View>
                )}

                {hasTimer && setPhase === 'timer' && (
                    <TimerDisplay
                        key={`timer-${currentSet}`}
                        mode="countdown"
                        initialSeconds={exercise.duration_seconds ?? 0}
                        onComplete={handleTimerComplete}
                        disabled={isAlreadyCompleted}
                    />
                )}

                {hasTimer && setPhase === 'reps' && (
                    <View style={styles.timerSummary}>
                        <View style={styles.timerSummaryIcon}>
                            <MaterialCommunityIcons name="check" size={16} color={theme.colors.primary} />
                        </View>
                        <Text style={styles.timerSummaryLabel}>Cronómetro{hasSets ? ` · serie ${currentSet}` : ''}</Text>
                        <Text style={styles.timerSummaryValue}>
                            {hasBoth
                                ? formatSeconds(exercise.duration_seconds ?? 0)
                                : formatSeconds(hasSets ? currentSetDuration : value)}
                        </Text>
                    </View>
                )}

                {hasReps && setPhase === 'reps' && (
                    <View style={styles.repsBlock}>
                        <Text style={styles.phaseLabel}>
                            {hasBoth ? 'Ahora cuenta las repeticiones' : 'Repeticiones'}
                        </Text>
                        <RepCounter
                            key={`reps-${currentSet}`}
                            mode="increment"
                            allowNegative={false}
                            onValueChange={handleValueChange}
                            label={`Repeticiones${hasSets ? ` · serie ${currentSet}` : ''}`}
                            disabled={isAlreadyCompleted}
                        />
                    </View>
                )}

                {!hasTimer && hasReps && (
                    <RepCounter
                        key={hasSets ? `reps-${currentSet}` : 'reps'}
                        mode="increment"
                        allowNegative={false}
                        onValueChange={handleValueChange}
                        label={`Repeticiones${hasSets ? ` · serie ${currentSet}` : ''}`}
                        disabled={isAlreadyCompleted}
                    />
                )}

                {hasTimer && !hasReps && setTimerCompleted && !hasSets && (
                    <View style={styles.timerResultContainer}>
                        <Text style={styles.timerResultLabel}>Tiempo registrado:</Text>
                        <Text style={[styles.timerResultValue, { color: theme.colors.primary }]}>
                            {value.toFixed(1)} segundos
                        </Text>
                    </View>
                )}

                {hasSets && !isAlreadyCompleted && !allSetsDone && setAdvanceReady && (
                    <View style={styles.advanceButton}>
                        <AppButton
                            label={currentSet < totalSets ? 'Siguiente serie' : 'Finalizar serie'}
                            variant="outlined"
                            icon={currentSet < totalSets ? 'arrow-right' : 'check'}
                            onPress={handleAdvanceSet}
                            accessibilityLabel={currentSet < totalSets ? 'Avanzar a la siguiente serie' : 'Finalizar la última serie'}
                        />
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

                <View style={[styles.metricsContainer, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}>
                    <Text style={styles.metricsTitle}>Cómo se sintió</Text>

                    <EffortPainScale
                        value={perceivedEffort}
                        onChange={setPerceivedEffort}
                        label="Esfuerzo percibido"
                        icon="arm-flex"
                        color={theme.colors.primary}
                        leftLabel="Nada"
                        rightLabel="Máximo"
                    />

                    <EffortPainScale
                        value={reportedPain}
                        onChange={setReportedPain}
                        label="Dolor reportado"
                        icon="heart-pulse"
                        color={theme.colors.error}
                        leftLabel="Ninguno"
                        rightLabel="Intenso"
                    />
                </View>
            </ScrollView>

            <StickyBottomBar>
                <View style={styles.actionButtons}>
                    <AppButton
                        label={isAlreadyCompleted ? "Actualizar registro" : "Marcar como completado"}
                        variant="filled"
                        icon="check"
                        onPress={() => handleSave('completed')}
                        disabled={!canSave || saveMode !== null}
                        loading={saveMode === 'completed'}
                        accessibilityLabel={isAlreadyCompleted ? "Actualizar registro del ejercicio" : "Marcar ejercicio como completado"}
                    />
                    {hasSets && !allSetsDone ? (
                        <Text style={styles.saveHint}>
                            Completa las {totalSets} series para guardar{currentSet > 1 ? ` (van ${currentSet - 1})` : ''}
                        </Text>
                    ) : hasTimer && !setTimerCompleted ? (
                        <Text style={styles.saveHint}>Completa el cronómetro para habilitar guardar</Text>
                    ) : null}
                    <View style={styles.skipRow}>
                        <AppButton
                            label="Marcar como omitido"
                            variant="text"
                            icon="close"
                            onPress={() => setSkipDialogVisible(true)}
                            disabled={saveMode !== null}
                            textColor={theme.colors.error}
                            accessibilityLabel="Marcar ejercicio como omitido"
                            style={styles.skipButton}
                        />
                    </View>
                </View>
            </StickyBottomBar>

            <AppSnackbar
                visible={snackbar.visible}
                message={snackbar.message}
                type={snackbar.type}
                onDismiss={() => setSnackbar({ visible: false, message: '', type: 'success' })}
            />

            <Portal>
                <Dialog visible={exitDialogVisible} onDismiss={handleCancelExit}>
                    <Dialog.Title>Salir del ejercicio</Dialog.Title>
                    <Dialog.Content>
                        <Text>Tienes cambios sin guardar. ¿Deseas salir de todos modos?</Text>
                    </Dialog.Content>
                    <Dialog.Actions>
                        <PaperButton onPress={handleCancelExit}>Continuar aquí</PaperButton>
                        <PaperButton onPress={confirmExit} textColor={theme.colors.error}>Salir</PaperButton>
                    </Dialog.Actions>
                </Dialog>

                <Dialog visible={skipDialogVisible} onDismiss={() => setSkipDialogVisible(false)}>
                    <Dialog.Title>¿Marcar como omitido?</Dialog.Title>
                    <Dialog.Content>
                        <Text>
                            Este ejercicio no se contará como realizado y no se guardarán repeticiones,
                            tiempo ni métricas. ¿Confirmas?
                        </Text>
                    </Dialog.Content>
                    <Dialog.Actions>
                        <PaperButton onPress={() => setSkipDialogVisible(false)}>Cancelar</PaperButton>
                        <PaperButton
                            onPress={() => {
                                setSkipDialogVisible(false);
                                handleSave('skipped');
                            }}
                            textColor={theme.colors.error}
                        >
                            Sí, omitir
                        </PaperButton>
                    </Dialog.Actions>
                </Dialog>
            </Portal>
        </View>
    );
}

function SummaryRow({
    icon,
    label,
    value,
    multiline = false,
}: {
    icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
    label: string;
    value: string;
    multiline?: boolean;
}) {
    return (
        <View style={styles.summaryRow}>
            <MaterialCommunityIcons
                name={icon}
                size={18}
                color="#006d77"
                style={styles.summaryIcon}
            />
            <View style={styles.summaryText}>
                <Text style={styles.summaryLabel}>{label}</Text>
                <Text
                    style={styles.summaryValue}
                    numberOfLines={multiline ? undefined : 1}
                >
                    {value}
                </Text>
            </View>
        </View>
    );
}

function SummaryDivider() {
    return <View style={styles.summaryDivider} />;
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
    errorIconWrap: {
        width: 72,
        height: 72,
        borderRadius: 36,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    errorTitle: {
        fontFamily: 'Montserrat_700Bold',
        fontSize: 18,
        color: '#1f2937',
        textAlign: 'center',
        marginBottom: 6,
    },
    errorBody: {
        fontFamily: 'Montserrat_400Regular',
        fontSize: 14,
        color: '#6b7280',
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 20,
    },
    retryButton: {
        minWidth: 180,
    },
    content: { flex: 1 },
    scroll: { padding: spacing.md, paddingBottom: 40 },
    completedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: spacing.md,
        paddingVertical: 10,
        borderRadius: borderRadius.md,
        marginBottom: spacing.md,
    },
    completedBadgeText: {
        fontFamily: 'Montserrat_600SemiBold',
        fontSize: 13,
        flex: 1,
    },
    instructionCard: {
        borderRadius: borderRadius.xl,
        padding: spacing.lg,
        marginBottom: spacing.md,
    },
    objectiveHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        alignSelf: 'center',
        marginBottom: 8,
    },
    objectiveIconWrap: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    objectiveLabel: {
        fontFamily: 'Montserrat_700Bold',
        fontSize: 11,
        color: '#004d40',
        letterSpacing: 1.5,
    },
    testName: {
        fontFamily: 'Montserrat_700Bold',
        fontSize: 20,
        color: '#004d40',
        textAlign: 'center',
        marginBottom: 4,
    },
    prescriptionRow: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 12,
        flexWrap: 'wrap',
        justifyContent: 'center',
    },
    prescriptionChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(255,255,255,0.7)',
        borderRadius: borderRadius.sm,
        paddingHorizontal: 10,
        paddingVertical: 5,
    },
    prescriptionText: {
        fontFamily: 'Montserrat_600SemiBold',
        fontSize: 12,
        color: '#004d40',
    },
    rationaleContainer: {
        marginTop: spacing.md,
        paddingTop: spacing.md,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,77,64,0.15)',
    },
    rationaleHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 4,
        justifyContent: 'center',
    },
    rationaleLabel: {
        fontFamily: 'Montserrat_700Bold',
        fontSize: 10,
        color: '#004d40',
        letterSpacing: 1.2,
    },
    rationale: {
        fontFamily: 'Montserrat_400Regular',
        fontSize: 13,
        color: '#004d40',
        lineHeight: 18,
        fontStyle: 'italic',
        opacity: 0.85,
        textAlign: 'center',
        paddingHorizontal: spacing.xs,
    },
    description: {
        fontFamily: 'Montserrat_400Regular',
        fontSize: 14,
        color: '#374151',
        lineHeight: 20,
        textAlign: 'center',
        marginBottom: spacing.lg,
        paddingHorizontal: spacing.xs,
    },
    timerSummary: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: borderRadius.md,
        paddingHorizontal: spacing.md,
        paddingVertical: 10,
        marginTop: spacing.sm,
        alignSelf: 'center',
    },
    timerSummaryIcon: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#b2dfdb',
        justifyContent: 'center',
        alignItems: 'center',
    },
    timerSummaryLabel: {
        fontFamily: 'Montserrat_500Medium',
        fontSize: 13,
        color: '#6b7280',
    },
    timerSummaryValue: {
        fontFamily: 'Montserrat_700Bold',
        fontSize: 16,
        color: '#006d77',
    },
    repsBlock: {
        marginTop: spacing.xs,
    },
    phaseLabel: {
        fontFamily: 'Montserrat_600SemiBold',
        fontSize: 14,
        color: '#374151',
        textAlign: 'center',
        marginBottom: 4,
    },
    setTracker: {
        alignItems: 'center',
        marginTop: spacing.sm,
        marginBottom: spacing.xs,
        gap: 8,
    },
    setTrackerLabel: {
        fontFamily: 'Montserrat_700Bold',
        fontSize: 13,
        color: '#006d77',
        letterSpacing: 0.5,
    },
    setTrackerDots: {
        flexDirection: 'row',
        gap: 8,
    },
    setTrackerDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    advanceButton: {
        marginTop: spacing.md,
    },
    timerResultContainer: { alignItems: 'center', paddingVertical: spacing.md },
    timerResultLabel: { fontFamily: 'Montserrat_600SemiBold', fontSize: 14, color: '#374151' },
    timerResultValue: { fontFamily: 'Montserrat_800ExtraBold', fontSize: 36, marginTop: 4 },
    notesInput: { marginTop: spacing.lg },
    notesOutline: { borderRadius: borderRadius.md },
    metricsContainer: {
        marginTop: spacing.lg,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        borderWidth: 1,
    },
    metricsTitle: {
        fontFamily: 'Montserrat_700Bold',
        fontSize: 15,
        color: '#1f2937',
        marginBottom: spacing.md,
    },
    actionButtons: { gap: 6 },
    saveHint: {
        fontFamily: 'Montserrat_400Regular',
        fontSize: 12,
        color: '#94a3b8',
        textAlign: 'center',
        marginTop: 4,
    },
    skipRow: {
        alignItems: 'center',
    },
    skipButton: {
        minWidth: 0,
    },
    successContent: {
        flexGrow: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.xl,
    },
    successIconWrap: {
        width: 96,
        height: 96,
        borderRadius: 48,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    successTitle: {
        fontFamily: 'Montserrat_700Bold',
        fontSize: 22,
        color: '#1f2937',
        textAlign: 'center',
        marginBottom: 6,
    },
    successSubtitle: {
        fontFamily: 'Montserrat_400Regular',
        fontSize: 14,
        color: '#6b7280',
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: spacing.lg,
    },
    summaryCard: {
        width: '100%',
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        padding: spacing.md,
    },
    summaryRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        paddingVertical: 8,
    },
    summaryIcon: {
        marginTop: 2,
    },
    summaryText: {
        flex: 1,
    },
    summaryLabel: {
        fontFamily: 'Montserrat_500Medium',
        fontSize: 12,
        color: '#6b7280',
        marginBottom: 2,
    },
    summaryValue: {
        fontFamily: 'Montserrat_600SemiBold',
        fontSize: 15,
        color: '#1f2937',
    },
    summaryBreakdown: {
        fontFamily: 'Montserrat_400Regular',
        fontSize: 12,
        color: '#6b7280',
        marginTop: 2,
        paddingLeft: 30,
    },
    summaryDivider: {
        height: 1,
        backgroundColor: '#e5e7eb',
    },
});
