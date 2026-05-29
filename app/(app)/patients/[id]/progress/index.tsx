import { ComplianceTrendChart } from '@/src/components/exercises/ComplianceTrendChart';
import { ExerciseHistoryItem } from '@/src/components/exercises/ExerciseHistoryItem';
import { MetricDetailCard } from '@/src/components/exercises/MetricDetailCard';
import { AppCard } from '@/src/components/ui/AppCard';
import { AppLoader } from '@/src/components/ui/AppLoader';
import { fetchApiExerciseRecords, fetchApiProgressStats } from '@/src/api/trackingApi';
import { fetchExercisePlans } from '@/src/services/exercisePlanService';
import { fetchPatientById } from '@/src/services/patientService';
import type { ExercisePlan } from '@/src/types/exercise.types';
import type { Patient } from '@/src/types/patient.types';
import type { ApiExerciseRecord, ApiProgressStats } from '@/src/types/apiTracking.types';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { IconButton, Text, useTheme } from 'react-native-paper';

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

export default function ProgressScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const theme = useTheme();
    const router = useRouter();

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

                const active = plans.find((pl) => pl.status === 'active');
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

    if (isLoading) return <AppLoader message="Cargando progreso..." />;
    if (!patient) return <AppLoader message="Adulto mayor no encontrado" />;

    const weekRange = getWeekRange();
    const currentWeekStats = progressStats.find(
        (s) => s.fecha_inicio === weekRange.from && s.fecha_fin === weekRange.to
    );

    const recentRecords = exerciseRecords
        .filter((r) => r.estado === 'completado' || r.estado === 'omitido')
        .slice(0, 10);

    const firstName = patient.first_name ?? 'Adulto mayor';

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            <View style={styles.headerRow}>
                <IconButton
                    icon="arrow-left"
                    mode="contained-tonal"
                    size={20}
                    onPress={() => router.back()}
                    accessibilityLabel="Volver"
                />
                <View style={styles.headerText}>
                    <Text style={styles.screenTitle}>Progreso de ejercicios</Text>
                    <Text style={styles.screenSubtitle}>{firstName}</Text>
                </View>
            </View>

            {/* Current week summary */}
            {currentWeekStats ? (
                <AppCard style={styles.summaryCard}>
                    <View style={styles.summaryHeader}>
                        <MaterialCommunityIcons name="calendar-week" size={20} color={theme.colors.primary} />
                        <Text style={styles.summaryTitle}>Esta semana</Text>
                    </View>
                    <Text style={styles.summaryDate}>
                        {format(new Date(weekRange.from), 'dd MMM', { locale: es })} - {format(new Date(weekRange.to), 'dd MMM yyyy', { locale: es })}
                    </Text>

                    <View style={styles.summaryStats}>
                        <View style={styles.summaryStatItem}>
                            <Text style={[styles.summaryStatValue, { color: theme.colors.primary }]}>
                                {Math.round(currentWeekStats.porcentaje_cumplimiento)}%
                            </Text>
                            <Text style={styles.summaryStatLabel}>Cumplimiento</Text>
                        </View>
                        <View style={styles.summaryStatDivider} />
                        <View style={styles.summaryStatItem}>
                            <Text style={[styles.summaryStatValue, { color: '#2e7d32' }]}>
                                {currentWeekStats.ejercicios_completados}
                            </Text>
                            <Text style={styles.summaryStatLabel}>Completados</Text>
                        </View>
                        <View style={styles.summaryStatDivider} />
                        <View style={styles.summaryStatItem}>
                            <Text style={[styles.summaryStatValue, { color: '#c62828' }]}>
                                {currentWeekStats.ejercicios_omitidos}
                            </Text>
                            <Text style={styles.summaryStatLabel}>Omitidos</Text>
                        </View>
                        <View style={styles.summaryStatDivider} />
                        <View style={styles.summaryStatItem}>
                            <Text style={styles.summaryStatValue}>
                                {currentWeekStats.ejercicios_programados}
                            </Text>
                            <Text style={styles.summaryStatLabel}>Programados</Text>
                        </View>
                    </View>
                </AppCard>
            ) : (
                <AppCard style={styles.summaryCard}>
                    <View style={styles.summaryHeader}>
                        <MaterialCommunityIcons name="calendar-week" size={20} color="#94a3b8" />
                        <Text style={[styles.summaryTitle, { color: '#6b7280' }]}>Sin datos esta semana</Text>
                    </View>
                    <Text style={styles.emptyText}>
                        Aún no hay registros de ejercicios para esta semana.
                    </Text>
                </AppCard>
            )}

            {/* Trend chart */}
            <ComplianceTrendChart stats={progressStats} maxWeeks={8} />

            {/* Wellness metrics */}
            <MetricDetailCard records={exerciseRecords} />

            {/* Recent history */}
            {recentRecords.length > 0 && (
                <>
                    <Text style={styles.sectionTitle}>Historial reciente</Text>
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
                                status={record.estado === 'completado' ? 'completed' : 'skipped'}
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
    container: { flex: 1, backgroundColor: '#f8fafc', paddingHorizontal: 16, paddingTop: 16 },
    headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    headerText: { flex: 1, marginLeft: 4 },
    screenTitle: { fontFamily: 'Montserrat_700Bold', fontSize: 20, color: '#1f2937' },
    screenSubtitle: { fontFamily: 'Montserrat_400Regular', fontSize: 14, color: '#6b7280' },
    summaryCard: { marginBottom: 16 },
    summaryHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
    summaryTitle: { fontFamily: 'Montserrat_700Bold', fontSize: 16, color: '#1f2937' },
    summaryDate: { fontFamily: 'Montserrat_400Regular', fontSize: 12, color: '#6b7280', marginBottom: 16 },
    summaryStats: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
    summaryStatItem: { alignItems: 'center', flex: 1 },
    summaryStatValue: { fontFamily: 'Montserrat_800ExtraBold', fontSize: 22 },
    summaryStatLabel: { fontFamily: 'Montserrat_400Regular', fontSize: 11, color: '#6b7280', marginTop: 2 },
    summaryStatDivider: { width: 1, height: 32, backgroundColor: '#e5e7eb' },
    sectionTitle: { fontFamily: 'Montserrat_700Bold', fontSize: 16, color: '#1f2937', marginTop: 8, marginBottom: 10 },
    emptyText: { fontFamily: 'Montserrat_400Regular', fontSize: 14, color: '#6b7280', paddingVertical: 8 },
    bottomPadding: { height: 32 },
});
