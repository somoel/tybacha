import { AppCard } from '@/src/components/ui/AppCard';
import type { ApiExerciseRecord } from '@/src/types/apiTracking.types';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import React, { useMemo } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { Svg, Rect, Line as SvgLine, Circle, Text as SvgText, Path } from 'react-native-svg';
import { Text, useTheme } from 'react-native-paper';

const SCREEN = Dimensions.get('window');
const CHART_H = 160;
const PAD_TOP = 20;
const PAD_BOTTOM = 30;
const PAD_LEFT = 30;
const PAD_RIGHT = 10;
const INNER_H = CHART_H - PAD_TOP - PAD_BOTTOM;
const INNER_W = SCREEN.width - 64 - PAD_LEFT - PAD_RIGHT;

interface MetricDetailCardProps {
    records: ApiExerciseRecord[];
}

function avg(vals: number[]): number | null {
    return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
}

function buildPath(points: { x: number; y: number }[]): string {
    if (points.length === 0) return '';
    const [first, ...rest] = points;
    let d = `M ${first.x} ${first.y}`;
    for (const p of rest) {
        d += ` L ${p.x} ${p.y}`;
    }
    return d;
}

export function MetricDetailCard({ records }: MetricDetailCardProps) {
    const theme = useTheme();
    const now = useMemo(() => new Date(), []);

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

    const completedRecords = useMemo(() => records.filter((r) => r.estado === 'completado'), [records]);
    const globalEffort = useMemo(() => avg(completedRecords.map((r) => r.esfuerzoPercibido).filter((v): v is number => v != null)), [completedRecords]);
    const globalPain = useMemo(() => avg(completedRecords.map((r) => r.dolorReportado).filter((v): v is number => v != null)), [completedRecords]);

    const hasAnyData = days.some((d) => d.exercised);

    const dayWidth = INNER_W / 29;
    const effortPoints = days.map((d, i) => ({
        x: PAD_LEFT + i * dayWidth + dayWidth / 2,
        y: d.effort !== null ? PAD_TOP + INNER_H - (d.effort / 10) * INNER_H : null,
        value: d.effort,
    }));
    const painPoints = days.map((d, i) => ({
        x: PAD_LEFT + i * dayWidth + dayWidth / 2,
        y: d.pain !== null ? PAD_TOP + INNER_H - (d.pain / 10) * INNER_H : null,
        value: d.pain,
    }));

    const effortPath = buildPath(effortPoints.filter((p) => p.y !== null).map((p) => ({ x: p.x, y: p.y! })));
    const painPath = buildPath(painPoints.filter((p) => p.y !== null).map((p) => ({ x: p.x, y: p.y! })));

    const effortDots = effortPoints.filter((p) => p.y !== null);
    const painDots = painPoints.filter((p) => p.y !== null);

    return (
        <AppCard style={styles.card}>
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
                    <Svg width={SCREEN.width - 64} height={CHART_H}>
                        {/* Gray strips for days without exercise */}
                        {days.map((d, i) => {
                            if (d.exercised) return null;
                            return (
                                <Rect
                                    key={`strip-${i}`}
                                    x={PAD_LEFT + i * dayWidth}
                                    y={PAD_TOP}
                                    width={dayWidth}
                                    height={INNER_H}
                                    fill="#cbd5e1"
                                    opacity={0.8}
                                />
                            );
                        })}

                        {/* Horizontal grid lines */}
                        {[0, 2, 4, 6, 8, 10].map((v) => {
                            const y = PAD_TOP + INNER_H - (v / 10) * INNER_H;
                            return (
                                <React.Fragment key={`grid-${v}`}>
                                    <SvgLine
                                        x1={PAD_LEFT}
                                        y1={y}
                                        x2={PAD_LEFT + INNER_W}
                                        y2={y}
                                        stroke="#e5e7eb"
                                        strokeWidth={1}
                                        strokeDasharray="4 4"
                                    />
                                    <SvgText
                                        x={PAD_LEFT - 6}
                                        y={y + 4}
                                        fontSize={10}
                                        fill="#9ca3af"
                                        textAnchor="end"
                                        fontFamily="Montserrat_500Medium"
                                    >
                                        {v}
                                    </SvgText>
                                </React.Fragment>
                            );
                        })}

                        {/* X axis labels (every 7 days) */}
                        {days.map((d, i) => {
                            if (i % 7 !== 0 && i !== 29) return null;
                            return (
                                <SvgText
                                    key={`xlabel-${i}`}
                                    x={PAD_LEFT + i * dayWidth + dayWidth / 2}
                                    y={CHART_H - 4}
                                    fontSize={9}
                                    fill="#9ca3af"
                                    textAnchor="middle"
                                    fontFamily="Montserrat_500Medium"
                                >
                                    {format(new Date(d.date), 'dd MMM', { locale: es })}
                                </SvgText>
                            );
                        })}

                        {/* Effort line */}
                        {effortPath ? (
                            <Path d={effortPath} stroke="#7c3aed" strokeWidth={2} fill="none" />
                        ) : null}

                        {/* Pain line */}
                        {painPath ? (
                            <Path d={painPath} stroke="#c62828" strokeWidth={2} fill="none" />
                        ) : null}

                        {/* Effort dots */}
                        {effortDots.map((p, i) => (
                            <Circle
                                key={`edot-${i}`}
                                cx={p.x}
                                cy={p.y!}
                                r={4}
                                fill="#7c3aed"
                            />
                        ))}

                        {/* Pain dots */}
                        {painDots.map((p, i) => (
                            <Circle
                                key={`pdot-${i}`}
                                cx={p.x}
                                cy={p.y!}
                                r={4}
                                fill="#c62828"
                            />
                        ))}
                    </Svg>
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
    empty: { alignItems: 'center', paddingVertical: 24, gap: 8 },
    emptyText: { fontFamily: 'Montserrat_400Regular', fontSize: 13, color: '#9ca3af' },
    footer: { marginTop: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
    avgRow: { flexDirection: 'row', gap: 24 },
    avgItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    avgIcon: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
    avgLabel: { fontFamily: 'Montserrat_400Regular', fontSize: 11, color: '#6b7280' },
    avgValue: { fontFamily: 'Montserrat_700Bold', fontSize: 15 },
});
