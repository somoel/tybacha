import { SFT_TESTS } from '@/src/constants/sftTests';
import type { SFTResult } from '@/src/types/battery.types';
import { calculateAgeBand, calculateNormativePercentage, getNormativeRange } from '@shared/constants/normativeRanges';
import type { NormativeRange, PatientGender, SFTTestType as SharedSFTTestType } from '@shared/constants/normativeRanges';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

interface ResultChartProps {
    results: SFTResult[];
    previousResults?: SFTResult[];
    patientGender?: PatientGender;
    patientBirthDate?: string;
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

function getPerformanceBadgeColor(percentage: number): string {
    if (percentage >= 80) return '#dcfce7';
    if (percentage >= 60) return '#ecfccb';
    if (percentage >= 40) return '#fef9c3';
    if (percentage >= 20) return '#ffedd5';
    return '#fee2e2';
}

function calculateLegacyPercentage(value: number, ranges: { belowBelowAvg: number; excellent: number; higherIsBetter: boolean }): number {
    const { belowBelowAvg, excellent, higherIsBetter } = ranges;

    if (higherIsBetter) {
        const totalRange = excellent - belowBelowAvg;
        if (totalRange <= 0) return 50;
        return Math.max(0, Math.min(100, ((value - belowBelowAvg) / totalRange) * 100));
    }
    const totalRange = belowBelowAvg - excellent;
    if (totalRange <= 0) return 50;
    return Math.max(0, Math.min(100, ((belowBelowAvg - value) / totalRange) * 100));
}

function getNormForTest(
    testType: SharedSFTTestType,
    gender?: PatientGender,
    birthDate?: string,
): NormativeRange | null {
    if (!gender || !birthDate) return null;
    const ageBand = calculateAgeBand(birthDate);
    if (!ageBand) return null;
    return getNormativeRange(testType, gender, ageBand);
}

function NormalizedBar({
    value,
    unit,
    normRange,
    legacyRanges,
    previousValue,
    notes,
}: {
    value: number;
    unit: string;
    normRange: NormativeRange | null;
    legacyRanges?: { belowBelowAvg: number; excellent: number; higherIsBetter: boolean };
    previousValue?: number;
    notes?: string | null;
}) {
    const theme = useTheme();
    const higherIsBetter = legacyRanges?.higherIsBetter ?? true;

    let percentage: number;
    if (normRange) {
        percentage = calculateNormativePercentage(value, normRange, higherIsBetter);
    } else if (legacyRanges) {
        percentage = calculateLegacyPercentage(value, legacyRanges);
    } else {
        percentage = 50;
    }

    const color = getPerformanceColor(percentage);
    const badgeBg = getPerformanceBadgeColor(percentage);
    const label = getPerformanceLabel(percentage);

    // P25-P75 range as percentage of bar width
    let avgPercentage: number;
    let excellentPercentage: number;
    if (normRange) {
        const avgVal = (normRange.low + normRange.high) / 2;
        avgPercentage = calculateNormativePercentage(avgVal, normRange, higherIsBetter);
        excellentPercentage = higherIsBetter ? 85 : 15;
    } else if (legacyRanges) {
        avgPercentage = calculateLegacyPercentage(legacyRanges.belowBelowAvg + (legacyRanges.excellent - legacyRanges.belowBelowAvg) * 0.5, legacyRanges);
        excellentPercentage = calculateLegacyPercentage(legacyRanges.excellent, legacyRanges);
    } else {
        avgPercentage = 50;
        excellentPercentage = 80;
    }

    const rangeLeft = Math.min(avgPercentage, excellentPercentage);
    const rangeRight = 100 - Math.max(avgPercentage, excellentPercentage);

    return (
        <View style={barStyles.wrapper}>
            {/* Header: valor + badge */}
            <View style={barStyles.headerRow}>
                <Text style={barStyles.valueText}>{value} {unit}</Text>
                <View style={barStyles.headerRight}>
                    <View style={[barStyles.badge, { backgroundColor: badgeBg }]}>
                        <Text style={[barStyles.badgeText, { color }]}>{label}</Text>
                    </View>
                </View>
            </View>

            {/* Barra full-width con área de rango */}
            <View style={barStyles.track}>
                {previousValue !== undefined && (
                    <View
                        style={[
                            barStyles.previousFill,
                            {
                                width: `${normRange
                                    ? calculateNormativePercentage(previousValue, normRange, higherIsBetter)
                                    : legacyRanges
                                        ? calculateLegacyPercentage(previousValue, legacyRanges)
                                        : 50}%`,
                                backgroundColor: theme.colors.outlineVariant,
                            },
                        ]}
                    />
                )}

                {/* Rango promedio P25-P75 como área sombreada */}
                <View
                    style={[
                        barStyles.rangeArea,
                        { left: `${rangeLeft}%`, right: `${rangeRight}%` },
                    ]}
                />

                {/* Valor actual del paciente */}
                <View
                    style={[
                        barStyles.currentFill,
                        {
                            width: `${percentage}%`,
                            backgroundColor: color,
                        },
                    ]}
                />
            </View>

            {/* Observaciones full-width */}
            {notes ? (
                <View style={barStyles.notesRow}>
                    <MaterialCommunityIcons name="information-outline" size={12} color="#94a3b8" />
                    <Text style={barStyles.notesText} numberOfLines={2}>{notes}</Text>
                </View>
            ) : null}
        </View>
    );
}

export function ResultChart({ results, previousResults, patientGender, patientBirthDate }: ResultChartProps) {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>Resultados por prueba</Text>

            {previousResults && (
                <View style={styles.legend}>
                    <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: '#e5e7eb' }]} />
                        <Text style={styles.legendText}>Anterior</Text>
                    </View>
                    <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: '#94a3b8', opacity: 0.4 }]} />
                        <Text style={styles.legendText}>Rango normal</Text>
                    </View>
                    <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: '#16a34a' }]} />
                        <Text style={styles.legendText}>Actual</Text>
                    </View>
                </View>
            )}

            <View style={styles.barsContainer}>
                {SFT_TESTS.map((test) => {
                    const current = results.find((r) => r.test_type === test.type);
                    const previous = previousResults?.find((r) => r.test_type === test.type);

                    if (!current) return null;

                    const normRange = getNormForTest(test.type as SharedSFTTestType, patientGender, patientBirthDate);
                    const hasRanges = normRange || test.normativeRanges;

                    if (!hasRanges) return null;

                    return (
                        <View key={test.type} style={styles.barSection}>
                            <Text style={styles.testName}>{test.shortName}</Text>
                            <NormalizedBar
                                value={current.value}
                                unit={current.unit}
                                normRange={normRange}
                                legacyRanges={test.normativeRanges}
                                previousValue={previous?.value}
                                notes={current.notes}
                            />
                        </View>
                    );
                })}
            </View>
        </View>
    );
}

