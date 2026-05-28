import { AppCard } from '@/src/components/ui/AppCard';
import type { ApiProgressStats } from '@/src/types/apiTracking.types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

interface ComplianceTrendChartProps {
    stats: ApiProgressStats[];
    maxWeeks?: number;
}

function getComplianceColor(percent: number): string {
    if (percent >= 80) return '#2e7d32';
    if (percent >= 50) return '#ca8a04';
    return '#c62828';
}

export function ComplianceTrendChart({ stats, maxWeeks = 8 }: ComplianceTrendChartProps) {
    const sortedStats = [...stats]
        .sort((a, b) => new Date(b.fecha_inicio).getTime() - new Date(a.fecha_inicio).getTime())
        .slice(0, maxWeeks)
        .reverse();

    if (sortedStats.length === 0) {
        return (
            <AppCard style={styles.card}>
                <Text style={styles.title}>Tendencia de cumplimiento</Text>
                <Text style={styles.emptyText}>Sin datos de semanas anteriores</Text>
            </AppCard>
        );
    }

    const maxCompliance = Math.max(...sortedStats.map((s) => s.porcentaje_cumplimiento), 100);

    return (
        <AppCard style={styles.card}>
            <Text style={styles.title}>Tendencia de cumplimiento</Text>
            <Text style={styles.subtitle}>Últimas {sortedStats.length} semanas</Text>

            <View style={styles.chart}>
                {sortedStats.map((stat, index) => {
                    const barWidth = (stat.porcentaje_cumplimiento / maxCompliance) * 100;
                    const color = getComplianceColor(stat.porcentaje_cumplimiento);
                    const weekStart = format(new Date(stat.fecha_inicio), 'dd MMM', { locale: es });

                    return (
                        <View key={stat.id_estadistica_progreso} style={styles.barRow}>
                            <Text style={styles.weekLabel}>{weekStart}</Text>
                            <View style={styles.barTrack}>
                                <View
                                    style={[
                                        styles.barFill,
                                        { width: `${barWidth}%`, backgroundColor: color },
                                    ]}
                                />
                            </View>
                            <Text style={[styles.percentLabel, { color }]}>
                                {Math.round(stat.porcentaje_cumplimiento)}%
                            </Text>
                        </View>
                    );
                })}
            </View>

            <View style={styles.legend}>
                <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#2e7d32' }]} />
                    <Text style={styles.legendText}>{"\u2265"}80%</Text>
                </View>
                <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#ca8a04' }]} />
                    <Text style={styles.legendText}>50-79%</Text>
                </View>
                <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#c62828' }]} />
                    <Text style={styles.legendText}>{"<"}50%</Text>
                </View>
            </View>
        </AppCard>
    );
}

const styles = StyleSheet.create({
    card: { marginBottom: 16 },
    title: { fontFamily: 'Montserrat_700Bold', fontSize: 16, color: '#1f2937', marginBottom: 4 },
    subtitle: { fontFamily: 'Montserrat_400Regular', fontSize: 12, color: '#6b7280', marginBottom: 16 },
    emptyText: { fontFamily: 'Montserrat_400Regular', fontSize: 14, color: '#6b7280', textAlign: 'center', paddingVertical: 16 },
    chart: { gap: 8 },
    barRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    weekLabel: { fontFamily: 'Montserrat_500Medium', fontSize: 11, color: '#6b7280', width: 50, textAlign: 'right' },
    barTrack: {
        flex: 1,
        height: 20,
        backgroundColor: '#f1f5f9',
        borderRadius: 10,
        overflow: 'hidden',
    },
    barFill: { height: 20, borderRadius: 10 },
    percentLabel: { fontFamily: 'Montserrat_700Bold', fontSize: 12, width: 40 },
    legend: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 12 },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    legendDot: { width: 8, height: 8, borderRadius: 4 },
    legendText: { fontFamily: 'Montserrat_400Regular', fontSize: 11, color: '#6b7280' },
});
