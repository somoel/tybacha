import { PlanOverviewSection } from '@/src/components/exercises/PlanOverviewSection';
import { ComplianceTrendChart } from '@/src/components/exercises/ComplianceTrendChart';
import { ExerciseHistoryItem } from '@/src/components/exercises/ExerciseHistoryItem';
import { MetricDetailCard } from '@/src/components/exercises/MetricDetailCard';
import { AppCard } from '@/src/components/ui/AppCard';
import { ProgressSkeleton } from '@/src/components/ui/PatientDetailSkeletons';
import { usePermissions } from '@/src/hooks/usePermissions';
import { fetchApiExerciseRecords, fetchApiProgressStats } from '@/src/api/trackingApi';
import { fetchExercisePlans } from '@/src/services/exercisePlanService';
import { fetchPatientById } from '@/src/services/patientService';
import type { ExercisePlan } from '@/src/types/exercise.types';
import type { Patient } from '@/src/types/patient.types';
import type { ApiExerciseRecord, ApiProgressStats } from '@/src/types/apiTracking.types';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

const DAY_KEYS_WEEK = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'] as const;
const DAY_LABELS = ['L', 'M', 'X', 'J', 'V'];

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

function getTodayKey(): string {
    const day = new Date().getDay();
    const map = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    return map[day];
}

