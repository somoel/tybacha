import { SFT_TESTS } from '@/src/constants/sftTests';
import type { SFTResult } from '@/src/types/battery.types';
import React from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import { Text, useTheme } from 'react-native-paper';

interface ResultChartProps {
    results: SFTResult[];
    previousResults?: SFTResult[];
}

/**
 * Bar chart comparing SFT test results,
 * optionally showing before/after comparison.
 */
export function ResultChart({ results, previousResults }: ResultChartProps) {
    const theme = useTheme();
    const screenWidth = Dimensions.get('window').width - 64;

    const chartData = SFT_TESTS.map((test) => {
        const current = results.find((r) => r.test_type === test.type);
        const previous = previousResults?.find((r) => r.test_type === test.type);

        const items: Array<{
            value: number;
            label: string;
            frontColor: string;
            spacing?: number;
        }> = [];

        if (previous) {
            items.push({
                value: Math.abs(previous.value),
                label: test.shortName.substring(0, 6),
                frontColor: theme.colors.outlineVariant,
                spacing: 2,
            });
        }

        items.push({
            value: Math.abs(current?.value ?? 0),
            label: previous ? '' : test.shortName.substring(0, 6),
            frontColor: theme.colors.primary,
            spacing: previous ? 16 : 24,
        });

        return items;
    }).flat();

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Resultados por prueba</Text>
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
            <BarChart
                data={chartData}
                barWidth={previousResults ? 14 : 24}
                width={screenWidth}
                height={200}
                barBorderRadius={6}
                noOfSections={5}
                yAxisThickness={1}
                xAxisThickness={1}
                yAxisColor={theme.colors.outlineVariant}
                xAxisColor={theme.colors.outlineVariant}
                yAxisTextStyle={styles.axisText}
                xAxisLabelTextStyle={styles.axisLabel}
                isAnimated
                animationDuration={500}
            />
            <View style={styles.valuesGrid}>
                {SFT_TESTS.map((test) => {
                    const current = results.find((r) => r.test_type === test.type);
                    return (
                        <View key={test.type} style={styles.valueItem}>
                            <Text style={styles.valueLabel}>{test.shortName}</Text>
                            <Text style={styles.valueText}>
                                {current ? `${current.value} ${current.unit}` : '—'}
                            </Text>
                        </View>
                    );
                })}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 16,
    },
    title: {
        fontFamily: 'Montserrat_700Bold',
        fontSize: 16,
        color: '#1f2937',
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
    axisText: {
        fontFamily: 'Montserrat_400Regular',
        fontSize: 10,
        color: '#94a3b8',
    },
    axisLabel: {
        fontFamily: 'Montserrat_400Regular',
        fontSize: 9,
        color: '#374151',
        width: 50,
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
});
