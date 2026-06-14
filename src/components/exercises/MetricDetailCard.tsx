import { AppCard } from '@/src/components/ui/AppCard';
import type { ApiExerciseRecord } from '@/src/types/apiTracking.types';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { BarChart, PieChart } from 'react-native-gifted-charts';

interface MetricDetailCardProps {
    records: ApiExerciseRecord[];
}

function getWeekKey(dateStr: string): string {
    const d = new Date(dateStr);
    const dayOfWeek = d.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(d);
    monday.setDate(d.getDate() + mondayOffset);
    return format(monday, 'yyyy-MM-dd');
}

export function MetricDetailCard({ records }: MetricDetailCardProps) {
    const theme = useTheme();

    const completedRecords = records.filter((r) => r.estado === 'completado');

    // Deduplicar por día con status dominante
    const completedDates = new Set<string>();
    const omittedDates = new Set<string>();
    records.forEach((r) => {
        if (r.estado === 'completado') {
            completedDates.add(r.fechaProgramada);
            omittedDates.delete(r.fechaProgramada);
        } else if (r.estado === 'omitido') {
            if (!completedDates.has(r.fechaProgramada)) {
                omittedDates.add(r.fechaProgramada);
            }
        }
    });

    const totalSessions = new Set([...completedDates, ...omittedDates]).size;
    const completedDays = completedDates.size;
    const omittedDays = omittedDates.size;

    // Datos para PieChart
    const pieData = [
        { value: completedDays, color: '#2e7d32', text: `${completedDays}` },
        { value: omittedDays, color: '#c62828', text: `${omittedDays}` },
    ].filter((d) => d.value > 0);

    // Datos para BarChart + LineChart (últimas 4 semanas)
    const now = new Date();
    const fourWeeksAgo = subDays(now, 28);

    const weekMap = new Map<string, { completed: number; omitted: number; effortSum: number; painSum: number; effortCount: number; painCount: number }>();

    // Inicializar las 4 semanas
    for (let i = 0; i < 4; i++) {
        const weekStart = subDays(now, (3 - i) * 7 + (now.getDay() === 0 ? 6 : now.getDay() - 1));
        const key = format(weekStart, 'yyyy-MM-dd');
        weekMap.set(key, { completed: 0, omitted: 0, effortSum: 0, painSum: 0, effortCount: 0, painCount: 0 });
    }

    // Agregar registros de las últimas 4 semanas
    records.forEach((r) => {
        const rDate = new Date(r.fechaProgramada);
        if (rDate < fourWeeksAgo) return;
        const weekKey = getWeekKey(r.fechaProgramada);
        const week = weekMap.get(weekKey);
        if (!week) return;

        if (r.estado === 'completado') {
            week.completed++;
            if (r.esfuerzoPercibido != null) {
                week.effortSum += r.esfuerzoPercibido;
                week.effortCount++;
            }
            if (r.dolorReportado != null) {
                week.painSum += r.dolorReportado;
                week.painCount++;
            }
        } else if (r.estado === 'omitido') {
            week.omitted++;
        }
    });

    // Ordenar semanas y construir datos
    const weekEntries = Array.from(weekMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    const barData = weekEntries.map(([, w], i) => ({
        value: w.completed + w.omitted,
        frontColor: '#2e7d32',
        label: format(new Date(weekEntries[i][0]), 'dd/MM'),
        spacing: 2,
        barWidth: 24,
    }));

    const effortLineData = weekEntries.map(([, w]) => ({
        value: w.effortCount > 0 ? w.effortSum / w.effortCount : 0,
        label: '',
        hideDataPoint: false,
        dataPointColor: '#7c3aed',
        dataPointRadius: 4,
    }));

    const painLineData = weekEntries.map(([, w]) => ({
        value: w.painCount > 0 ? w.painSum / w.painCount : 0,
        label: '',
        hideDataPoint: false,
        dataPointColor: '#c62828',
        dataPointRadius: 4,
    }));

    const hasBarData = barData.some((d) => d.value > 0);
    const hasLineData = effortLineData.some((d) => d.value > 0) || painLineData.some((d) => d.value > 0);

    // Promedios globales
    const effortValues = completedRecords
        .map((r) => r.esfuerzoPercibido)
        .filter((v): v is number => v != null);
    const painValues = completedRecords
        .map((r) => r.dolorReportado)
        .filter((v): v is number => v != null);

    const avgEffort = effortValues.length > 0
        ? effortValues.reduce((a, b) => a + b, 0) / effortValues.length
        : null;
    const avgPain = painValues.length > 0
        ? painValues.reduce((a, b) => a + b, 0) / painValues.length
        : null;

    return (
        <AppCard style={styles.card}>
            {/* Header mejorado */}
            <View style={styles.header}>
                <View style={[styles.headerIcon, { backgroundColor: theme.colors.primaryContainer }]}>
                    <MaterialCommunityIcons name="heart-pulse" size={22} color={theme.colors.primary} />
                </View>
                <View style={styles.headerText}>
                    <Text style={styles.title}>Bienestar</Text>
                    <Text style={styles.subtitle}>
                        {format(subDays(now, 28), 'dd MMM', { locale: es })} – {format(now, 'dd MMM yyyy', { locale: es })}
                    </Text>
                </View>
            </View>

            {/* Stats mejorados */}
            <View style={styles.statsRow}>
                <View style={styles.statItem}>
                    <View style={[styles.statIconContainer, { backgroundColor: theme.colors.primaryContainer }]}>
                        <MaterialCommunityIcons name="calendar-check" size={18} color={theme.colors.primary} />
                    </View>
                    <Text style={[styles.statValue, { color: theme.colors.primary }]}>{totalSessions}</Text>
                    <Text style={styles.statLabel}>Sesiones</Text>
                </View>

                <View style={styles.statDivider} />

                <View style={styles.statItem}>
                    <View style={[styles.statIconContainer, { backgroundColor: '#e8f5e9' }]}>
                        <MaterialCommunityIcons name="check-circle" size={18} color="#2e7d32" />
                    </View>
                    <Text style={[styles.statValue, { color: '#2e7d32' }]}>{completedDays}</Text>
                    <Text style={styles.statLabel}>Completados</Text>
                </View>

                <View style={styles.statDivider} />

                <View style={styles.statItem}>
                    <View style={[styles.statIconContainer, { backgroundColor: '#ffebee' }]}>
                        <MaterialCommunityIcons name="close-circle" size={18} color="#c62828" />
                    </View>
                    <Text style={[styles.statValue, { color: '#c62828' }]}>{omittedDays}</Text>
                    <Text style={styles.statLabel}>Omitidos</Text>
                </View>
            </View>

            {/* PieChart: Proporción */}
            {pieData.length > 0 && (
                <View style={styles.chartSection}>
                    <Text style={styles.sectionTitle}>Proporción de días</Text>
                    <View style={styles.pieRow}>
                        <PieChart
                            data={pieData}
                            radius={50}
                            innerRadius={28}
                            donut
                            showText={false}
                            centerLabelComponent={() => (
                                <View style={styles.pieCenter}>
                                    <Text style={styles.pieCenterValue}>{totalSessions}</Text>
                                    <Text style={styles.pieCenterLabel}>días</Text>
                                </View>
                            )}
                        />
                        <View style={styles.pieLegend}>
                            <View style={styles.legendItem}>
                                <View style={[styles.legendDot, { backgroundColor: '#2e7d32' }]} />
                                <Text style={styles.legendText}>Completados ({completedDays})</Text>
                            </View>
                            <View style={styles.legendItem}>
                                <View style={[styles.legendDot, { backgroundColor: '#c62828' }]} />
                                <Text style={styles.legendText}>Omitidos ({omittedDays})</Text>
                            </View>
                        </View>
                    </View>
                </View>
            )}

            {/* BarChart + LineChart: Tendencia semanal */}
            {hasBarData && (
                <View style={styles.chartSection}>
                    <Text style={styles.sectionTitle}>Tendencia semanal</Text>
                    <BarChart
                        data={barData}
                        height={120}
                        maxValue={Math.max(...barData.map((d) => d.value), 5)}
                        noOfSections={4}
                        barWidth={24}
                        spacing={24}
                        xAxisLength={200}
                        xAxisLabelTextStyle={styles.xAxisLabel}
                        hideYAxisText
                        hideRules
                        showXAxisIndices={false}
                        xAxisThickness={1}
                        xAxisColor="#e5e7eb"
                        yAxisThickness={0}
                        roundedTop
                        isAnimated
                        animationDuration={600}
                    />
                    <View style={styles.barLegend}>
                        <View style={styles.legendItem}>
                            <View style={[styles.legendDot, { backgroundColor: '#2e7d32' }]} />
                            <Text style={styles.legendText}>Completados</Text>
                        </View>
                        <View style={styles.legendItem}>
                            <View style={[styles.legendDot, { backgroundColor: '#c62828' }]} />
                            <Text style={styles.legendText}>Omitidos</Text>
                        </View>
                    </View>
                </View>
            )}

            {/* LineChart: Esfuerzo y Dolor */}
            {hasLineData && (
                <View style={styles.chartSection}>
                    <Text style={styles.sectionTitle}>Esfuerzo y dolor</Text>
                    <BarChart
                        data={barData}
                        height={100}
                        maxValue={Math.max(...barData.map((d) => d.value), 5)}
                        noOfSections={4}
                        barWidth={20}
                        spacing={24}
                        xAxisLength={200}
                        xAxisLabelTextStyle={styles.xAxisLabel}
                        hideYAxisText
                        hideRules
                        showXAxisIndices={false}
                        xAxisThickness={1}
                        xAxisColor="#e5e7eb"
                        yAxisThickness={0}
                        showLine
                        lineData={effortLineData}
                        lineConfig={{
                            color: '#7c3aed',
                            thickness: 2,
                            curved: true,
                            hideDataPoints: false,
                            dataPointsColor: '#7c3aed',
                            dataPointsRadius: 4,
                        }}
                        roundedTop
                        isAnimated
                        animationDuration={600}
                    />
                    <View style={styles.lineLegend}>
                        <View style={styles.legendItem}>
                            <View style={[styles.legendLine, { backgroundColor: '#7c3aed' }]} />
                            <Text style={styles.legendText}>Esfuerzo promedio</Text>
                        </View>
                        {painLineData.some((d) => d.value > 0) && (
                            <View style={styles.legendItem}>
                                <View style={[styles.legendLine, { backgroundColor: '#c62828' }]} />
                                <Text style={styles.legendText}>Dolor promedio</Text>
                            </View>
                        )}
                    </View>
                </View>
            )}

            {/* Promedios globales */}
            {(avgEffort != null || avgPain != null) && (
                <View style={styles.averagesContainer}>
                    <Text style={styles.sectionTitle}>Promedios globales</Text>
                    <View style={styles.averagesRow}>
                        {avgEffort != null && (
                            <View style={styles.averageItem}>
                                <View style={[styles.averageIcon, { backgroundColor: '#f3e8ff' }]}>
                                    <MaterialCommunityIcons name="arm-flex" size={16} color="#7c3aed" />
                                </View>
                                <View>
                                    <Text style={styles.averageLabel}>Esfuerzo</Text>
                                    <Text style={[styles.averageValue, { color: '#7c3aed' }]}>
                                        {avgEffort.toFixed(1)}/10
                                    </Text>
                                </View>
                            </View>
                        )}
                        {avgPain != null && (
                            <View style={styles.averageItem}>
                                <View style={[styles.averageIcon, { backgroundColor: '#ffebee' }]}>
                                    <MaterialCommunityIcons name="heart-pulse" size={16} color="#c62828" />
                                </View>
                                <View>
                                    <Text style={styles.averageLabel}>Dolor</Text>
                                    <Text style={[styles.averageValue, { color: '#c62828' }]}>
                                        {avgPain.toFixed(1)}/10
                                    </Text>
                                </View>
                            </View>
                        )}
                    </View>
                </View>
            )}
        </AppCard>
    );
}

const styles = StyleSheet.create({
    card: { marginBottom: 16 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 20,
    },
    headerIcon: {
        width: 44,
        height: 44,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerText: { flex: 1 },
    title: { fontFamily: 'Montserrat_700Bold', fontSize: 16, color: '#1f2937' },
    subtitle: { fontFamily: 'Montserrat_400Regular', fontSize: 12, color: '#6b7280', marginTop: 2 },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        marginBottom: 20,
        backgroundColor: '#f8fafc',
        borderRadius: 12,
        paddingVertical: 16,
        paddingHorizontal: 8,
    },
    statItem: { alignItems: 'center', flex: 1 },
    statDivider: {
        width: 1,
        height: 36,
        backgroundColor: '#e5e7eb',
    },
    statIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 6,
    },
    statValue: { fontFamily: 'Montserrat_800ExtraBold', fontSize: 20 },
    statLabel: { fontFamily: 'Montserrat_400Regular', fontSize: 11, color: '#6b7280', marginTop: 2 },
    chartSection: {
        marginBottom: 20,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    sectionTitle: {
        fontFamily: 'Montserrat_600SemiBold',
        fontSize: 13,
        color: '#374151',
        marginBottom: 12,
    },
    pieRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 20,
    },
    pieCenter: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    pieCenterValue: {
        fontFamily: 'Montserrat_800ExtraBold',
        fontSize: 18,
        color: '#1f2937',
    },
    pieCenterLabel: {
        fontFamily: 'Montserrat_400Regular',
        fontSize: 10,
        color: '#6b7280',
    },
    pieLegend: { gap: 8 },
    barLegend: {
        flexDirection: 'row',
        gap: 16,
        marginTop: 12,
    },
    lineLegend: {
        flexDirection: 'row',
        gap: 16,
        marginTop: 12,
    },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    legendDot: { width: 10, height: 10, borderRadius: 5 },
    legendLine: { width: 16, height: 3, borderRadius: 2 },
    legendText: { fontFamily: 'Montserrat_400Regular', fontSize: 11, color: '#6b7280' },
    xAxisLabel: {
        fontFamily: 'Montserrat_500Medium',
        fontSize: 9,
        color: '#9ca3af',
    },
    averagesContainer: {
        marginTop: 4,
    },
    averagesRow: {
        flexDirection: 'row',
        gap: 20,
    },
    averageItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    averageIcon: {
        width: 32,
        height: 32,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    averageLabel: {
        fontFamily: 'Montserrat_400Regular',
        fontSize: 12,
        color: '#6b7280',
    },
    averageValue: {
        fontFamily: 'Montserrat_700Bold',
        fontSize: 16,
    },
});