const barStyles = StyleSheet.create({
    wrapper: { gap: 6 },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    valueText: {
        fontFamily: 'Montserrat_800ExtraBold',
        fontSize: 18,
    },
    badge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    badgeText: {
        fontFamily: 'Montserrat_600SemiBold',
        fontSize: 10,
    },
    track: {
        height: 24,
        backgroundColor: '#f1f5f9',
        borderRadius: 12,
        overflow: 'hidden',
        position: 'relative',
    },
    previousFill: {
        position: 'absolute',
        top: 0,
        left: 0,
        height: '100%',
        borderRadius: 12,
        opacity: 0.4,
    },
    rangeArea: {
        position: 'absolute',
        top: 0,
        height: '100%',
        backgroundColor: '#94a3b8',
        opacity: 0.3,
    },
    currentFill: {
        position: 'absolute',
        top: 0,
        left: 0,
        height: '100%',
        borderRadius: 12,
    },
    notesRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 4,
        marginTop: 2,
    },
    notesText: {
        fontFamily: 'Montserrat_400Regular',
        fontSize: 10,
        color: '#94a3b8',
        fontStyle: 'italic',
        flex: 1,
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
        marginBottom: 16,
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
        gap: 18,
    },
    barSection: {
        gap: 6,
    },
    testName: {
        fontFamily: 'Montserrat_600SemiBold',
        fontSize: 13,
        color: '#1f2937',
    },
});
