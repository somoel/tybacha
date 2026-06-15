import { AppCard } from '@/src/components/ui/AppCard';
import type { ApiExerciseRecord } from '@/src/types/apiTracking.types';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import React, { useMemo, useState } from 'react';
import { Dimensions, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { LineChart } from 'react-native-gifted-charts';

const SCREEN = Dimensions.get('window');

interface MetricDetailCardProps {
    records: ApiExerciseRecord[];
}

function avg(vals: number[]): number | null {
    return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
}

export function MetricDetailCard({ records }: MetricDetailCardProps) {
    const theme = useTheme();
    const [width, setWidth] = useState(SCREEN.width - 64);

    const now = useMemo(() => new Date(), []);

    // Build 30-day dataset
    const days = useMemo(() => {
        const result: { date: string; effort: number | null; pain: number | null; exercised: boolean }[] = [];
        for (let i = 29; i >= 0; i--) {
            const d = subDays(now, i);
            const key = format(d, 'yyyy-MM-dd');
            const dayRecords = records.filter((r) => r.fechaProgramada === key);
            const completed = dayRecords.filter((r) => r.estado === 'completado');
            result.push({
                date: key,
                exercised: dayRecords.length > 0,
                effort: avg(completed.map((r) => r.esfuerzoPercibido).filter((v): v is number => v != null)),
                pain: avg(completed.map((r) => r.dolorReportado).filter((v): v is number => v != null)),
            });
        }
        return result;
    }, [records, now]);

    // Global averages
    const completedRecords = useMemo(() => records.filter((r) => r.estado === 'completado'), [records]);
    const globalEffort = useMemo(() => avg(completedRecords.map((r) => r.esfuerzoPercibido).filter((v): v is number => v != null)), [completedRecords]);
    const globalPain = useMemo(() => avg(completedRecords.map((r) => r.dolorReportado).filter((v): v is number => v != null)), [completedRecords]);

    const hasAnyData = days.some((d) => d.exercised);
    const spacing = Math.max(6, Math.floor((width - 40) / 29));

    // Line data builders
    const buildEffortData = () =>
        days.map((d, i) => ({
            value: d.effort ?? 0,
            label: i % 7 === 0 || i === 29 ? format(new Date(d.date), 'dd MMM', { locale: es }) : '',
            hideDataPoint: !d.exercised,
            dataPointColor: '#7c3aed',
            dataPointRadius: d.exercised ? 4 : 0,
            showStrip: !d.exercised,
            stripColor: '#cbd5e1',
            stripWidth: spacing * 1.1,
            stripOpacity: 1,
        }));

    const buildPainData = () =>
        days.map((d, i) => ({
            value: d.pain ?? 0,
            label: i % 7 === 0 || i === 29 ? format(new Date(d.date), 'dd MMM', { locale: es }) : '',
            hideDataPoint: !d.exercised,
            dataPointColor: '#c62828',
            dataPointRadius: d.exercised ? 4 : 0,
            showStrip: !d.exercised,
            stripColor: '#cbd5e1',
            stripWidth: spacing * 1.1,
            stripOpacity: 1,
        }));

    const effortData = useMemo(buildEffortData, [days, spacing]);
    const painData = useMemo(buildPainData, [days, spacing]);

    const handleLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

    return (
        <AppCard style={styles.card}>
            <View onLayout={handleLayout}>
                <View style={styles.header}>
                    <View style={[styles.iconWrap, { backgroundColor: theme.colors.primaryContainer }]}>
                        <MaterialCommunityIcons name="heart-pulse" size={22} color={theme.colors.primary} />
                    </View>
                    <View style={styles.headerText}>
                        <Text style={styles.title}>Bienestar</Text>
                        <Text style={styles.subtitle}>
                            {format(subDays(now, 29), 'dd MMM', { locale: es })} – {format(now, 'dd MMM yyyy', { locale: es })}
                        </Text>
                    </View>
                </View>

                {hasAnyData ? (
                    <>
                        <LineChart
                            data={effortData}
                            data2={painData}
                            width={width - 16}
                            height={180}
                            maxValue={10}
                            noOfSections={5}
                            spacing={spacing}
                            initialSpacing={4}
                            endSpacing={4}
                            xAxisLabelTextStyle={styles.xAxis}
                            xAxisLabelsHeight={28}
                            rotateLabel
                            yAxisTextStyle={styles.yAxis}
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
                            endOpacity1={0}
                            startFillColor2="#c62828"
                            endFillColor2="#c62828"
                            startOpacity2={0.18}
                            endOpacity2={0}
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
                    </>
                ) : (
                    <View style={styles.empty}>
                        <MaterialCommunityIcons name="chart-line-variant" size={28} color="#d1d5db" />
                        <Text style={styles.emptyText}>Sin registros de ejercicios</Text>
                    </View>
                )}

                {(globalEffort != null || globalPain != null) && (
                    <View style={styles.footer}>
                        <View style={styles.avgRow}>
                            {globalEffort != null && (
                                <View style={styles.avgItem}>
                                    <View style={[styles.avgIcon, { backgroundColor: '#f3e8ff' }]}>
                                        <MaterialCommunityIcons name="arm-flex" size={16} color="#7c3aed" />
                                    </View>
                                    <View>
                                        <Text style={styles.avgLabel}>Esfuerzo promedio</Text>
                                        <Text style={[styles.avgValue, { color: '#7c3aed' }]}>{globalEffort.toFixed(1)}/10</Text>
                                    </View>
                                </View>
                            )}
                            {globalPain != null && (
                                <View style={styles.avgItem}>
                                    <View style={[styles.avgIcon, { backgroundColor: '#ffebee' }]}>
                                        <MaterialCommunityIcons name="heart-pulse" size={16} color="#c62828" />
                                    </View>
                                    <View>
                                        <Text style={styles.avgLabel}>Dolor promedio</Text>
                                        <Text style={[styles.avgValue, { color: '#c62828' }]}>{globalPain.toFixed(1)}/10</Text>
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
    iconWrap: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    headerText: { flex: 1 },
    title: { fontFamily: 'Montserrat_700Bold', fontSize: 16, color: '#1f2937' },
    subtitle: { fontFamily: 'Montserrat_400Regular', fontSize: 12, color: '#6b7280', marginTop: 2 },
    legend: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 8 },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    legendDot: { width: 10, height: 10, borderRadius: 5 },
    legendText: { fontFamily: 'Montserrat_500Medium', fontSize: 11, color: '#6b7280' },
    xAxis: { fontFamily: 'Montserrat_500Medium', fontSize: 9, color: '#9ca3af' },
    yAxis: { fontFamily: 'Montserrat_500Medium', fontSize: 10, color: '#9ca3af' },
    empty: { alignItems: 'center', paddingVertical: 24, gap: 8 },
    emptyText: { fontFamily: 'Montserrat_400Regular', fontSize: 13, color: '#9ca3af' },
    footer: { marginTop: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
    avgRow: { flexDirection: 'row', gap: 24 },
    avgItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    avgIcon: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
    avgLabel: { fontFamily: 'Montserrat_400Regular', fontSize: 11, color: '#6b7280' },
    avgValue: { fontFamily: 'Montserrat_700Bold', fontSize: 15 },
});
