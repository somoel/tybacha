import React, { useState } from 'react';
import { Pressable, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { Text, TextInput as PaperTextInput, useTheme } from 'react-native-paper';

interface RepCounterProps {
    initialValue?: number;
    allowNegative?: boolean;
    onValueChange: (value: number) => void;
    label?: string;
    mode: 'increment' | 'manual_input';
}

/**
 * Counter with +/- buttons for test repetitions, or manual text input
 * for distance/time measurements. In increment mode the numeric display
 * is tappable – it switches to an inline TextInput for direct entry.
 * When allowNegative is true in manual_input mode, a stepper with
 * ±1 and ±0.1 steps is shown instead of a text input.
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
    const [editing, setEditing] = useState(false);
    const [editText, setEditText] = useState(String(initialValue));
    const [textValue, setTextValue] = useState(Math.abs(initialValue).toString());

    const applyValue = (newValue: number) => {
        const rounded = Math.round(newValue * 10) / 10;
        setValue(rounded);
        onValueChange(rounded);
    };

    const handleIncrement = () => applyValue(value + 1);

    const handleDecrement = () => {
        if (!allowNegative && value <= 0) return;
        applyValue(value - 1);
    };

    const startEditing = () => {
        setEditText(String(value));
        setEditing(true);
    };

    const commitEdit = () => {
        setEditing(false);
        const parsed = parseInt(editText, 10);
        if (!isNaN(parsed)) {
            if (!allowNegative && parsed < 0) return;
            applyValue(parsed);
        }
    };

    const handleTextChange = (text: string) => {
        setTextValue(text);
        const parsed = parseFloat(text);
        if (!isNaN(parsed)) {
            applyValue(parsed);
        }
    };

    const step = (amount: number) => {
        applyValue(value + amount);
    };

    if (mode === 'manual_input') {
        if (allowNegative) {
            return (
                <View style={styles.stepperContainer}>
                    <Text style={styles.label}>{label}</Text>
                    <View style={styles.stepperRow}>
                        <Pressable
                            onPress={() => step(-1)}
                            style={[styles.stepperBtn, { backgroundColor: theme.colors.errorContainer }]}
                            accessibilityLabel="Restar 1"
                            accessibilityRole="button"
                        >
                            <Text style={[styles.stepperBtnText, { color: theme.colors.onErrorContainer }]}>-1</Text>
                        </Pressable>
                        <Pressable
                            onPress={() => step(-0.1)}
                            style={[styles.stepperBtn, styles.stepperBtnSmall, { backgroundColor: theme.colors.surfaceVariant }]}
                            accessibilityLabel="Restar 0.1"
                            accessibilityRole="button"
                        >
                            <Text style={[styles.stepperBtnText, styles.stepperBtnTextSmall, { color: theme.colors.onSurfaceVariant }]}>-0.1</Text>
                        </Pressable>
                        <View style={styles.stepperValueRow}>
                            <Text
                                style={[
                                    styles.stepperValue,
                                    { color: value < 0 ? theme.colors.error : theme.colors.primary },
                                ]}
                            >
                                {value < 0 ? '\u2212' : value > 0 ? '+' : ''}{Math.abs(value).toFixed(1)}
                            </Text>
                            <Text style={[styles.stepperUnit, { color: theme.colors.outline }]}> cm</Text>
                        </View>
                        <Pressable
                            onPress={() => step(0.1)}
                            style={[styles.stepperBtn, styles.stepperBtnSmall, { backgroundColor: theme.colors.surfaceVariant }]}
                            accessibilityLabel="Sumar 0.1"
                            accessibilityRole="button"
                        >
                            <Text style={[styles.stepperBtnText, styles.stepperBtnTextSmall, { color: theme.colors.onSurfaceVariant }]}>+0.1</Text>
                        </Pressable>
                        <Pressable
                            onPress={() => step(1)}
                            style={[styles.stepperBtn, { backgroundColor: theme.colors.primaryContainer }]}
                            accessibilityLabel="Sumar 1"
                            accessibilityRole="button"
                        >
                            <Text style={[styles.stepperBtnText, { color: theme.colors.onPrimaryContainer }]}>+1</Text>
                        </Pressable>
                    </View>
                </View>
            );
        }

        return (
            <View style={styles.manualContainer}>
                <Text style={styles.label}>{label}</Text>
                <PaperTextInput
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
                <Pressable
                    onPress={handleDecrement}
                    disabled={!allowNegative && value <= 0}
                    style={[styles.counterBtn, { backgroundColor: theme.colors.surfaceVariant }]}
                    accessibilityLabel="Disminuir"
                    accessibilityRole="button"
                >
                    <Text style={[styles.counterBtnText, { color: (!allowNegative && value <= 0) ? theme.colors.outline : theme.colors.onSurfaceVariant }]}>-1</Text>
                </Pressable>
                <View style={styles.valueContainer}>
                    {editing ? (
                        <TextInput
                            value={editText}
                            onChangeText={setEditText}
                            keyboardType="number-pad"
                            autoFocus
                            onBlur={commitEdit}
                            onSubmitEditing={commitEdit}
                            selectTextOnFocus
                            style={[styles.valueInput, { color: theme.colors.primary, borderColor: theme.colors.primary }]}
                            accessibilityLabel="Editar valor"
                        />
                    ) : (
                        <TouchableOpacity onPress={startEditing} accessibilityLabel={`${value}. Toca para editar`}>
                            <Text style={[styles.value, { color: theme.colors.primary }]}>
                                {value}
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>
                <Pressable
                    onPress={handleIncrement}
                    style={[styles.counterBtn, { backgroundColor: theme.colors.primaryContainer }]}
                    accessibilityLabel="Incrementar"
                    accessibilityRole="button"
                >
                    <Text style={[styles.counterBtnText, { color: theme.colors.onPrimaryContainer }]}>+1</Text>
                </Pressable>
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
    counterBtn: {
        width: 56,
        height: 56,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    counterBtnText: {
        fontFamily: 'Montserrat_700Bold',
        fontSize: 18,
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
    valueInput: {
        fontFamily: 'Montserrat_800ExtraBold',
        fontSize: 48,
        lineHeight: 56,
        minWidth: 60,
        textAlign: 'center',
        borderWidth: 2,
        borderRadius: 12,
        paddingHorizontal: 8,
        paddingVertical: 0,
    },
    manualInput: {
        fontFamily: 'Montserrat_600SemiBold',
        fontSize: 24,
        textAlign: 'center',
    },
    inputOutline: {
        borderRadius: 12,
    },
    stepperContainer: {
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
    },
    stepperRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    stepperBtn: {
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 12,
    },
    stepperBtnSmall: {
        height: 36,
        borderRadius: 10,
        paddingHorizontal: 8,
    },
    stepperBtnText: {
        fontFamily: 'Montserrat_700Bold',
        fontSize: 15,
    },
    stepperBtnTextSmall: {
        fontFamily: 'Montserrat_600SemiBold',
        fontSize: 12,
    },
    stepperValue: {
        fontFamily: 'Montserrat_800ExtraBold',
        fontSize: 36,
        lineHeight: 42,
    },
    stepperValueRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
    },
    stepperUnit: {
        fontFamily: 'Montserrat_400Regular',
        fontSize: 14,
    },
});
