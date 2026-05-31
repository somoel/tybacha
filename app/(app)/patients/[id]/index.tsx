import { WeeklyProgressCard } from '@/src/components/exercises/WeeklyProgressCard';
import { TodayExerciseCard } from '@/src/components/exercises/TodayExerciseCard';
import { ExerciseHistoryItem } from '@/src/components/exercises/ExerciseHistoryItem';
import { AppButton } from '@/src/components/ui/AppButton';
import { AppCard } from '@/src/components/ui/AppCard';
import { AppLoader } from '@/src/components/ui/AppLoader';
import { PatientAvatar } from '@/src/components/ui/PatientAvatar';
import { usePermissions } from '@/src/hooks/usePermissions';
import { fetchApiExerciseRecords, fetchApiProgressStats } from '@/src/api/trackingApi';
import { fetchBatteries } from '@/src/services/batteryService';
import { fetchExercisePlans } from '@/src/services/exercisePlanService';
import { fetchPatientById } from '@/src/services/patientService';
import type { SFTBattery } from '@/src/types/battery.types';
import type { ExercisePlan } from '@/src/types/exercise.types';
import type { Patient } from '@/src/types/patient.types';
import type { ApiExerciseRecord, ApiProgressStats } from '@/src/types/apiTracking.types';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { differenceInYears, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Divider, Text, useTheme } from 'react-native-paper';

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
    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4);
    return {
        from: monday.toISOString().slice(0, 10),
        to: friday.toISOString().slice(0, 10),
    };
}

