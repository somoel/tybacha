import { PlanOverviewSection } from '@/src/components/exercises/PlanOverviewSection';
import { ComplianceTrendChart } from '@/src/components/exercises/ComplianceTrendChart';
import { ExerciseHistoryItem } from '@/src/components/exercises/ExerciseHistoryItem';
import { MetricDetailCard } from '@/src/components/exercises/MetricDetailCard';
import { MonthlyCalendar, type DayState } from '@/src/components/exercises/MonthlyCalendar';
import { AppCard } from '@/src/components/ui/AppCard';
import { ProgressSkeleton } from '@/src/components/ui/PatientDetailSkeletons';
import { fetchApiExerciseRecords, fetchApiProgressStats } from '@/src/api/trackingApi';
import { fetchExercisePlans } from '@/src/services/exercisePlanService';
import { fetchPatientById } from '@/src/services/patientService';
import type { ExercisePlan } from '@/src/types/exercise.types';
import type { ApiExerciseRecord, ApiProgressStats } from '@/src/types/apiTracking.types';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
    addDays,
    endOfMonth,
    endOfWeek,
    format,
    isSameDay,
    isSameMonth,
    startOfDay,
    startOfMonth,
    startOfWeek,
    subDays,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

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

function normalizeDayKey(value: string): string {
    return value
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();
}

function getWeekRangeForDate(date: Date): { from: string; to: string } {
    const monday = startOfWeek(date, { weekStartsOn: 1 });
    const sunday = endOfWeek(date, { weekStartsOn: 1 });
    return {
        from: format(monday, 'yyyy-MM-dd'),
        to: format(sunday, 'yyyy-MM-dd'),
    };
}

function getTodayDateKey(): string {
    return format(new Date(), 'yyyy-MM-dd');
}

function computeDayStates(
    month: Date,
    activePlan: ExercisePlan | null,
    exerciseRecords: ApiExerciseRecord[],
): Record<string, DayState> {
    const states: Record<string, DayState> = {};
    if (!activePlan) return states;

    const today = startOfDay(new Date());
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);

    const normalizedFrequencies = new Set(
        activePlan.exercises.map((ex) => normalizeDayKey(ex.frequency)),
    );

    const dayKeyToWeekday: Record<string, number> = {
        domingo: 0,
        lunes: 1,
        martes: 2,
        miercoles: 3,
        jueves: 4,
        viernes: 5,
        sabado: 6,
    };

    for (let d = new Date(monthStart); d <= monthEnd; d = addDays(d, 1)) {
        const dayKey = format(d, 'yyyy-MM-dd');
        const weekday = d.getDay();
        const weekdayName = Object.entries(dayKeyToWeekday).find(([, v]) => v === weekday)?.[0];
        const hasExerciseProgrammed = weekdayName
            ? normalizedFrequencies.has(weekdayName)
            : false;

        if (!hasExerciseProgrammed) {
            states[dayKey] = 'no-exercise';
            continue;
        }

        if (d > today) {
            states[dayKey] = 'future';
            continue;
        }

        const dayRecords = exerciseRecords.filter(
            (r) => r.fechaProgramada === dayKey && r.estado !== 'pendiente',
        );

        if (dayRecords.length === 0) {
            states[dayKey] = isSameDay(d, today) ? 'pending' : 'empty';
            continue;
        }

        const hasCompleted = dayRecords.some((r) => r.estado === 'completado');
        states[dayKey] = hasCompleted ? 'completed' : 'omitted';
    }

    return states;
}

function computeWeekStatsFromRecords(
    from: string,
    to: string,
    exerciseRecords: ApiExerciseRecord[],
    activePlan: ExercisePlan | null,
): { programmed: number; completed: number; omitted: number; compliance: number } | null {
    if (!activePlan) return null;

    const fromDate = new Date(from + 'T00:00:00');
    const toDate = new Date(to + 'T00:00:00');

    const dayKeyToWeekday: Record<string, number> = {
        domingo: 0,
        lunes: 1,
        martes: 2,
        miercoles: 3,
        jueves: 4,
        viernes: 5,
        sabado: 6,
    };

    let programmed = 0;
    const cursor = new Date(fromDate);
    while (cursor <= toDate) {
        const weekday = cursor.getDay();
        const weekdayName = Object.entries(dayKeyToWeekday).find(([, v]) => v === weekday)?.[0];
        if (weekdayName) {
            const dayExercises = activePlan.exercises.filter(
                (ex) => normalizeDayKey(ex.frequency) === weekdayName,
            );
            programmed += dayExercises.length;
        }
        cursor.setDate(cursor.getDate() + 1);
    }

    const weekRecords = exerciseRecords.filter(
        (r) => r.fechaProgramada >= from && r.fechaProgramada <= to,
    );
    const completed = weekRecords.filter((r) => r.estado === 'completado').length;
    const omitted = weekRecords.filter((r) => r.estado === 'omitido').length;
    const compliance = programmed > 0 ? Math.round((completed / programmed) * 100) : 0;

    return { programmed, completed, omitted, compliance };
}

