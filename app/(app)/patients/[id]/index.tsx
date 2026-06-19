import { WeeklyProgressCard } from '@/src/components/exercises/WeeklyProgressCard';
import { DailyProgressCard } from '@/src/components/exercises/DailyProgressCard';
import { TodayExerciseCard } from '@/src/components/exercises/TodayExerciseCard';
import { ExerciseHistoryItem } from '@/src/components/exercises/ExerciseHistoryItem';
import { AppCard } from '@/src/components/ui/AppCard';
import { PatientDetailSkeleton } from '@/src/components/ui/PatientDetailSkeletons';
import { PatientAvatar } from '@/src/components/ui/PatientAvatar';
import { usePermissions } from '@/src/hooks/usePermissions';
import { fetchApiExerciseRecords, fetchApiProgressStats } from '@/src/api/trackingApi';
import { fetchBatteries } from '@/src/services/batteryService';
import { fetchExercisePlans, generateExercisePlan } from '@/src/services/exercisePlanService';
import { fetchPatientById } from '@/src/services/patientService';
import { useMedicalHistoryStore } from '@/src/stores/medicalHistoryStore';
import type { SFTBattery } from '@/src/types/battery.types';
import type { ExercisePlan } from '@/src/types/exercise.types';
import type { Patient } from '@/src/types/patient.types';
import type { ApiExerciseRecord, ApiProgressStats } from '@/src/types/apiTracking.types';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { differenceInYears, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useFocusEffect, useLocalSearchParams, useRouter, Stack } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { IconButton, Menu, Text, useTheme } from 'react-native-paper';

const DAY_KEYS = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];

function getTodayKey(): string {
    return DAY_KEYS[new Date().getDay()];
}

function getWeekRange(): { from: string; to: string } {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(now);
    monday.setDate(now.getDate() + mondayOffset);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return {
        from: format(monday, 'yyyy-MM-dd'),
        to: format(sunday, 'yyyy-MM-dd'),
    };
}

