import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { IconButton, Text, TextInput, useTheme } from 'react-native-paper';

interface RepCounterProps {
    initialValue?: number;
    allowNegative?: boolean;
    onValueChange: (value: number) => void;
    label?: string;
    mode: 'increment' | 'manual_input';
}

/**
 * Counter with +/- buttons for test repetitions, or manual text input
 * for distance/time measurements. Supports negative values.
 */
export function RepCounter({
    initialValue = 0,
    allowNegative = false,
    onValueChange,
    label = 'Valor',
    mode,
}: RepCounterProps) {
    const theme = useTheme();
    const [value, setValue] = useState(initialValue);
    const [textValue, setTextValue] = useState(String(initialValue));

    const handleIncrement = () => {
        const newValue = value + 1;
        setValue(newValue);
        onValueChange(newValue);
    };

    const handleDecrement = () => {
        if (!allowNegative && value <= 0) return;
        const newValue = value - 1;
        setValue(newValue);
        onValueChange(newValue);
    };

    const handleTextChange = (text: string) => {
        setTextValue(text);
        const parsed = parseFloat(text);
        if (!isNaN(parsed)) {
            if (!allowNegative && parsed < 0) return;
            setValue(parsed);
            onValueChange(parsed);
        }
    };

    if (mode === 'manual_input') {
        return (
            <View style={styles.manualContainer}>
                <Text style={styles.label}>{label}</Text>
                <TextInput
                    mode="outlined"
                    value={textValue}
                    onChangeText={handleTextChange}
                    keyboardType="decimal-pad"
                    style={styles.manualInput}
                    outlineStyle={styles.inputOutline}
                    accessibilityLabel={label}
                />
            </View>
        );
    }

    return (
        <View style={styles.container} accessibilityRole="adjustable">
            <Text style={styles.label}>{label}</Text>
            <View style={styles.counterRow}>
                <IconButton
                    icon="minus"
                    mode="contained"
                    size={28}
                    containerColor={theme.colors.surfaceVariant}
                    iconColor={theme.colors.onSurfaceVariant}
                    onPress={handleDecrement}
                    accessibilityLabel="Disminuir"
                    disabled={!allowNegative && value <= 0}
                    style={styles.counterButton}
                />
                <View style={styles.valueContainer}>
                    <Text style={[styles.value, { color: theme.colors.primary }]}>
                        {value}
                    </Text>
                </View>
                <IconButton
                    icon="plus"
                    mode="contained"
                    size={28}
                    containerColor={theme.colors.primary}
                    iconColor={theme.colors.onPrimary}
                    onPress={handleIncrement}
                    accessibilityLabel="Incrementar"
                    style={styles.counterButton}
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        paddingVertical: 12,
    },
    manualContainer: {
        paddingVertical: 12,
        paddingHorizontal: 16,
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
    manualInput: {
        fontFamily: 'Montserrat_600SemiBold',
        fontSize: 24,
        textAlign: 'center',
    },
    inputOutline: {
        borderRadius: 12,
    },
});
