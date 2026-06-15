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

function getPerformanceColor(pct: number): string {
    if (pct >= 80) return '#16a34a';
    if (pct >= 60) return '#65a30d';
    if (pct >= 40) return '#ca8a04';
    if (pct >= 20) return '#ea580c';
    return '#dc2626';
}

function getPerformanceLabel(pct: number): string {
    if (pct >= 80) return 'Excelente';
    if (pct >= 60) return 'Por encima del promedio';
    if (pct >= 40) return 'Promedio';
    if (pct >= 20) return 'Por debajo del promedio';
    return 'Bajo promedio';
}

function getBadgeBg(pct: number): string {
    if (pct >= 80) return '#dcfce7';
    if (pct >= 60) return '#ecfccb';
    if (pct >= 40) return '#fef9c3';
    if (pct >= 20) return '#ffedd5';
    return '#fee2e2';
}

function calcLegacy(value: number, r: { belowBelowAvg: number; excellent: number; higherIsBetter: boolean }): number {
    const { belowBelowAvg, excellent, higherIsBetter } = r;
    if (higherIsBetter) {
        const range = excellent - belowBelowAvg;
        return range <= 0 ? 50 : Math.max(0, Math.min(100, ((value - belowBelowAvg) / range) * 100));
    }
    const range = belowBelowAvg - excellent;
    return range <= 0 ? 50 : Math.max(0, Math.min(100, ((belowBelowAvg - value) / range) * 100));
}

function getNorm(testType: SharedSFTTestType, gender?: PatientGender, birthDate?: string): NormativeRange | null {
    if (!gender || !birthDate) return null;
    const ageBand = calculateAgeBand(birthDate);
    return ageBand ? getNormativeRange(testType, gender, ageBand) : null;
}

function Bar({
    value, unit, normRange, legacyRanges, previousValue, notes,
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

    const pct = normRange
        ? calculateNormativePercentage(value, normRange, higherIsBetter)
        : legacyRanges
            ? calcLegacy(value, legacyRanges)
            : 50;

    const color = getPerformanceColor(pct);
    const badge = getBadgeBg(pct);
    const label = getPerformanceLabel(pct);

    // Range: compute where P25 and P75 sit on the 0-100% scale
    let rangeStartPct: number;
    let rangeEndPct: number;
    if (normRange) {
        rangeStartPct = calculateNormativePercentage(normRange.low, normRange, higherIsBetter);
        rangeEndPct = calculateNormativePercentage(normRange.high, normRange, higherIsBetter);
        if (!higherIsBetter) { const tmp = rangeStartPct; rangeStartPct = rangeEndPct; rangeEndPct = tmp; }
    } else if (legacyRanges) {
        rangeStartPct = calcLegacy(legacyRanges.belowBelowAvg, legacyRanges);
        rangeEndPct = calcLegacy(legacyRanges.excellent, legacyRanges);
    } else {
        rangeStartPct = 25;
        rangeEndPct = 75;
    }

    const prevPct = previousValue != null
        ? normRange
            ? calculateNormativePercentage(previousValue, normRange, higherIsBetter)
            : legacyRanges
                ? calcLegacy(previousValue, legacyRanges)
                : 50
        : null;

    return (
        <View style={s.wrapper}>
            {/* value + badge */}
            <View style={s.head}>
                <Text style={s.val}>{value} {unit}</Text>
                <View style={[s.badge, { backgroundColor: badge }]}>
                    <Text style={[s.badgeTxt, { color }]}>{label}</Text>
                </View>
            </View>

            {/* bar */}
            <View style={s.track}>
                {prevPct != null && (
                    <View style={[s.prevFill, { width: `${prevPct}%`, backgroundColor: theme.colors.outlineVariant }]} />
                )}
                <View style={[s.rangeArea, { left: `${Math.min(rangeStartPct, rangeEndPct)}%`, right: `${100 - Math.max(rangeStartPct, rangeEndPct)}%` }]} />
                <View style={[s.currFill, { width: `${pct}%`, backgroundColor: color }]} />
            </View>

            {/* notes */}
            {notes ? (
                <View style={s.note}>
                    <MaterialCommunityIcons name="information-outline" size={12} color="#94a3b8" />
                    <Text style={s.noteTxt} numberOfLines={2}>{notes}</Text>
                </View>
            ) : null}
        </View>
    );
}

export function ResultChart({ results, previousResults, patientGender, patientBirthDate }: ResultChartProps) {
    return (
        <View style={root.container}>
            <Text style={root.title}>Resultados por prueba</Text>

            {previousResults && (
                <View style={root.legend}>
                    <View style={root.legItem}>
                        <View style={[root.legDot, { backgroundColor: '#e5e7eb' }]} />
                        <Text style={root.legTxt}>Anterior</Text>
                    </View>
                    <View style={root.legItem}>
                        <View style={[root.legDot, { backgroundColor: '#dbeafe' }]} />
                        <Text style={root.legTxt}>Rango normal</Text>
                    </View>
                    <View style={root.legItem}>
                        <View style={[root.legDot, { backgroundColor: '#16a34a' }]} />
                        <Text style={root.legTxt}>Actual</Text>
                    </View>
                </View>
            )}

            <View style={root.bars}>
                {SFT_TESTS.map((test) => {
                    const cur = results.find((r) => r.test_type === test.type);
                    if (!cur) return null;
                    const norm = getNorm(test.type as SharedSFTTestType, patientGender, patientBirthDate);
                    if (!norm && !test.normativeRanges) return null;
                    const prev = previousResults?.find((r) => r.test_type === test.type);
                    return (
                        <View key={test.type} style={root.section}>
                            <Text style={root.testName}>{test.shortName}</Text>
                            <Bar
                                value={cur.value}
                                unit={cur.unit}
                                normRange={norm}
                                legacyRanges={test.normativeRanges}
                                previousValue={prev?.value}
                                notes={cur.notes}
                            />
                        </View>
                    );
                })}
            </View>
        </View>
    );
}

const s = StyleSheet.create({
    wrapper: { gap: 6 },
    head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    val: { fontFamily: 'Montserrat_800ExtraBold', fontSize: 18, color: '#1f2937' },
    badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    badgeTxt: { fontFamily: 'Montserrat_600SemiBold', fontSize: 10 },
    track: { height: 24, backgroundColor: '#f1f5f9', borderRadius: 12, overflow: 'hidden', position: 'relative' },
    prevFill: { position: 'absolute', top: 0, left: 0, height: '100%', borderRadius: 12, opacity: 0.4 },
    rangeArea: { position: 'absolute', top: 0, height: '100%', backgroundColor: '#dbeafe', borderRadius: 12 },
    currFill: { position: 'absolute', top: 0, left: 0, height: '100%', borderRadius: 12 },
    note: { flexDirection: 'row', alignItems: 'flex-start', gap: 4, marginTop: 2 },
    noteTxt: { fontFamily: 'Montserrat_400Regular', fontSize: 10, color: '#94a3b8', fontStyle: 'italic', flex: 1 },
});

const root = StyleSheet.create({
    container: { padding: 16 },
    title: { fontFamily: 'Montserrat_700Bold', fontSize: 16, color: '#1f2937', marginBottom: 16 },
    legend: { flexDirection: 'row', gap: 16, marginBottom: 12 },
    legItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    legDot: { width: 10, height: 10, borderRadius: 5 },
    legTxt: { fontFamily: 'Montserrat_400Regular', fontSize: 12, color: '#374151' },
    bars: { gap: 18 },
    section: { gap: 6 },
    testName: { fontFamily: 'Montserrat_600SemiBold', fontSize: 13, color: '#1f2937' },
});
