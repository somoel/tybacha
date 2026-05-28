import { SFT_TESTS } from '@/src/constants/sftTests';
import type { NormativeRanges, SFTResult } from '@/src/types/battery.types';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

interface ResultChartProps {
    results: SFTResult[];
    previousResults?: SFTResult[];
}

function getPerformanceColor(percentage: number): string {
    if (percentage >= 80) return '#16a34a';
    if (percentage >= 60) return '#65a30d';
    if (percentage >= 40) return '#ca8a04';
    if (percentage >= 20) return '#ea580c';
    return '#dc2626';
}

function getPerformanceLabel(percentage: number): string {
    if (percentage >= 80) return 'Excelente';
    if (percentage >= 60) return 'Por encima del promedio';
    if (percentage >= 40) return 'Promedio';
    if (percentage >= 20) return 'Por debajo del promedio';
    return 'Bajo promedio';
}

function calculatePercentage(value: number, ranges: NormativeRanges): number {
    const { belowBelowAvg, excellent, higherIsBetter } = ranges;

    if (higherIsBetter) {
        const totalRange = excellent - belowBelowAvg;
        if (totalRange <= 0) return 50;
        return Math.max(0, Math.min(100, ((value - belowBelowAvg) / totalRange) * 100));
    }
    // Inverse: lower is better (e.g., Up-and-Go)
    const totalRange = belowBelowAvg - excellent;
    if (totalRange <= 0) return 50;
    return Math.max(0, Math.min(100, ((belowBelowAvg - value) / totalRange) * 100));
}

function NormalizedBar({
    value,
    unit,
    ranges,
    previousValue,
}: {
    value: number;
    unit: string;
    ranges: NormativeRanges;
    previousValue?: number;
}) {
    const theme = useTheme();
    const percentage = calculatePercentage(value, ranges);
    const color = getPerformanceColor(percentage);

    const avgPercentage = calculatePercentage(ranges.avg, ranges);
    const excellentPercentage = calculatePercentage(ranges.excellent, ranges);

    return (
        <View style={barStyles.row}>
            <View style={barStyles.barContainer}>
                <View style={barStyles.track}>
                    {previousValue !== undefined && (
                        <View
                            style={[
                                barStyles.previousFill,
                                {
                                    width: `${calculatePercentage(previousValue, ranges)}%`,
                                    backgroundColor: theme.colors.outlineVariant,
                                },
                            ]}
                        />
                    )}
                    <View
                        style={[
                            barStyles.currentFill,
                            {
                                width: `${percentage}%`,
                                backgroundColor: color,
                            },
                        ]}
                    />
                    <View
                        style={[
                            barStyles.referenceLine,
                            { left: `${avgPercentage}%`, backgroundColor: '#94a3b8' },
                        ]}
                    />
                    <View
                        style={[
                            barStyles.referenceLine,
                            { left: `${excellentPercentage}%`, backgroundColor: '#16a34a' },
                        ]}
                    />
                </View>
                <View style={barStyles.referenceLabels}>
                    <Text style={barStyles.referenceLabel}>Prom.</Text>
                    <Text style={barStyles.referenceLabel}>Excel.</Text>
                </View>
            </View>
            <View style={barStyles.valueContainer}>
                <Text style={[barStyles.valueText, { color }]}>
                    {value} {unit}
                </Text>
                <Text style={barStyles.percentText}>{Math.round(percentage)}%</Text>
            </View>
        </View>
    );
}

