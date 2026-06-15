import { AppCard } from '@/src/components/ui/AppCard';
import type { ApiExerciseRecord } from '@/src/types/apiTracking.types';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import React, { useState } from 'react';
import { Dimensions, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { LineChart } from 'react-native-gifted-charts';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_H_PADDING = 16 * 2;
const CARD_C_PADDING = 16 * 2;

interface MetricDetailCardProps {
    records: ApiExerciseRecord[];
}

export function MetricDetailCard({ records }: MetricDetailCardProps) {
    const theme = useTheme();
    const [containerWidth, setContainerWidth] = useState(SCREEN_WIDTH - CARD_H_PADDING - CARD_C_PADDING);

    const now = new Date();

    const days: { date: string; effort: number | null; pain: number | null; hasExercise: boolean }[] = [];
    for (let i = 29; i >= 0; i--) {
        const d = subDays(now, i);
        const key = format(d, 'yyyy-MM-dd');
        const allDayRecords = records.filter((r) => r.fechaProgramada === key);
        const completedDayRecords = allDayRecords.filter((r) => r.estado === 'completado');
        const effortVals = completedDayRecords.map((r) => r.esfuerzoPercibido).filter((v): v is number => v != null);
        const painVals = completedDayRecords.map((r) => r.dolorReportado).filter((v): v is number => v != null);
        days.push({
            date: key,
            hasExercise: allDayRecords.length > 0,
            effort: effortVals.length > 0 ? effortVals.reduce((a, b) => a + b, 0) / effortVals.length : null,
            pain: painVals.length > 0 ? painVals.reduce((a, b) => a + b, 0) / painVals.length : null,
        });
    }

    const spacing = days.length > 1 ? Math.floor((containerWidth - 40) / (days.length - 1)) : containerWidth;

    const effortLineData = days.map((d, i) => ({
        value: d.effort ?? 0,
        label: i % 7 === 0 || i === days.length - 1 ? format(new Date(d.date), 'dd MMM', { locale: es }) : '',
        hideDataPoint: !d.hasExercise,
        dataPointColor: '#7c3aed',
        dataPointRadius: d.hasExercise ? 4 : 0,
        showStrip: !d.hasExercise,
        stripColor: '#cbd5e1',
        stripWidth: spacing * 1.1,
        stripOpacity: 1,
    }));

    const painLineData = days.map((d, i) => ({
        value: d.pain ?? 0,
        label: i % 7 === 0 || i === days.length - 1 ? format(new Date(d.date), 'dd MMM', { locale: es }) : '',
        hideDataPoint: !d.hasExercise,
        dataPointColor: '#c62828',
        dataPointRadius: d.hasExercise ? 4 : 0,
        showStrip: !d.hasExercise,
        stripColor: '#cbd5e1',
        stripWidth: spacing * 1.1,
        stripOpacity: 1,
    }));

    const hasData = days.some((d) => d.effort !== null || d.pain !== null);

    const completedRecords = records.filter((r) => r.estado === 'completado');
    const effortValues = completedRecords.map((r) => r.esfuerzoPercibido).filter((v): v is number => v != null);
    const painValues = completedRecords.map((r) => r.dolorReportado).filter((v): v is number => v != null);
    const avgEffort = effortValues.length > 0 ? effortValues.reduce((a, b) => a + b, 0) / effortValues.length : null;
    const avgPain = painValues.length > 0 ? painValues.reduce((a, b) => a + b, 0) / painValues.length : null;

    const handleLayout = (e: LayoutChangeEvent) => setContainerWidth(e.nativeEvent.layout.width);

    return (
        <AppCard style={styles.card}>
            <View onLayout={handleLayout}>
                <View style={styles.header}>
                    <View style={[styles.headerIcon, { backgroundColor: theme.colors.primaryContainer }]}>
                        <MaterialCommunityIcons name="heart-pulse" size={22} color={theme.colors.primary} />
                    </View>
                    <View style={styles.headerText}>
                        <Text style={styles.title}>Bienestar</Text>
                        <Text style={styles.subtitle}>
                            {format(subDays(now, 29), 'dd MMM', { locale: es })} – {format(now, 'dd MMM yyyy', { locale: es })}
                        </Text>
                    </View>
                </View>

                {hasData ? (
                    <View style={styles.chartWrap}>
                        <LineChart
                            data={effortLineData}
                            data2={painLineData}
                            width={containerWidth - 16}
                            height={180}
                            maxValue={10}
                            noOfSections={5}
                            spacing={spacing}
                            initialSpacing={4}
                            endSpacing={4}
                            xAxisLabelTextStyle={styles.xAxisLabel}
                            xAxisLabelsHeight={28}
                            rotateLabel
                            yAxisTextStyle={styles.yAxisLabel}
                            yAxisLabelWidth={28}
                            yAxisThickness={0}
                            xAxisThickness={1}
                            xAxisColor="#e5e7eb"
                            rulesType="dashed"
                            rulesColor="#e5e7eb"
                            rulesThickness={1}
                            color1="#7c3aed"
                            color2="#c62828"
                            thickness1={2}
                            thickness2={2}
                            dataPointsRadius1={4}
                            dataPointsColor1="#7c3aed"
                            dataPointsRadius2={4}
                            dataPointsColor2="#c62828"
                            curved
                            curvature={0.2}
                            areaChart
                            areaChart1
                            areaChart2
                            startFillColor1="#7c3aed"
                            endFillColor1="#7c3aed"
                            startOpacity1={0.18}
                            endOpacity1={0.0}
                            startFillColor2="#c62828"
                            endFillColor2="#c62828"
                            startOpacity2={0.18}
                            endOpacity2={0.0}
                            isAnimated
                            animationDuration={800}
                        />
                        <View style={styles.legend}>
                            <View style={styles.legendItem}>
                                <View style={[styles.legendDot, { backgroundColor: '#7c3aed' }]} />
                                <Text style={styles.legendText}>Esfuerzo</Text>
                            </View>
                            <View style={styles.legendItem}>
                                <View style={[styles.legendDot, { backgroundColor: '#c62828' }]} />
                                <Text style={styles.legendText}>Dolor</Text>
                            </View>
                            <View style={styles.legendItem}>
                                <View style={[styles.legendDot, { backgroundColor: '#cbd5e1' }]} />
                                <Text style={styles.legendText}>Sin ejercicio</Text>
                            </View>
                        </View>
                    </View>
                ) : (
                    <View style={styles.emptyState}>
                        <MaterialCommunityIcons name="chart-line-variant" size={28} color="#d1d5db" />
                        <Text style={styles.emptyText}>Sin registros de ejercicios</Text>
                    </View>
                )}

                {(avgEffort != null || avgPain != null) && (
                    <View style={styles.averages}>
                        <View style={styles.averagesRow}>
                            {avgEffort != null && (
                                <View style={styles.averageItem}>
                                    <View style={[styles.averageIcon, { backgroundColor: '#f3e8ff' }]}>
                                        <MaterialCommunityIcons name="arm-flex" size={16} color="#7c3aed" />
                                    </View>
                                    <View>
                                        <Text style={styles.averageLabel}>Esfuerzo promedio</Text>
                                        <Text style={[styles.averageValue, { color: '#7c3aed' }]}>{avgEffort.toFixed(1)}/10</Text>
                                    </View>
                                </View>
                            )}
                            {avgPain != null && (
                                <View style={styles.averageItem}>
                                    <View style={[styles.averageIcon, { backgroundColor: '#ffebee' }]}>
                                        <MaterialCommunityIcons name="heart-pulse" size={16} color="#c62828" />
                                    </View>
                                    <View>
                                        <Text style={styles.averageLabel}>Dolor promedio</Text>
                                        <Text style={[styles.averageValue, { color: '#c62828' }]}>{avgPain.toFixed(1)}/10</Text>
                                    </View>
                                </View>
                            )}
                        </View>
                    </View>
                )}
            </View>
        </AppCard>
    );
}

const styles = StyleSheet.create({
    card: { marginBottom: 16 },
    header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
    headerIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    headerText: { flex: 1 },
    title: { fontFamily: 'Montserrat_700Bold', fontSize: 16, color: '#1f2937' },
    subtitle: { fontFamily: 'Montserrat_400Regular', fontSize: 12, color: '#6b7280', marginTop: 2 },
    chartWrap: { marginBottom: 12 },
    emptyState: { alignItems: 'center', paddingVertical: 24, gap: 8 },
    emptyText: { fontFamily: 'Montserrat_400Regular', fontSize: 13, color: '#9ca3af' },
    legend: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 8 },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    legendDot: { width: 10, height: 10, borderRadius: 5 },
    legendText: { fontFamily: 'Montserrat_500Medium', fontSize: 11, color: '#6b7280' },
    xAxisLabel: { fontFamily: 'Montserrat_500Medium', fontSize: 9, color: '#9ca3af' },
    yAxisLabel: { fontFamily: 'Montserrat_500Medium', fontSize: 10, color: '#9ca3af' },
    averages: { marginTop: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
    averagesRow: { flexDirection: 'row', gap: 24 },
    averageItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    averageIcon: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
    averageLabel: { fontFamily: 'Montserrat_400Regular', fontSize: 11, color: '#6b7280' },
    averageValue: { fontFamily: 'Montserrat_700Bold', fontSize: 15 },
});
