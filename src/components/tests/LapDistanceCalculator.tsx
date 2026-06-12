import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { IconButton, Text, useTheme } from 'react-native-paper';

interface LapDistanceCalculatorProps {
    lapLengthMeters: number;
    onValueChange: (totalMeters: number) => void;
}

/**
 * Lap counter for the 6-Minute Walk Test.
 * The evaluator taps +1 each time the participant completes a lap.
 * Distance is displayed as read-only text (laps × lapLengthMeters).
 */
export function LapDistanceCalculator({
    lapLengthMeters,
    onValueChange,
}: LapDistanceCalculatorProps) {
    const theme = useTheme();
    const [laps, setLaps] = useState(0);

    const totalMeters = laps * lapLengthMeters;

    const handleIncrement = () => {
        const next = laps + 1;
        setLaps(next);
        onValueChange(next * lapLengthMeters);
    };

    const handleDecrement = () => {
        if (laps <= 0) return;
        const next = laps - 1;
        setLaps(next);
        onValueChange(next * lapLengthMeters);
    };

    return (
        <View style={styles.container} accessibilityRole="adjustable">
            <Text style={styles.label}>Vueltas</Text>
            <View style={styles.counterRow}>
                <IconButton
                    icon="minus"
                    mode="contained"
                    size={28}
                    containerColor={theme.colors.surfaceVariant}
                    iconColor={theme.colors.onSurfaceVariant}
                    onPress={handleDecrement}
                    accessibilityLabel="Disminuir vuelta"
                    disabled={laps <= 0}
                    style={styles.counterButton}
                />
                <View style={styles.valueContainer}>
                    <Text style={[styles.value, { color: theme.colors.primary }]}>
                        {laps}
                    </Text>
                </View>
                <IconButton
                    icon="plus"
                    mode="contained"
                    size={28}
                    containerColor={theme.colors.primary}
                    iconColor={theme.colors.onPrimary}
                    onPress={handleIncrement}
                    accessibilityLabel="Agregar vuelta"
                    style={styles.counterButton}
                />
            </View>

            <View style={styles.distanceContainer}>
                <Text style={styles.distanceLabel}>Distancia recorrida</Text>
                <Text style={[styles.distanceValue, { color: theme.colors.primary }]}>
                    {totalMeters.toFixed(2)} m
                </Text>
                <Text style={styles.distanceDetail}>
                    ({laps} × {lapLengthMeters} m)
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        paddingVertical: 12,
    },
    label: {
        fontFamily: 'Montserrat_600SemiBold',
        fontSize: 14,
        color: '#374151',
        marginBottom: 8,
        textAlign: 'center',
    },
    counterRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    counterButton: {
        width: 56,
        height: 56,
        borderRadius: 16,
    },
    valueContainer: {
        minWidth: 80,
        alignItems: 'center',
    },
    value: {
        fontFamily: 'Montserrat_800ExtraBold',
        fontSize: 48,
        lineHeight: 56,
    },
    distanceContainer: {
        alignItems: 'center',
        marginTop: 20,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        backgroundColor: '#f0f4f8',
        width: '100%',
    },
    distanceLabel: {
        fontFamily: 'Montserrat_600SemiBold',
        fontSize: 12,
        color: '#6b7280',
        marginBottom: 4,
    },
    distanceValue: {
        fontFamily: 'Montserrat_800ExtraBold',
        fontSize: 36,
        lineHeight: 42,
    },
    distanceDetail: {
        fontFamily: 'Montserrat_400Regular',
        fontSize: 12,
        color: '#9ca3af',
        marginTop: 2,
    },
});