export function ResultChart({ results, previousResults }: ResultChartProps) {
    const theme = useTheme();

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Resultados por prueba</Text>
            <Text style={styles.subtitle}>Porcentaje según valores normativos (Rikli & Jones)</Text>

            {previousResults && (
                <View style={styles.legend}>
                    <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: theme.colors.outlineVariant }]} />
                        <Text style={styles.legendText}>Anterior</Text>
                    </View>
                    <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: theme.colors.primary }]} />
                        <Text style={styles.legendText}>Actual</Text>
                    </View>
                </View>
            )}

            <View style={styles.barsContainer}>
                {SFT_TESTS.map((test) => {
                    const current = results.find((r) => r.test_type === test.type);
                    const previous = previousResults?.find((r) => r.test_type === test.type);

                    if (!current || !test.normativeRanges) return null;

                    return (
                        <View key={test.type} style={styles.barSection}>
                            <Text style={styles.testName}>{test.shortName}</Text>
                            <NormalizedBar
                                value={current.value}
                                unit={current.unit}
                                ranges={test.normativeRanges}
                                previousValue={previous?.value}
                            />
                        </View>
                    );
                })}
            </View>

            <View style={styles.valuesGrid}>
                {SFT_TESTS.map((test) => {
                    const current = results.find((r) => r.test_type === test.type);
                    const percentage = current && test.normativeRanges
                        ? Math.round(calculatePercentage(current.value, test.normativeRanges))
                        : null;

                    return (
                        <View key={test.type} style={styles.valueItem}>
                            <Text style={styles.valueLabel}>{test.shortName}</Text>
                            <Text style={styles.valueText}>
                                {current ? `${current.value} ${current.unit}` : '—'}
                            </Text>
                            {percentage !== null && (
                                <Text
                                    style={[
                                        styles.valuePercentage,
                                        { color: getPerformanceColor(percentage) },
                                    ]}
                                >
                                    {getPerformanceLabel(percentage)}
                                </Text>
                            )}
                        </View>
                    );
                })}
            </View>
        </View>
    );
}

const barStyles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    barContainer: {
        flex: 1,
    },
    track: {
        height: 20,
        backgroundColor: '#f1f5f9',
        borderRadius: 10,
        overflow: 'hidden',
        position: 'relative',
    },
    previousFill: {
        position: 'absolute',
        top: 0,
        left: 0,
        height: '100%',
        borderRadius: 10,
        opacity: 0.5,
    },
    currentFill: {
        position: 'absolute',
        top: 0,
        left: 0,
        height: '100%',
        borderRadius: 10,
    },
    referenceLine: {
        position: 'absolute',
        top: 0,
        width: 2,
        height: '100%',
        opacity: 0.6,
    },
    referenceLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 2,
        paddingHorizontal: 2,
    },
    referenceLabel: {
        fontFamily: 'Montserrat_400Regular',
        fontSize: 8,
        color: '#94a3b8',
    },
    valueContainer: {
        alignItems: 'flex-end',
        minWidth: 70,
    },
    valueText: {
        fontFamily: 'Montserrat_600SemiBold',
        fontSize: 13,
    },
    percentText: {
        fontFamily: 'Montserrat_400Regular',
        fontSize: 10,
        color: '#94a3b8',
    },
});

const styles = StyleSheet.create({
    container: {
        padding: 16,
    },
    title: {
        fontFamily: 'Montserrat_700Bold',
        fontSize: 16,
        color: '#1f2937',
        marginBottom: 4,
    },
    subtitle: {
        fontFamily: 'Montserrat_400Regular',
        fontSize: 11,
        color: '#94a3b8',
        marginBottom: 12,
    },
    legend: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 12,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    legendDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    legendText: {
        fontFamily: 'Montserrat_400Regular',
        fontSize: 12,
        color: '#374151',
    },
    barsContainer: {
        gap: 14,
    },
    barSection: {
        gap: 4,
    },
    testName: {
        fontFamily: 'Montserrat_500Medium',
        fontSize: 12,
        color: '#374151',
    },
    valuesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 16,
    },
    valueItem: {
        backgroundColor: '#f0f3f6',
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 6,
        minWidth: '30%',
    },
    valueLabel: {
        fontFamily: 'Montserrat_500Medium',
        fontSize: 10,
        color: '#6b7280',
    },
    valueText: {
        fontFamily: 'Montserrat_600SemiBold',
        fontSize: 13,
        color: '#1f2937',
    },
    valuePercentage: {
        fontFamily: 'Montserrat_400Regular',
        fontSize: 10,
        marginTop: 2,
    },
});