export default function ProgressScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const theme = useTheme();

    const [activePlan, setActivePlan] = useState<ExercisePlan | null>(null);
    const [progressStats, setProgressStats] = useState<ApiProgressStats[]>([]);
    const [exerciseRecords, setExerciseRecords] = useState<ApiExerciseRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [calendarMonth, setCalendarMonth] = useState<Date>(startOfMonth(new Date()));
    const [selectedDate, setSelectedDate] = useState<string | null>(null);

    useFocusEffect(useCallback(() => {
        let isActive = true;
        const load = async () => {
            if (!id) return;
            setIsLoading(true);
            try {
                const [, plans] = await Promise.all([
                    fetchPatientById(id),
                    fetchExercisePlans(id),
                ]);
                if (!isActive) return;

                const active = plans[0] ?? null;
                setActivePlan(active ?? null);

                try {
                    const [stats, records] = await Promise.all([
                        fetchApiProgressStats(Number(id)),
                        fetchApiExerciseRecords(
                            Number(id),
                            format(subDays(new Date(), 180), 'yyyy-MM-dd'),
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

    const todayDateKey = getTodayDateKey();
    const weekRange = selectedDate
        ? getWeekRangeForDate(new Date(selectedDate + 'T00:00:00'))
        : getWeekRange();
    const currentWeekRange = getWeekRange();

    // Day states for monthly calendar (hook must run unconditionally)
    const dayStates = useMemo(
        () => computeDayStates(calendarMonth, activePlan, exerciseRecords),
        [calendarMonth, activePlan, exerciseRecords],
    );

    // Weekly stats computed from records as fallback (hook must run unconditionally)
    const computedWeekStats = useMemo(
        () => computeWeekStatsFromRecords(weekRange.from, weekRange.to, exerciseRecords, activePlan),
        [weekRange.from, weekRange.to, exerciseRecords, activePlan],
    );

    // Recent records (hook must run unconditionally)
    const recentRecords = useMemo(() => {
        const filtered = exerciseRecords.filter(
            (r) => r.estado === 'completado' || r.estado === 'omitido' || r.estado === 'parcial',
        );
        if (selectedDate) {
            return filtered.filter((r) => r.fechaProgramada === selectedDate);
        }
        return filtered.slice(0, 10);
    }, [exerciseRecords, selectedDate]);

    if (isLoading) return <ProgressSkeleton />;

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

    // Weekly compliance (from backend stats or calculate from records if not available)
    const weeklyCompliance = currentWeekStats
        ? Math.round(currentWeekStats.porcentaje_cumplimiento)
        : (computedWeekStats?.compliance ?? 0);
    const weeklyCompleted = currentWeekStats?.ejercicios_completados ?? computedWeekStats?.completed ?? 0;
    const weeklyOmitted = currentWeekStats?.ejercicios_omitidos ?? computedWeekStats?.omitted ?? 0;

    const isShowingCurrentWeek = !selectedDate || weekRange.from === currentWeekRange.from;

    return (
        <ScrollView style={styles.container} contentInsetAdjustmentBehavior="automatic" showsVerticalScrollIndicator={false}>
            <Stack.Screen options={{ title: 'Plan de ejercicios' }} />

            {/* Sección 1: Plan activo */}
            <PlanOverviewSection
                patientId={id!}
                plan={activePlan}
                exerciseRecords={exerciseRecords}
            />

            {/* Sección 2: Progreso */}
            <Text style={styles.sectionLabel}>Progreso</Text>

            {/* Esta semana / Semana seleccionada */}
            <AppCard style={styles.summaryCard}>
                <View style={styles.summaryDateRow}>
                    <MaterialCommunityIcons name="calendar-week" size={16} color={theme.colors.primary} />
                    <Text style={styles.summaryDate}>
                        {isShowingCurrentWeek ? 'Esta semana · ' : 'Semana del '}
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

                {/* Monthly calendar (replaces LMXJV strip) */}
                <MonthlyCalendar
                    month={calendarMonth}
                    onMonthChange={setCalendarMonth}
                    dayStates={dayStates}
                    selectedDate={selectedDate}
                    onSelectDate={setSelectedDate}
                    todayKey={todayDateKey}
                    hasTodayButton={!isSameMonth(calendarMonth, new Date()) || selectedDate !== null}
                    onTodayPress={() => {
                        setCalendarMonth(startOfMonth(new Date()));
                        setSelectedDate(null);
                    }}
                />

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
            {(recentRecords.length > 0 || selectedDate) && (
                <>
                    <Text style={styles.sectionLabel}>Historial reciente</Text>
                    {selectedDate && (
                        <View style={styles.filterChipRow}>
                            <MaterialCommunityIcons name="filter" size={14} color={theme.colors.primary} />
                            <Text style={styles.filterChipText}>
                                {format(new Date(selectedDate + 'T00:00:00'), "EEEE dd 'de' MMMM", { locale: es })}
                            </Text>
                            <Pressable onPress={() => setSelectedDate(null)} hitSlop={8}>
                                <Text style={[styles.filterChipText, styles.filterChipClear]}>Ver todo</Text>
                            </Pressable>
                        </View>
                    )}
                    {recentRecords.length === 0 && selectedDate ? (
                        <Text style={styles.emptyHistoryText}>
                            Sin registros para este día
                        </Text>
                    ) : (
                        recentRecords.map((record) => {
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
                        })
                    )}
                </>
            )}

            <View style={styles.bottomPadding} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc', paddingHorizontal: 16 },
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
    statsRow: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 8 },
    statChip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    statText: { fontFamily: 'Montserrat_500Medium', fontSize: 13, color: '#374151' },
    filterChipRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8, paddingHorizontal: 4 },
    filterChipText: { fontFamily: 'Montserrat_400Regular', fontSize: 12, color: '#6b7280', textTransform: 'capitalize' },
    filterChipClear: { fontFamily: 'Montserrat_600SemiBold', color: '#2563eb' },
    emptyHistoryText: { fontFamily: 'Montserrat_400Regular', fontSize: 13, color: '#9ca3af', textAlign: 'center', paddingVertical: 16 },
    bottomPadding: { height: 32 },
});