export default function ProgressScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const theme = useTheme();
    const router = useRouter();
    const { isAdmin, isProfessional } = usePermissions();
    const hasStaffAccess = isAdmin || isProfessional;

    const [patient, setPatient] = useState<Patient | null>(null);
    const [activePlan, setActivePlan] = useState<ExercisePlan | null>(null);
    const [progressStats, setProgressStats] = useState<ApiProgressStats[]>([]);
    const [exerciseRecords, setExerciseRecords] = useState<ApiExerciseRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useFocusEffect(useCallback(() => {
        let isActive = true;
        const load = async () => {
            if (!id) return;
            setIsLoading(true);
            try {
                const [p, plans] = await Promise.all([
                    fetchPatientById(id),
                    fetchExercisePlans(id),
                ]);
                if (!isActive) return;
                setPatient(p);

                const active = plans[0] ?? null;
                setActivePlan(active ?? null);

                try {
                    const [stats, records] = await Promise.all([
                        fetchApiProgressStats(Number(id)),
                        fetchApiExerciseRecords(
                            Number(id),
                            format(subDays(new Date(), 90), 'yyyy-MM-dd'),
                            format(new Date(), 'yyyy-MM-dd'),
                        ),
                    ]);
                    if (!isActive) return;
                    setProgressStats(stats);
                    setExerciseRecords(records);
                } catch {
                    // silent
                }
            } catch (error) {
                console.error('Error cargando progreso:', error);
            } finally {
                if (isActive) setIsLoading(false);
            }
        };
        load();
        return () => { isActive = false; };
    }, [id]));

    const handleEditPlan = () => {
        router.push(`/(app)/patients/${id}/progress/edit-plan` as never);
    };

    const handleRegeneratePlan = () => {
        Alert.alert(
            'Regenerar plan',
            'Se generará un nuevo plan con IA. El plan actual será reemplazado. ¿Continuar?',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Regenerar',
                    style: 'destructive',
                    onPress: async () => {
                        // TODO: implementar regeneración con IA
                        // Por ahora solo muestra un mensaje
                        Alert.alert('Función próximamente', 'La regeneración con IA se implementará pronto.');
                    },
                },
            ],
        );
    };

    if (isLoading) return <ProgressSkeleton />;
    if (!patient) return <ProgressSkeleton />;

    const weekRange = getWeekRange();
    const todayKey = getTodayKey();

    // Find current week stats using robust comparison (handles both string formats)
    const currentWeekStats = progressStats.find((s) => {
        const statsFrom = typeof s.fecha_inicio === 'string' ? s.fecha_inicio.slice(0, 10) : format(new Date(s.fecha_inicio), 'yyyy-MM-dd');
        const statsTo = typeof s.fecha_fin === 'string' ? s.fecha_fin.slice(0, 10) : format(new Date(s.fecha_fin), 'yyyy-MM-dd');
        return statsFrom === weekRange.from && statsTo === weekRange.to;
    });

    // Calculate all-time stats
    const allTimeTotals = progressStats.reduce(
        (acc, stat) => ({
            programmed: acc.programmed + stat.ejercicios_programados,
            completed: acc.completed + stat.ejercicios_completados,
            omitted: acc.omitted + stat.ejercicios_omitidos,
        }),
        { programmed: 0, completed: 0, omitted: 0 },
    );
    const allTimeCompliance = allTimeTotals.programmed > 0
        ? Math.round((allTimeTotals.completed / allTimeTotals.programmed) * 100)
        : 0;

    // Weekly compliance (from current week stats or calculate from records)
    const weeklyCompliance = currentWeekStats
        ? Math.round(currentWeekStats.porcentaje_cumplimiento)
        : 0;
    const weeklyCompleted = currentWeekStats?.ejercicios_completados ?? 0;
    const weeklyOmitted = currentWeekStats?.ejercicios_omitidos ?? 0;

    // Day status for LMXJV strip (from exercise records)
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

    const dayStatus = DAY_KEYS_WEEK.map((key) => {
        const dayExercises = activePlan?.exercises.filter((ex) => ex.frequency === key) ?? [];
        const allCompleted = dayExercises.length > 0 && dayExercises.every((ex) => completedIndices.has(ex.index));
        const someCompleted = dayExercises.some((ex) => completedIndices.has(ex.index));
        const isToday = key === todayKey;
        return { key, allCompleted, someCompleted, isToday, hasExercises: dayExercises.length > 0 };
    });

    // Recent records (last 10, grouped by date)
    const recentRecords = exerciseRecords
        .filter((r) => r.estado === 'completado' || r.estado === 'omitido' || r.estado === 'parcial')
        .slice(0, 10);

    const firstName = patient.first_name ?? 'Adulto mayor';

    return (
        <ScrollView style={styles.container} contentInsetAdjustmentBehavior="automatic" showsVerticalScrollIndicator={false}>
            <Stack.Screen options={{ title: 'Plan de ejercicios' }} />
            <Text style={styles.patientName}>{firstName}</Text>

            {/* Sección 1: Plan activo */}
            <PlanOverviewSection
                patientId={id!}
                plan={activePlan}
                exerciseRecords={exerciseRecords}
                onEdit={hasStaffAccess ? handleEditPlan : undefined}
                onRegenerate={hasStaffAccess ? handleRegeneratePlan : undefined}
            />

            {/* Sección 2: Progreso */}
            <Text style={styles.sectionLabel}>Progreso</Text>

            {/* Esta semana */}
            <AppCard style={styles.summaryCard}>
                <View style={styles.summaryDateRow}>
                    <MaterialCommunityIcons name="calendar-week" size={16} color={theme.colors.primary} />
                    <Text style={styles.summaryDate}>
                        {format(new Date(weekRange.from), 'dd MMM', { locale: es })} – {format(new Date(weekRange.to), 'dd MMM yyyy', { locale: es })}
                    </Text>
                </View>

                {/* Compliance percentage */}
                <View style={styles.complianceCenter}>
                    <Text style={[styles.compliancePercent, { color: theme.colors.primary }]}>
                        {weeklyCompliance}%
                    </Text>
                    <Text style={styles.complianceLabel}>cumplimiento semanal</Text>
                </View>

                {/* Progress bar */}
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

                {/* LMXJV strip */}
                <View style={styles.weekDaysRow}>
                    {dayStatus.map((day, i) => (
                        <View
                            key={day.key}
                            style={[
                                styles.dayBadge,
                                day.isToday && { backgroundColor: theme.colors.primaryContainer, borderColor: theme.colors.primary },
                                day.allCompleted && { backgroundColor: '#e8f5e9', borderColor: '#2e7d32' },
                                !day.hasExercises && { opacity: 0.4 },
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
                            ) : day.hasExercises ? (
                                <MaterialCommunityIcons name="circle-outline" size={14} color="#94a3b8" />
                            ) : (
                                <MaterialCommunityIcons name="circle-outline" size={14} color="#d1d5db" />
                            )}
                        </View>
                    ))}
                </View>

                {/* Stats chips */}
                <View style={styles.statsRow}>
                    <View style={styles.statChip}>
                        <MaterialCommunityIcons name="check-circle-outline" size={16} color="#059669" />
                        <Text style={styles.statText}>{weeklyCompleted} completados</Text>
                    </View>
                    {weeklyOmitted > 0 && (
                        <View style={styles.statChip}>
                            <MaterialCommunityIcons name="close-circle-outline" size={16} color="#94a3b8" />
                            <Text style={styles.statText}>{weeklyOmitted} omitidos</Text>
                        </View>
                    )}
                </View>
            </AppCard>

            {/* Todos los tiempos */}
            {progressStats.length > 0 && (
                <>
                    <Text style={styles.sectionLabel}>Todos los tiempos</Text>
                    <AppCard style={styles.summaryCard}>
                        <View style={styles.summaryDateRow}>
                            <MaterialCommunityIcons name="chart-line" size={16} color="#059669" />
                            <Text style={styles.summaryDate}>
                                {progressStats.length} semana{progressStats.length > 1 ? 's' : ''} con datos
                            </Text>
                        </View>

                        <View style={styles.complianceCenter}>
                            <Text style={[styles.compliancePercent, { color: '#059669' }]}>
                                {allTimeCompliance}%
                            </Text>
                            <Text style={styles.complianceLabel}>cumplimiento total</Text>
                        </View>

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

                        <View style={styles.statsRow}>
                            <View style={styles.statChip}>
                                <MaterialCommunityIcons name="check-circle-outline" size={16} color="#059669" />
                                <Text style={styles.statText}>{allTimeTotals.completed} completados</Text>
                            </View>
                            {allTimeTotals.omitted > 0 && (
                                <View style={styles.statChip}>
                                    <MaterialCommunityIcons name="close-circle-outline" size={16} color="#94a3b8" />
                                    <Text style={styles.statText}>{allTimeTotals.omitted} omitidos</Text>
                                </View>
                            )}
                        </View>
                    </AppCard>
                </>
            )}

            {/* Trend chart */}
            <Text style={styles.sectionLabel}>Tendencia semanal</Text>
            <ComplianceTrendChart stats={progressStats} maxWeeks={8} />

            {/* Wellness metrics */}
            <Text style={styles.sectionLabel}>Bienestar</Text>
            <MetricDetailCard records={exerciseRecords} />

            {/* Recent history */}
            {recentRecords.length > 0 && (
                <>
                    <Text style={styles.sectionLabel}>Historial reciente</Text>
                    {recentRecords.map((record) => {
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

            <View style={styles.bottomPadding} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc', paddingHorizontal: 16 },
    patientName: { fontFamily: 'Montserrat_600SemiBold', fontSize: 14, color: '#6b7280', marginBottom: 8, marginTop: 4 },
    sectionLabel: {
        fontFamily: 'Montserrat_600SemiBold',
        fontSize: 12,
        letterSpacing: 0.5,
        color: '#6b7280',
        textTransform: 'uppercase',
        marginTop: 16,
        marginBottom: 8,
        marginLeft: 4,
    },
    summaryCard: { marginBottom: 4 },
    summaryDateRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
    summaryDate: { fontFamily: 'Montserrat_400Regular', fontSize: 12, color: '#6b7280' },
    complianceCenter: { alignItems: 'center', marginBottom: 8 },
    compliancePercent: { fontFamily: 'Montserrat_700Bold', fontSize: 40, fontVariant: ['tabular-nums'] },
    complianceLabel: { fontFamily: 'Montserrat_400Regular', fontSize: 13, color: '#6b7280', marginTop: -2 },
    progressTrack: { height: 8, backgroundColor: '#e5e7eb', borderRadius: 4, overflow: 'hidden', marginBottom: 12 },
    progressFill: { height: '100%', borderRadius: 4 },
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
    statsRow: { flexDirection: 'row', justifyContent: 'center', gap: 16 },
    statChip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    statText: { fontFamily: 'Montserrat_500Medium', fontSize: 13, color: '#374151' },
    bottomPadding: { height: 32 },
});