export default function PatientDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const theme = useTheme();
    const router = useRouter();
    const { isAdmin, isProfessional, isCaregiver } = usePermissions();

    const [patient, setPatient] = useState<Patient | null>(null);
    const [batteries, setBatteries] = useState<SFTBattery[]>([]);
    const [plans, setPlans] = useState<ExercisePlan[]>([]);
    const [exerciseRecords, setExerciseRecords] = useState<ApiExerciseRecord[]>([]);
    const [progressStats, setProgressStats] = useState<ApiProgressStats[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const hasStaffAccess = isAdmin || isProfessional;

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
                        const stats = await fetchApiProgressStats(Number(id));
                        if (isActive) setProgressStats(stats);
                    } catch {
                        // silent
                    }
                } else {
                    const [p, pl] = await Promise.all([
                        fetchPatientById(id),
                        fetchExercisePlans(id),
                    ]);
                    if (!isActive) return;
                    setPatient(p);
                    setPlans(pl);

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
    }, [id, hasStaffAccess]));

    if (isLoading) return <AppLoader message="Cargando adulto mayor..." />;
    if (!patient) return <AppLoader message="Adulto mayor no encontrado" />;

    const age = differenceInYears(new Date(), new Date(patient.birth_date));
    const fullName = [patient.first_name, patient.second_name, patient.first_lastname, patient.second_lastname]
        .filter(Boolean).join(' ');
    const genderLabel = patient.gender === 'male' ? 'Masculino' : patient.gender === 'female' ? 'Femenino' : 'Otro';
    const hasActivePlan = plans.some((p) => p.status === 'active');
    const activePlan = plans.find((p) => p.status === 'active');

    // Caregiver view
    if (isCaregiver) {
        const todayKey = getTodayKey();
        const todayExercises = activePlan?.exercises.filter((ex) => ex.frequency === todayKey) ?? [];

        const completedIndices = new Set<number>();
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
            }
        });

        const recentHistory = exerciseRecords
            .filter((r) => r.estado === 'completado' || r.estado === 'omitido')
            .slice(0, 5);

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
                    <AppButton
                        label="Historial médico"
                        variant="text"
                        icon="medical-bag"
                        onPress={() => router.push(`/(app)/patients/${id}/medical-history` as never)}
                        accessibilityLabel="Ver historial médico"
                        style={styles.medicalHistoryBtn}
                    />
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
                            todayExercises.map((exercise) => (
                                <TodayExerciseCard
                                    key={exercise.index}
                                    exercise={exercise}
                                    status={
                                        completedIndices.has(exercise.index)
                                            ? 'completed'
                                            : 'pending'
                                    }
                                    resultValue={exerciseResultsMap[exercise.index]?.reps ?? exerciseResultsMap[exercise.index]?.duration}
                                    resultUnit={exerciseResultsMap[exercise.index]?.reps !== undefined ? 'reps' : exerciseResultsMap[exercise.index]?.duration !== undefined ? 's' : undefined}
                                    onPress={() => {
                                        if (activePlan) {
                                            router.push(`/(app)/patients/${id}/exercise/${exercise.id_ejercicio_plan}/active` as never);
                                        }
                                    }}
                                />
                            ))
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
                                            status={record.estado === 'completado' ? 'completed' : 'skipped'}
                                            reps={record.repeticionesRealizadas ?? undefined}
                                            duration={record.duracionRealSegundos ?? undefined}
                                        />
                                    );
                                })}
                            </>
                        )}

                        {/* View full plan */}
                        <AppButton
                            label="Ver plan semanal completo"
                            variant="outlined"
                            icon="calendar-week"
                            onPress={() => router.push(`/(app)/patients/${id}/exercise` as never)}
                            style={styles.viewPlanButton}
                            accessibilityLabel="Ver plan semanal completo"
                        />
                    </>
                )}

                <View style={styles.bottomPadding} />
            </ScrollView>
        );
    }

    // Staff view (admin/professional) - original logic
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
                    <AppButton
                        label="Historial médico"
                        variant="text"
                        icon="medical-bag"
                        onPress={() => router.push(`/(app)/patients/${id}/medical-history` as never)}
                        accessibilityLabel="Ver historial médico"
                        style={styles.medicalHistoryBtn}
                    />
                </AppCard>

                {/* Caregiver status indicator */}
            {!patient.id_cuidador && hasStaffAccess && (
                <AppCard style={styles.warningCard}>
                    <View style={styles.warningContent}>
                        <MaterialCommunityIcons name="account-alert-outline" size={20} color="#d97706" />
                        <Text style={styles.warningText}>
                            Este adulto mayor no tiene cuidador asignado. Asigne uno para poder registrar ejercicios y seguimiento.
                        </Text>
                    </View>
                </AppCard>
            )}

            {/* Action buttons */}
            <View style={styles.actions}>
                <AppButton
                    label="Realizar bateria"
                    variant="filled"
                    icon="clipboard-plus"
                    onPress={() => router.push(`/(app)/patients/${id}/batteries/new` as never)}
                    accessibilityLabel="Realizar bateria SFT"
                />
                <AppButton
                    label="Ver historial baterías"
                    variant="outlined"
                    icon="history"
                    onPress={() => router.push(`/(app)/patients/${id}/batteries` as never)}
                    accessibilityLabel="Ver historial de baterías"
                />
                {hasStaffAccess && batteries.length > 0 && !hasActivePlan && (
                    <AppButton
                        label="Generar plan IA"
                        variant="filled"
                        icon="robot"
                        onPress={() => router.push(`/(app)/patients/${id}/batteries/${batteries[0].id}` as never)}
                        accessibilityLabel="Generar plan de ejercicios con IA"
                    />
                )}
                {hasStaffAccess && (
                    <>
                        <Divider style={styles.divider} />
                        <AppButton
                            label="Editar adulto mayor"
                            variant="outlined"
                            icon="pencil"
                            onPress={() => router.push(`/(app)/patients/${id}/edit` as never)}
                            accessibilityLabel="Editar adulto mayor"
                        />
                        <AppButton
                            label="Asignar cuidador"
                            variant="outlined"
                            icon="account-plus"
                            onPress={() => router.push(`/(app)/patients/${id}/assign-caregiver` as never)}
                            accessibilityLabel="Asignar cuidador"
                        />
                        <AppButton
                            label="Alertas programadas"
                            variant="outlined"
                            icon="bell-outline"
                            onPress={() => router.push(`/(app)/patients/${id}/alerts` as never)}
                            accessibilityLabel="Ver alertas programadas"
                        />
                    </>
                )}
            </View>

            {/* Recent batteries */}
            <Text style={styles.sectionTitle}>Últimas baterías</Text>
            {batteries.length === 0 ? (
                <AppCard>
                    <Text style={styles.emptyText}>No hay baterías registradas aún.</Text>
                </AppCard>
            ) : (
                batteries.slice(0, 3).map((battery) => (
                    <AppCard
                        key={battery.id}
                        onPress={() => router.push(`/(app)/patients/${id}/batteries/${battery.id}` as never)}
                    >
                        <View style={styles.batteryRow}>
                            <MaterialCommunityIcons name="clipboard-check" size={24} color={theme.colors.primary} />
                            <View style={styles.batteryInfo}>
                                <Text style={styles.batteryDate}>
                                    {format(new Date(battery.performed_at), 'dd MMM yyyy, HH:mm', { locale: es })}
                                </Text>
                                {battery.notes && <Text style={styles.batteryNotes}>{battery.notes}</Text>}
                            </View>
                            <MaterialCommunityIcons name="chevron-right" size={20} color={theme.colors.outline} />
                        </View>
                    </AppCard>
                ))
            )}

            {/* Exercise progress summary for staff */}
            {hasActivePlan && progressStats.length > 0 && (
                <>
                    <Text style={styles.sectionTitle}>Progreso de ejercicios</Text>
                    <AppCard
                        style={styles.progressCard}
                        onPress={() => router.push(`/(app)/patients/${id}/progress` as never)}
                    >
                        <View style={styles.progressHeader}>
                            <MaterialCommunityIcons name="chart-line" size={20} color={theme.colors.primary} />
                            <Text style={styles.progressTitle}>Ver progreso completo</Text>
                            <MaterialCommunityIcons name="chevron-right" size={20} color={theme.colors.outline} />
                        </View>
                        {progressStats[0] && (
                            <View style={styles.progressSummary}>
                                <Text style={styles.progressPercent}>
                                    {Math.round(progressStats[0].porcentaje_cumplimiento)}% cumplimiento
                                </Text>
                                <Text style={styles.progressDetail}>
                                    {progressStats[0].ejercicios_completados} completados · {progressStats[0].ejercicios_omitidos} omitidos
                                </Text>
                            </View>
                        )}
                    </AppCard>
                </>
            )}

            <View style={styles.bottomPadding} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc', paddingHorizontal: 16, paddingTop: 16 },
    infoCard: { marginBottom: 16 },
    warningCard: { marginBottom: 16, backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fcd34d' },
    warningContent: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    warningText: { fontFamily: 'Montserrat_400Regular', fontSize: 13, color: '#92400e', flex: 1 },
    header: { flexDirection: 'row', gap: 14, alignItems: 'center' },
    headerInfo: { flex: 1, gap: 2 },
    fullName: { fontFamily: 'Montserrat_700Bold', fontSize: 18, color: '#1f2937' },
    detailText: { fontFamily: 'Montserrat_400Regular', fontSize: 13, color: '#6b7280' },
    medicalHistoryBtn: { marginTop: 4, alignSelf: 'flex-start' },
    actions: { gap: 8, marginBottom: 24 },
    divider: { marginVertical: 4 },
    sectionTitle: { fontFamily: 'Montserrat_700Bold', fontSize: 16, color: '#1f2937', marginBottom: 10, marginTop: 8 },
    emptyText: { fontFamily: 'Montserrat_400Regular', fontSize: 14, color: '#6b7280', textAlign: 'center', paddingVertical: 8 },
    batteryRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    batteryInfo: { flex: 1 },
    batteryDate: { fontFamily: 'Montserrat_600SemiBold', fontSize: 14, color: '#1f2937' },
    batteryNotes: { fontFamily: 'Montserrat_400Regular', fontSize: 12, color: '#6b7280' },
    bottomPadding: { height: 32 },
    waitingCard: { marginBottom: 16 },
    waitingContent: { alignItems: 'center', paddingVertical: 20, gap: 12 },
    waitingTitle: { fontFamily: 'Montserrat_700Bold', fontSize: 16, color: '#1f2937', textAlign: 'center' },
    waitingText: { fontFamily: 'Montserrat_400Regular', fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 20 },
    emptyCard: { marginBottom: 8 },
    emptyContent: { alignItems: 'center', paddingVertical: 16, gap: 8 },
    viewPlanButton: { marginTop: 16 },
    progressCard: { marginBottom: 8 },
    progressHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    progressTitle: { fontFamily: 'Montserrat_600SemiBold', fontSize: 14, color: '#1f2937', flex: 1 },
    progressSummary: { marginTop: 8 },
    progressPercent: { fontFamily: 'Montserrat_700Bold', fontSize: 18, color: '#1f2937' },
    progressDetail: { fontFamily: 'Montserrat_400Regular', fontSize: 12, color: '#6b7280', marginTop: 2 },
});
