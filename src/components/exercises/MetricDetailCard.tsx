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
const CARD_HORIZONTAL_PADDING = 16 * 2;
const CARD_CONTENT_PADDING = 16 * 2;

interface MetricDetailCardProps {
    records: ApiExerciseRecord[];
}

function getWeekMonday(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
    d.setHours(0, 0, 0, 0);
    return d;
}

function getWeekKey(dateStr: string): string {
    return format(getWeekMonday(new Date(dateStr)), 'yyyy-MM-dd');
}

function getWeekLabel(dateStr: string): string {
    return format(getWeekMonday(new Date(dateStr)), 'dd MMM', { locale: es });
}

export function MetricDetailCard({ records }: MetricDetailCardProps) {
    const theme = useTheme();
    const [containerWidth, setContainerWidth] = useState(SCREEN_WIDTH - CARD_HORIZONTAL_PADDING - CARD_CONTENT_PADDING);

    const completedRecords = records.filter((r) => r.estado === 'completado');

    const now = new Date();
    const fourWeeksAgo = subDays(now, 28);

    const weekMap = new Map<string, { effortSum: number; painSum: number; effortCount: number; painCount: number }>();
    for (let i = 0; i < 4; i++) {
        const weekStart = subDays(now, (3 - i) * 7 + (now.getDay() === 0 ? 6 : now.getDay() - 1));
        weekMap.set(format(weekStart, 'yyyy-MM-dd'), { effortSum: 0, painSum: 0, effortCount: 0, painCount: 0 });
    }

    records.forEach((r) => {
        if (new Date(r.fechaProgramada) < fourWeeksAgo) return;
        const week = weekMap.get(getWeekKey(r.fechaProgramada));
        if (!week || r.estado !== 'completado') return;
        if (r.esfuerzoPercibido != null) { week.effortSum += r.esfuerzoPercibido; week.effortCount++; }
        if (r.dolorReportado != null) { week.painSum += r.dolorReportado; week.painCount++; }
    });

    const weekEntries = Array.from(weekMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    const numPoints = weekEntries.length;

    const effortLineData = weekEntries.map(([key, w]) => {
        const val = w.effortCount > 0 ? w.effortSum / w.effortCount : 0;
        return { value: val, label: getWeekLabel(key), dataPointText: val > 0 ? val.toFixed(1) : '' };
    });

    const painLineData = weekEntries.map(([key, w]) => {
        const val = w.painCount > 0 ? w.painSum / w.painCount : 0;
        return { value: val, label: getWeekLabel(key), dataPointText: val > 0 ? val.toFixed(1) : '' };
    });

    const hasLineData = effortLineData.some((d) => d.value > 0) || painLineData.some((d) => d.value > 0);

    const effortValues = completedRecords.map((r) => r.esfuerzoPercibido).filter((v): v is number => v != null);
    const painValues = completedRecords.map((r) => r.dolorReportado).filter((v): v is number => v != null);
    const avgEffort = effortValues.length > 0 ? effortValues.reduce((a, b) => a + b, 0) / effortValues.length : null;
    const avgPain = painValues.length > 0 ? painValues.reduce((a, b) => a + b, 0) / painValues.length : null;

    const spacing = numPoints > 1 ? Math.floor((containerWidth - 32) / (numPoints - 1)) : containerWidth;

    const handleLayout = (e: LayoutChangeEvent) => {
        setContainerWidth(e.nativeEvent.layout.width);
    };

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
                            {format(subDays(now, 28), 'dd MMM', { locale: es })} – {format(now, 'dd MMM yyyy', { locale: es })}
                        </Text>
                    </View>
                </View>

                {hasLineData ? (
                    <View style={styles.chartWrap}>
                        <LineChart
                            data={effortLineData}
                            data2={painLineData}
                            width={containerWidth - 16}
                            height={180}
                            maxValue={10}
                            noOfSections={5}
                            spacing={spacing}
                            initialSpacing={8}
                            endSpacing={8}
                            xAxisLabelTextStyle={styles.xAxisLabel}
                            xAxisLabelsHeight={28}
                            rotateLabel
                            hideYAxisText
                            yAxisThickness={0}
                            xAxisThickness={1}
                            xAxisColor="#e5e7eb"
                            rulesType="dashed"
                            rulesColor="#f1f5f9"
                            rulesThickness={1}
                            color1="#7c3aed"
                            color2="#c62828"
                            thickness1={3}
                            thickness2={3}
                            dataPointsRadius1={6}
                            dataPointsColor1="#7c3aed"
                            dataPointsRadius2={6}
                            dataPointsColor2="#c62828"
                            textColor1="#7c3aed"
                            textColor2="#c62828"
                            textFontSize1={11}
                            textFontSize2={11}
                            showValuesAsDataPointsText
                            curved
                            curvature={0.3}
                            areaChart
                            areaChart1
                            areaChart2
                            startFillColor1="#7c3aed"
                            endFillColor1="#7c3aed"
                            startOpacity1={0.25}
                            endOpacity1={0.0}
                            startFillColor2="#c62828"
                            endFillColor2="#c62828"
                            startOpacity2={0.25}
                            endOpacity2={0.0}
                            isAnimated
                            animationDuration={800}
                        />
                        <View style={styles.legend}>
                            <View style={styles.legendItem}>
                                <View style={[styles.legendLine, { backgroundColor: '#7c3aed' }]} />
                                <Text style={styles.legendText}>Esfuerzo</Text>
                            </View>
                            <View style={styles.legendItem}>
                                <View style={[styles.legendLine, { backgroundColor: '#c62828' }]} />
                                <Text style={styles.legendText}>Dolor</Text>
                            </View>
                        </View>
                    </View>
                ) : (
                    <View style={styles.emptyState}>
                        <MaterialCommunityIcons name="chart-line-variant" size={28} color="#d1d5db" />
                        <Text style={styles.emptyText}>Sin datos de esfuerzo o dolor</Text>
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
    legend: { flexDirection: 'row', justifyContent: 'center', gap: 20, marginTop: 8 },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    legendLine: { width: 18, height: 3, borderRadius: 2 },
    legendText: { fontFamily: 'Montserrat_500Medium', fontSize: 11, color: '#6b7280' },
    xAxisLabel: { fontFamily: 'Montserrat_500Medium', fontSize: 9, color: '#9ca3af' },
    averages: { marginTop: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
    averagesRow: { flexDirection: 'row', gap: 24 },
    averageItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    averageIcon: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
    averageLabel: { fontFamily: 'Montserrat_400Regular', fontSize: 11, color: '#6b7280' },
    averageValue: { fontFamily: 'Montserrat_700Bold', fontSize: 15 },
});