export default function PatientDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const theme = useTheme();
    const router = useRouter();
    const { isAdmin, isProfessional, isCaregiver } = usePermissions();

    const { pathologies, medications, medicalNotes, loadAll: loadMedicalHistory } = useMedicalHistoryStore();

    const [patient, setPatient] = useState<Patient | null>(null);
    const [batteries, setBatteries] = useState<SFTBattery[]>([]);
    const [plans, setPlans] = useState<ExercisePlan[]>([]);
    const [exerciseRecords, setExerciseRecords] = useState<ApiExerciseRecord[]>([]);
    const [progressStats, setProgressStats] = useState<ApiProgressStats[]>([]);
    const [startedExercises, setStartedExercises] = useState<Set<number>>(new Set());
    const [isLoading, setIsLoading] = useState(true);
    const [menuVisible, setMenuVisible] = useState(false);
    const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
    const { width: screenWidth } = useWindowDimensions();

    const hasStaffAccess = isAdmin || isProfessional;
    const totalPathologies = pathologies.length;
    const totalMedications = medications.length;
    const totalNotes = medicalNotes.length;
    const hasMedicalHistory = totalPathologies > 0 || totalMedications > 0 || totalNotes > 0;

    useFocusEffect(useCallback(() => {
        let isActive = true;
        const load = async () => {
            if (!id) return;
            setIsLoading(true);
            try {
                if (hasStaffAccess) {
                    const [p, b, pl] = await Promise.all([
                        fetchPatientById(id),
                        fetchBatteries(id),
                        fetchExercisePlans(id),
                    ]);
                    if (!isActive) return;
                    setPatient(p);
                    setBatteries(b);
                    setPlans(pl);

                    try {
                        await loadMedicalHistory(Number(id));
                    } catch {
                        // silent
                    }

                    try {
                        const stats = await fetchApiProgressStats(Number(id));
                        if (isActive) setProgressStats(stats);
                    } catch {
                        // silent
                    }

                    const activePlanExists = pl.some((p) => p.status === 'active');
                    if (activePlanExists) {
                        const weekRange = getWeekRange();
                        try {
                            const records = await fetchApiExerciseRecords(Number(id), weekRange.from, weekRange.to);
                            if (isActive) setExerciseRecords(records);
                        } catch {
                            // silent - records are optional
                        }
                    }
                } else {
                    const [p, pl] = await Promise.all([
                        fetchPatientById(id),
                        fetchExercisePlans(id),
                    ]);
                    if (!isActive) return;
                    setPatient(p);
                    setPlans(pl);

                    try {
                        await loadMedicalHistory(Number(id));
                    } catch {
                        // silent
                    }

                    if (pl.length > 0) {
                        const weekRange = getWeekRange();
                        try {
                            const records = await fetchApiExerciseRecords(Number(id), weekRange.from, weekRange.to);
                            if (isActive) setExerciseRecords(records);
                        } catch {
                            // silent - records are optional
                        }
                    }
                }
            } catch (error) {
                console.error('Error cargando detalle:', error);
            } finally {
                if (isActive) setIsLoading(false);
            }
        };
        load();
        return () => {
            isActive = false;
        };
    }, [id, hasStaffAccess, loadMedicalHistory]));

    if (isLoading) return <PatientDetailSkeleton />;
    if (!patient) return <PatientDetailSkeleton />;

    const age = differenceInYears(new Date(), new Date(patient.birth_date));
    const fullName = [patient.first_name, patient.second_name, patient.first_lastname, patient.second_lastname]
        .filter(Boolean).join(' ');
    const genderLabel = patient.gender === 'male' ? 'Masculino' : 'Femenino';
    const hasActivePlan = plans.length > 0;
    const activePlan = plans[0] ?? null;

    // Caregiver view
    if (isCaregiver) {
        const todayKey = getTodayKey();
        const todayExercises = activePlan?.exercises.filter((ex) => ex.frequency === todayKey) ?? [];

        const completedIndices = new Set<number>();
        const skippedIndices = new Set<number>();
        const exerciseResultsMap: Record<number, { reps?: number; duration?: number }> = {};
        exerciseRecords.forEach((record) => {
            if (record.estado === 'completado') {
                const exercise = activePlan?.exercises.find(
                    (ex) => ex.id_ejercicio_plan === record.idEjercicioPlan
                );
                if (exercise) {
                    completedIndices.add(exercise.index);
                    exerciseResultsMap[exercise.index] = {
                        reps: record.repeticionesRealizadas ?? undefined,
                        duration: record.duracionRealSegundos ?? undefined,
                    };
                }
            } else if (record.estado === 'omitido') {
                const exercise = activePlan?.exercises.find(
                    (ex) => ex.id_ejercicio_plan === record.idEjercicioPlan
                );
                if (exercise) {
                    skippedIndices.add(exercise.index);
                }
            }
        });

        const cleanedStarted = new Set(startedExercises);
        cleanedStarted.forEach((idx) => {
            if (completedIndices.has(idx)) cleanedStarted.delete(idx);
        });
        const inProgressIndices = cleanedStarted;

        const recentHistory = exerciseRecords
            .filter((r) => r.estado === 'completado' || r.estado === 'omitido')
            .slice(0, 5);

        const todayCompleted = todayExercises.filter((ex) => completedIndices.has(ex.index)).length;
        const todaySkipped = todayExercises.filter((ex) => skippedIndices.has(ex.index)).length;
        const todayTotal = todayExercises.length;

        return (
            <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
                {/* Patient info card */}
                <AppCard style={styles.infoCard}>
                    <View style={styles.header}>
                        <PatientAvatar
                            photoData={patient.photo_data}
                            firstName={patient.first_name}
                            firstLastname={patient.first_lastname}
                            size={56}
                        />
                        <View style={styles.headerInfo}>
                            <Text style={styles.fullName}>{fullName}</Text>
                            <Text style={styles.detailText}>{genderLabel} · {age} años</Text>
                            <Text style={styles.detailText}>
                                Nacimiento: {format(new Date(patient.birth_date), 'dd MMM yyyy', { locale: es })}
                            </Text>
                        </View>
                    </View>
                </AppCard>

                {/* Medical history summary */}
                <AppCard
                    style={styles.sectionCard}
                    onPress={() => router.push(`/(app)/patients/${id}/medical-history` as never)}
                    accessibilityLabel="Ver historial médico"
                >
                    <View style={styles.infoRow}>
                        <MaterialCommunityIcons name="medical-bag" size={22} color={theme.colors.primary} />
                        <View style={styles.infoRowContent}>
                            <Text style={styles.infoRowTitle}>Historial médico</Text>
                            {hasMedicalHistory ? (
                                <Text style={styles.infoRowSummary}>
                                    {[
                                        totalPathologies > 0 && `${totalPathologies} patologías`,
                                        totalMedications > 0 && `${totalMedications} medicamentos`,
                                        totalNotes > 0 && `${totalNotes} notas`,
                                    ].filter(Boolean).join(' · ')}
                                </Text>
                            ) : (
                                <Text style={styles.infoRowEmpty}>Agregar patologías, medicamentos y notas</Text>
                            )}
                        </View>
                        <MaterialCommunityIcons name="chevron-right" size={20} color={theme.colors.outline} />
                    </View>
                </AppCard>

                {/* Consents summary */}
                <AppCard
                    style={styles.sectionCard}
                    onPress={() => router.push(`/(app)/patients/${id}/consents` as never)}
                    accessibilityLabel="Ver consentimientos"
                >
                    <View style={styles.infoRow}>
                        <MaterialCommunityIcons name="shield-check" size={22} color={theme.colors.primary} />
                        <View style={styles.infoRowContent}>
                            <Text style={styles.infoRowTitle}>Consentimientos</Text>
                            <Text style={styles.infoRowEmpty}>Ver consentimientos registrados</Text>
                        </View>
                        <MaterialCommunityIcons name="chevron-right" size={20} color={theme.colors.outline} />
                    </View>
                </AppCard>

                {/* No active plan */}
                {!hasActivePlan && (
                    <AppCard style={styles.waitingCard}>
                        <View style={styles.waitingContent}>
                            <MaterialCommunityIcons name="clock-outline" size={40} color={theme.colors.primary} />
                            <Text style={styles.waitingTitle}>A la espera de evaluación</Text>
                            <Text style={styles.waitingText}>
                                El profesional aún no ha asignado ejercicios. Pronto recibirás tu plan de ejercicios personalizado.
                            </Text>
                        </View>
                    </AppCard>
                )}

                {/* Active plan */}
                {hasActivePlan && (
                    <>
                        {/* Weekly progress */}
                        <WeeklyProgressCard
                            exercises={activePlan!.exercises}
                            completedIndices={completedIndices}
                            todayKey={todayKey}
                        />

                        {/* Today's exercises */}
                        <Text style={styles.sectionTitle}>Ejercicios de hoy</Text>
                        {todayExercises.length === 0 ? (
                            <AppCard style={styles.emptyCard}>
                                <View style={styles.emptyContent}>
                                    <MaterialCommunityIcons name="calendar-blank" size={32} color="#94a3b8" />
                                    <Text style={styles.emptyText}>
                                        No hay ejercicios programados para hoy
                                    </Text>
                                </View>
                            </AppCard>
                        ) : (
                            <>
                                <DailyProgressCard
                                    completed={todayCompleted}
                                    skipped={todaySkipped}
                                    total={todayTotal}
                                />
                                {todayExercises.map((exercise) => {
                                    const status = completedIndices.has(exercise.index)
                                        ? 'completed' as const
                                        : skippedIndices.has(exercise.index)
                                            ? 'skipped' as const
                                            : inProgressIndices.has(exercise.index)
                                                ? 'in_progress' as const
                                                : 'pending' as const;

                                    return (
                                        <TodayExerciseCard
                                            key={exercise.index}
                                            exercise={exercise}
                                            status={status}
                                            resultValue={exerciseResultsMap[exercise.index]?.reps ?? exerciseResultsMap[exercise.index]?.duration}
                                            resultUnit={exerciseResultsMap[exercise.index]?.reps !== undefined ? 'reps' : exerciseResultsMap[exercise.index]?.duration !== undefined ? 's' : undefined}
                                            onPress={() => {
                                                if (!activePlan) return;
                                                if (status === 'completed' || status === 'skipped') {
                                                    router.push(`/(app)/patients/${id}/exercise/${exercise.id_ejercicio_plan}/detail` as never);
                                                } else {
                                                    setStartedExercises((prev) => new Set(prev).add(exercise.index));
                                                    router.push(`/(app)/patients/${id}/exercise/${exercise.id_ejercicio_plan}/active` as never);
                                                }
                                            }}
                                        />
                                    );
                                })}
                            </>
                        )}

                        {/* Recent history */}
                        {recentHistory.length > 0 && (
                            <>
                                <Text style={styles.sectionTitle}>Historial reciente</Text>
                                {recentHistory.map((record) => {
                                    const exercise = activePlan?.exercises.find(
                                        (ex) => ex.id_ejercicio_plan === record.idEjercicioPlan
                                    );
                                    if (!exercise) return null;
                                    return (
                                        <ExerciseHistoryItem
                                            key={record.idRegistroEjercicioPlan}
                                            exerciseName={exercise.name}
                                            completedAt={record.fechaRealizacion ?? record.fechaProgramada}
                                            status={record.estado === 'completado' ? 'completed' : record.estado === 'parcial' ? 'partial' : 'skipped'}
                                            reps={record.repeticionesRealizadas ?? undefined}
                                            duration={record.duracionRealSegundos ?? undefined}
                                        />
                                    );
                                })}
                            </>
                        )}
                    </>
                )}

                <View style={styles.bottomPadding} />
            </ScrollView>
        );
    }

    // Staff view (admin/professional) - redesigned
    const completedIndices = new Set<number>();
    const skippedIndices = new Set<number>();
    exerciseRecords.forEach((record) => {
        const exercise = activePlan?.exercises.find(
            (ex) => ex.id_ejercicio_plan === record.idEjercicioPlan
        );
        if (!exercise) return;
        if (record.estado === 'completado') completedIndices.add(exercise.index);
        else if (record.estado === 'omitido') skippedIndices.add(exercise.index);
    });

    const todayKey = getTodayKey();

    const handleGeneratePlan = async () => {
        if (!id || batteries.length === 0 || isGeneratingPlan) return;
        setIsGeneratingPlan(true);
        try {
            await generateExercisePlan({ id } as any, [], '', batteries[0].id);
            router.push(`/(app)/patients/${id}/progress/edit-plan` as never);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Error al generar el plan';
            Alert.alert('Error', message);
        } finally {
            setIsGeneratingPlan(false);
        }
    };

    return (
        <>
            {/* Header action buttons */}
            <Stack.Screen
                options={{
                    title: fullName,
                    headerRight: () => (
                        <View style={styles.headerActions}>
                            <IconButton
                                icon="clipboard-plus-outline"
                                size={24}
                                iconColor={theme.colors.primary}
                                onPress={() => router.push(`/(app)/patients/${id}/batteries/new` as never)}
                                accessibilityLabel="Realizar batería SFT"
                            />
                            {screenWidth >= 360 ? (
                                <>
                                    <IconButton
                                        icon="pencil-outline"
                                        size={24}
                                        iconColor={theme.colors.onSurface}
                                        onPress={() => router.push(`/(app)/patients/${id}/edit` as never)}
                                        accessibilityLabel="Editar adulto mayor"
                                    />
                                    <IconButton
                                        icon="bell-outline"
                                        size={24}
                                        iconColor={theme.colors.onSurface}
                                        onPress={() => router.push(`/(app)/patients/${id}/alerts` as never)}
                                        accessibilityLabel="Alertas programadas"
                                    />
                                </>
                            ) : (
                                <Menu
                                    visible={menuVisible}
                                    onDismiss={() => setMenuVisible(false)}
                                    anchor={
                                        <IconButton
                                            icon="dots-vertical"
                                            size={24}
                                            iconColor={theme.colors.onSurface}
                                            onPress={() => setMenuVisible(true)}
                                            accessibilityLabel="Más opciones"
                                        />
                                    }
                                >
                                    <Menu.Item
                                        leadingIcon="pencil-outline"
                                        onPress={() => { setMenuVisible(false); router.push(`/(app)/patients/${id}/edit` as never); }}
                                        title="Editar"
                                    />
                                    <Menu.Item
                                        leadingIcon="bell-outline"
                                        onPress={() => { setMenuVisible(false); router.push(`/(app)/patients/${id}/alerts` as never); }}
                                        title="Alertas"
                                    />
                                </Menu>
                            )}
                        </View>
                    ),
                }}
            />

            <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
                {/* Patient info card with caregiver */}
                <AppCard style={styles.infoCard}>
                    <View style={styles.header}>
                        <PatientAvatar
                            photoData={patient.photo_data}
                            firstName={patient.first_name}
                            firstLastname={patient.first_lastname}
                            size={56}
                        />
                        <View style={styles.headerInfo}>
                            <Text style={styles.fullName}>{fullName}</Text>
                            <Text style={styles.detailText}>{genderLabel} · {age} años</Text>
                            <Text style={styles.detailText}>
                                Nacimiento: {format(new Date(patient.birth_date), 'dd MMM yyyy', { locale: es })}
                            </Text>
                        </View>
                    </View>

                    {/* Caregiver section */}
                    <View style={styles.caregiverDivider} />
                    {patient.id_cuidador ? (
                        <Pressable
                            style={styles.caregiverRow}
                            onPress={() => router.push(`/(app)/patients/${id}/assign-caregiver` as never)}
                            accessibilityLabel={`Cuidador: ${patient.caregiver_email}. Toca para cambiar`}
                            accessibilityRole="button"
                        >
                            <MaterialCommunityIcons name="account-circle-outline" size={20} color={theme.colors.primary} />
                            <View style={styles.caregiverInfo}>
                                <Text style={styles.caregiverLabel}>Cuidador asignado</Text>
                                <Text style={styles.caregiverName}>{patient.caregiver_email}</Text>
                            </View>
                            <Text style={styles.caregiverAction}>Cambiar</Text>
                        </Pressable>
                    ) : (
                        <Pressable
                            style={[styles.caregiverRow, styles.caregiverWarning]}
                            onPress={() => router.push(`/(app)/patients/${id}/assign-caregiver` as never)}
                            accessibilityLabel="Sin cuidador asignado. Toca para asignar"
                            accessibilityRole="button"
                        >
                            <MaterialCommunityIcons name="account-alert-outline" size={20} color="#d97706" />
                            <View style={styles.caregiverInfo}>
                                <Text style={styles.caregiverLabel}>Sin cuidador asignado</Text>
                                <Text style={styles.caregiverWarningText}>
                                    Asigna uno para registrar ejercicios y seguimiento
                                </Text>
                            </View>
                            <Text style={[styles.caregiverAction, { color: '#d97706' }]}>Asignar</Text>
                        </Pressable>
                    )}
                </AppCard>

                {/* Sección 1: Información Médica */}
                <Text style={styles.sectionLabel}>Información médica</Text>
                <AppCard style={styles.groupCard}>
                    <Pressable
                        style={styles.groupRow}
                        onPress={() => router.push(`/(app)/patients/${id}/medical-history` as never)}
                        accessibilityLabel="Ver historial médico"
                        accessibilityRole="button"
                    >
                        <MaterialCommunityIcons name="medical-bag" size={22} color={theme.colors.primary} />
                        <View style={styles.infoRowContent}>
                            <Text style={styles.infoRowTitle}>Historial médico</Text>
                            {hasMedicalHistory ? (
                                <Text style={styles.infoRowSummary}>
                                    {[
                                        totalPathologies > 0 && `${totalPathologies} patologías`,
                                        totalMedications > 0 && `${totalMedications} medicamentos`,
                                        totalNotes > 0 && `${totalNotes} notas`,
                                    ].filter(Boolean).join(' · ')}
                                </Text>
                            ) : (
                                <Text style={styles.infoRowEmpty}>Agregar patologías, medicamentos y notas</Text>
                            )}
                        </View>
                        <MaterialCommunityIcons name="chevron-right" size={20} color={theme.colors.outline} />
                    </Pressable>

                    <View style={styles.groupDivider} />

                    <Pressable
                        style={styles.groupRow}
                        onPress={() => router.push(`/(app)/patients/${id}/consents` as never)}
                        accessibilityLabel="Ver consentimientos"
                        accessibilityRole="button"
                    >
                        <MaterialCommunityIcons name="shield-check" size={22} color={theme.colors.primary} />
                        <View style={styles.infoRowContent}>
                            <Text style={styles.infoRowTitle}>Consentimientos</Text>
                            <Text style={styles.infoRowEmpty}>Ver consentimientos registrados</Text>
                        </View>
                        <MaterialCommunityIcons name="chevron-right" size={20} color={theme.colors.outline} />
                    </Pressable>
                </AppCard>

                {/* Sección 2: Progreso de Ejercicios */}
                {hasActivePlan && (() => {
                    const totalExercises = activePlan!.exercises.length;
                    const completedCount = completedIndices.size;
                    const omittedCount = skippedIndices.size;
                    const weeklyCompliance = totalExercises > 0
                        ? Math.round((completedCount / totalExercises) * 100)
                        : 0;

                    const allTimeStats = progressStats.reduce(
                        (acc, stat) => ({
                            programmed: acc.programmed + stat.ejercicios_programados,
                            completed: acc.completed + stat.ejercicios_completados,
                        }),
                        { programmed: 0, completed: 0 },
                    );
                    const allTimeCompliance = allTimeStats.programmed > 0
                        ? Math.round((allTimeStats.completed / allTimeStats.programmed) * 100)
                        : 0;

                    const DAY_KEYS_WEEK = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'] as const;
                    const DAY_LABELS = ['L', 'M', 'X', 'J', 'V'];

                    const dayStatus = DAY_KEYS_WEEK.map((key) => {
                        const dayExercises = activePlan!.exercises.filter((ex) => ex.frequency === key);
                        const allCompleted = dayExercises.length > 0 && dayExercises.every((ex) => completedIndices.has(ex.index));
                        const someCompleted = dayExercises.some((ex) => completedIndices.has(ex.index));
                        const isToday = key === todayKey;
                        return { key, allCompleted, someCompleted, isToday };
                    });

                    return (
                        <Pressable
                            style={styles.progressSection}
                            onPress={() => router.push(`/(app)/patients/${id}/progress` as never)}
                            accessibilityLabel={`Progreso semanal: ${weeklyCompliance}%, todos los tiempos: ${allTimeCompliance}%. Ver progreso completo`}
                            accessibilityRole="button"
                        >
                            <Text style={styles.sectionLabel}>Progreso de ejercicios</Text>
                            <AppCard style={styles.groupCard}>
                                {/* Dual compliance row */}
                                <View style={styles.progressDualRow}>
                                    <View style={styles.progressDualColumn}>
                                        <Text style={styles.progressDualLabel}>Semanal</Text>
                                        <Text style={styles.progressDualPercent}>{weeklyCompliance}%</Text>
                                        <View style={styles.progressTrack}>
                                            <View
                                                style={[
                                                    styles.progressFill,
                                                    {
                                                        width: `${Math.min(weeklyCompliance, 100)}%`,
                                                        backgroundColor: theme.colors.primary,
                                                    },
                                                ]}
                                            />
                                        </View>
                                    </View>

                                    <View style={styles.progressDualColumn}>
                                        <Text style={styles.progressDualLabel}>Todos los tiempos</Text>
                                        <Text style={styles.progressDualPercent}>{allTimeCompliance}%</Text>
                                        <View style={styles.progressTrack}>
                                            <View
                                                style={[
                                                    styles.progressFill,
                                                    {
                                                        width: `${Math.min(allTimeCompliance, 100)}%`,
                                                        backgroundColor: '#059669',
                                                    },
                                                ]}
                                            />
                                        </View>
                                    </View>
                                </View>

                                {/* Weekly day strip */}
                                <View style={styles.weekDaysRow}>
                                    {dayStatus.map((day, i) => (
                                        <View
                                            key={day.key}
                                            style={[
                                                styles.dayBadge,
                                                day.isToday && { backgroundColor: theme.colors.primaryContainer, borderColor: theme.colors.primary },
                                                day.allCompleted && { backgroundColor: '#e8f5e9', borderColor: '#2e7d32' },
                                            ]}
                                        >
                                            <Text
                                                style={[
                                                    styles.dayLabel,
                                                    day.isToday && { color: theme.colors.primary },
                                                    day.allCompleted && { color: '#2e7d32' },
                                                ]}
                                            >
                                                {DAY_LABELS[i]}
                                            </Text>
                                            {day.allCompleted ? (
                                                <MaterialCommunityIcons name="check-circle" size={14} color="#2e7d32" />
                                            ) : day.someCompleted ? (
                                                <MaterialCommunityIcons name="minus-circle" size={14} color={theme.colors.primary} />
                                            ) : (
                                                <MaterialCommunityIcons name="circle-outline" size={14} color="#94a3b8" />
                                            )}
                                        </View>
                                    ))}
                                </View>

                                <View style={styles.progressStats}>
                                    <View style={styles.progressStatChip}>
                                        <MaterialCommunityIcons name="check-circle-outline" size={16} color="#059669" />
                                        <Text style={styles.progressStatText}>
                                            {completedCount} completados
                                        </Text>
                                    </View>
                                    {omittedCount > 0 && (
                                        <View style={styles.progressStatChip}>
                                            <MaterialCommunityIcons name="close-circle-outline" size={16} color="#94a3b8" />
                                            <Text style={styles.progressStatText}>
                                                {omittedCount} omitidos
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            </AppCard>
                        </Pressable>
                    );
                })()}

                {/* Sección 3: Últimas baterías */}
                <Pressable
                    style={styles.sectionHeaderRow}
                    onPress={() => router.push(`/(app)/patients/${id}/batteries` as never)}
                    accessibilityLabel="Ver historial completo de baterías"
                    accessibilityRole="button"
                >
                    <Text style={styles.sectionLabel}>Últimas baterías</Text>
                    <MaterialCommunityIcons name="chevron-right" size={22} color={theme.colors.primary} />
                </Pressable>

                {batteries.length === 0 ? (
                    <AppCard style={styles.sectionCard}>
                        <Text style={styles.emptyText}>No hay baterías registradas aún.</Text>
                    </AppCard>
                ) : (
                    batteries.slice(0, 3).map((battery) => (
                        <AppCard
                            key={battery.id}
                            style={styles.sectionCard}
                            onPress={() => router.push(`/(app)/patients/${id}/batteries/${battery.id}` as never)}
                        >
                            <View style={styles.infoRow}>
                                <MaterialCommunityIcons name="clipboard-check" size={22} color={theme.colors.primary} />
                                <View style={styles.infoRowContent}>
                                    <Text style={styles.infoRowTitle}>
                                        {format(new Date(battery.performed_at), 'dd MMM yyyy, HH:mm', { locale: es })}
                                    </Text>
                                    {battery.notes && <Text style={styles.infoRowEmpty}>{battery.notes}</Text>}
                                </View>
                                <MaterialCommunityIcons name="chevron-right" size={20} color={theme.colors.outline} />
                            </View>
                        </AppCard>
                    ))
                )}

                <View style={styles.bottomPadding} />
            </ScrollView>

            {/* Contextual FAB */}
            {batteries.length === 0 ? (
                <Pressable
                    style={[styles.fab, { backgroundColor: '#006d77' }]}
                    onPress={() => router.push(`/(app)/patients/${id}/batteries/new` as never)}
                    accessibilityLabel="Realizar batería SFT"
                    accessibilityRole="button"
                >
                    <MaterialCommunityIcons name="clipboard-plus" size={20} color="#FFFFFF" />
                    <Text style={styles.fabText}>Realizar batería SFT</Text>
                </Pressable>
            ) : batteries.length > 0 && !hasActivePlan ? (
                <Pressable
                    style={[styles.fab, { backgroundColor: '#006d77' }, isGeneratingPlan && { opacity: 0.7 }]}
                    onPress={handleGeneratePlan}
                    disabled={isGeneratingPlan}
                    accessibilityLabel="Generar plan de ejercicios con IA"
                    accessibilityRole="button"
                >
                    {isGeneratingPlan ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                        <MaterialCommunityIcons name="robot" size={20} color="#FFFFFF" />
                    )}
                    <Text style={styles.fabText}>{isGeneratingPlan ? 'Generando...' : 'Generar plan IA'}</Text>
                </Pressable>
            ) : null}
        </>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc', paddingHorizontal: 16, paddingTop: 16 },
    infoCard: { marginBottom: 12 },
    header: { flexDirection: 'row', gap: 14, alignItems: 'center' },
    headerInfo: { flex: 1, gap: 2 },
    headerActions: { flexDirection: 'row', alignItems: 'center' },
    fullName: { fontFamily: 'Montserrat_700Bold', fontSize: 18, color: '#1f2937' },
    detailText: { fontFamily: 'Montserrat_400Regular', fontSize: 13, color: '#6b7280' },
    caregiverDivider: { height: 1, backgroundColor: '#e5e7eb', marginVertical: 12 },
    caregiverRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    caregiverWarning: { backgroundColor: '#fffbeb', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, marginHorizontal: -6 },
    caregiverInfo: { flex: 1 },
    caregiverLabel: { fontFamily: 'Montserrat_500Medium', fontSize: 13, color: '#374151' },
    caregiverName: { fontFamily: 'Montserrat_700Bold', fontSize: 14, color: '#1f2937', marginTop: 1 },
    caregiverWarningText: { fontFamily: 'Montserrat_400Regular', fontSize: 12, color: '#92400e', marginTop: 1 },
    caregiverAction: { fontFamily: 'Montserrat_600SemiBold', fontSize: 13, color: '#006d77' },
    groupCard: { marginBottom: 8 },
    groupRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 2 },
    groupDivider: { height: 1, backgroundColor: '#e5e7eb', marginVertical: 12 },
    sectionLabel: {
        fontFamily: 'Montserrat_600SemiBold',
        fontSize: 12,
        letterSpacing: 0.5,
        color: '#6b7280',
        textTransform: 'uppercase',
        marginTop: 8,
        marginBottom: 8,
        marginLeft: 4,
    },
    sectionTitle: { fontFamily: 'Montserrat_700Bold', fontSize: 16, color: '#1f2937', marginBottom: 10, marginTop: 8 },
    sectionCard: { marginBottom: 8 },
    infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    infoRowContent: { flex: 1 },
    infoRowTitle: { fontFamily: 'Montserrat_600SemiBold', fontSize: 15, color: '#1f2937' },
    infoRowSummary: { fontFamily: 'Montserrat_400Regular', fontSize: 13, color: '#374151', marginTop: 2 },
    infoRowEmpty: { fontFamily: 'Montserrat_400Regular', fontSize: 13, color: '#9ca3af', marginTop: 2, fontStyle: 'italic' },
    progressSection: { marginBottom: 8 },
    progressBody: { alignItems: 'center', marginBottom: 8 },
    progressPercent: { fontFamily: 'Montserrat_700Bold', fontSize: 40, color: '#1f2937', fontVariant: ['tabular-nums'] },
    progressLabel: { fontFamily: 'Montserrat_400Regular', fontSize: 13, color: '#6b7280', marginTop: -2 },
    progressDualRow: { flexDirection: 'row', gap: 16, marginBottom: 12 },
    progressDualColumn: { flex: 1, alignItems: 'center' },
    progressDualLabel: { fontFamily: 'Montserrat_500Medium', fontSize: 12, color: '#6b7280', marginBottom: 2 },
    progressDualPercent: { fontFamily: 'Montserrat_700Bold', fontSize: 28, color: '#1f2937', fontVariant: ['tabular-nums'], marginBottom: 4 },
    progressTrack: {
        height: 8,
        backgroundColor: '#e5e7eb',
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: 10,
    },
    progressFill: {
        height: '100%',
        borderRadius: 4,
    },
    progressStats: { flexDirection: 'row', justifyContent: 'center', gap: 16 },
    progressStatChip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    progressStatText: { fontFamily: 'Montserrat_500Medium', fontSize: 13, color: '#374151' },
    weekDaysRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
    dayBadge: {
        flex: 1,
        alignItems: 'center',
        gap: 4,
        paddingVertical: 6,
        marginHorizontal: 3,
        borderRadius: 10,
        borderWidth: 1.5,
        borderColor: '#e5e7eb',
    },
    dayLabel: { fontFamily: 'Montserrat_600SemiBold', fontSize: 12, color: '#6b7280' },
    sectionHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 8,
        marginBottom: 0,
        paddingLeft: 4,
    },
    emptyText: { fontFamily: 'Montserrat_400Regular', fontSize: 14, color: '#6b7280', textAlign: 'center', paddingVertical: 8 },
    waitingCard: { marginBottom: 12 },
    waitingContent: { alignItems: 'center', paddingVertical: 20, gap: 12 },
    waitingTitle: { fontFamily: 'Montserrat_700Bold', fontSize: 16, color: '#1f2937', textAlign: 'center' },
    waitingText: { fontFamily: 'Montserrat_400Regular', fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 20 },
    emptyCard: { marginBottom: 8 },
    emptyContent: { alignItems: 'center', paddingVertical: 16, gap: 8 },
    bottomPadding: { height: 96 },
    fab: {
        position: 'absolute',
        right: 16,
        bottom: 24,
        borderRadius: 16,
        minHeight: 56,
        paddingHorizontal: 18,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        elevation: 4,
    },
    fabText: {
        color: '#FFFFFF',
        fontFamily: 'Montserrat_700Bold',
        fontSize: 14,
    },
});
