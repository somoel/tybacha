import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useState } from 'react';
import { Pressable, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { Text, TextInput as PaperTextInput, useTheme } from 'react-native-paper';

interface RepCounterProps {
    value: number;
    allowNegative?: boolean;
    onValueChange: (value: number) => void;
    label?: string;
    mode: 'increment' | 'manual_input';
    min?: number;
    max?: number;
    unit?: string;
    disabled?: boolean;
}

const LONG_PRESS_DELTA = 5;
const DEFAULT_MIN = -100;
const DEFAULT_MAX = 1000;
const DEFAULT_REP_MAX = 999;

function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

/**
 * Contador de repeticiones o de distancia con pasos fijos.
 * Controlado por el padre y acotado: cualquier valor fuera de rango o no
 * numérico se descarta, nunca se propaga al estado de la pantalla.
 */
export function RepCounter({
    value,
    allowNegative = false,
    onValueChange,
    label = 'Valor',
    mode,
    min,
    max,
    unit,
    disabled = false,
}: RepCounterProps) {
    const theme = useTheme();
    const lowerBound = min ?? (allowNegative ? DEFAULT_MIN : 0);
    const upperBound = max ?? (unit ? DEFAULT_MAX : DEFAULT_REP_MAX);
    const [editing, setEditing] = useState(false);
    const [editText, setEditText] = useState(String(value ?? 0));
    const [textValue, setTextValue] = useState(() => Math.abs(value ?? 0).toString());

    const currentValue = Number.isFinite(value) ? value : 0;
    const canDecrease = currentValue > lowerBound;
    const canIncrease = currentValue < upperBound;

    const triggerHaptic = (style: 'selection' | 'medium' = 'selection') => {
        if (disabled) return;
        if (style === 'medium') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
        } else {
            Haptics.selectionAsync().catch(() => {});
        }
    };

    const applyValue = (next: number) => {
        if (!Number.isFinite(next)) return;
        const rounded = Math.round(next * 10) / 10;
        const bounded = clamp(rounded, lowerBound, upperBound);
        if (bounded === currentValue) return;
        onValueChange(bounded);
    };

    const step = (amount: number) => {
        if (disabled) return;
        applyValue(currentValue + amount);
    };

    const handleIncrement = () => {
        if (disabled || !canIncrease) return;
        triggerHaptic('selection');
        step(1);
    };

    const handleIncrementLong = () => {
        if (disabled || !canIncrease) return;
        triggerHaptic('medium');
        step(LONG_PRESS_DELTA);
    };

    const handleDecrement = () => {
        if (disabled || !canDecrease) return;
        step(-1);
    };

    const handleDecrementLong = () => {
        if (disabled || !canDecrease) return;
        step(-LONG_PRESS_DELTA);
    };

    const startEditing = () => {
        if (disabled) return;
        setEditText(String(currentValue));
        setEditing(true);
    };

    const commitEdit = () => {
        setEditing(false);
        const parsed = parseFloat(editText);
        if (Number.isFinite(parsed)) {
            applyValue(parsed);
        }
    };

    const handleTextChange = (text: string) => {
        if (disabled) return;
        setTextValue(text);
        const parsed = parseFloat(text);
        if (Number.isFinite(parsed)) {
            applyValue(parsed);
        }
    };

    if (mode === 'manual_input') {
        if (allowNegative) {
            return (
                <View style={styles.stepperContainer}>
                    <Text style={[styles.label, disabled && { color: theme.colors.outline }]}>{label}</Text>
                    <View style={styles.stepperRow}>
                        <Pressable
                            onPress={() => step(-1)}
                            disabled={disabled || !canDecrease}
                            style={[styles.stepperBtn, { backgroundColor: theme.colors.errorContainer }, (disabled || !canDecrease) && styles.disabledBtn]}
                            accessibilityLabel="Restar 1"
                            accessibilityRole="button"
                        >
                            <Text style={[styles.stepperBtnText, { color: theme.colors.onErrorContainer }]}>-1</Text>
                        </Pressable>
                        <Pressable
                            onPress={() => step(-0.1)}
                            disabled={disabled || !canDecrease}
                            style={[
                                styles.stepperBtn,
                                styles.stepperBtnSmall,
                                { backgroundColor: theme.colors.surfaceVariant },
                                (disabled || !canDecrease) && styles.disabledBtn,
                            ]}
                            accessibilityLabel="Restar 0.1"
                            accessibilityRole="button"
                        >
                            <Text style={[styles.stepperBtnText, styles.stepperBtnTextSmall, { color: theme.colors.onSurfaceVariant }]}>-0.1</Text>
                        </Pressable>
                        <View style={styles.stepperValueRow}>
                            <Text
                                style={[
                                    styles.stepperValue,
                                    { color: currentValue < 0 ? theme.colors.error : theme.colors.primary },
                                ]}
                            >
                                {currentValue < 0 ? '\u2212' : currentValue > 0 ? '+' : ''}{Math.abs(currentValue).toFixed(1)}
                            </Text>
                            <Text style={[styles.stepperUnit, { color: theme.colors.outline }]}> {unit ?? 'cm'}</Text>
                        </View>
                        <Pressable
                            onPress={() => step(0.1)}
                            disabled={disabled || !canIncrease}
                            style={[
                                styles.stepperBtn,
                                styles.stepperBtnSmall,
                                { backgroundColor: theme.colors.surfaceVariant },
                                (disabled || !canIncrease) && styles.disabledBtn,
                            ]}
                            accessibilityLabel="Sumar 0.1"
                            accessibilityRole="button"
                        >
                            <Text style={[styles.stepperBtnText, styles.stepperBtnTextSmall, { color: theme.colors.onSurfaceVariant }]}>+0.1</Text>
                        </Pressable>
                        <Pressable
                            onPress={() => step(1)}
                            disabled={disabled || !canIncrease}
                            style={[styles.stepperBtn, { backgroundColor: theme.colors.primaryContainer }, (disabled || !canIncrease) && styles.disabledBtn]}
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
                <Text style={[styles.label, disabled && { color: theme.colors.outline }]}>{label}</Text>
                <PaperTextInput
                    mode="outlined"
                    value={textValue}
                    onChangeText={handleTextChange}
                    keyboardType="decimal-pad"
                    editable={!disabled}
                    style={styles.manualInput}
                    outlineStyle={styles.inputOutline}
                    accessibilityLabel={label}
                />
            </View>
        );
    }

    return (
        <View style={styles.container} accessibilityRole="adjustable" accessibilityState={{ disabled }}>
            <Text style={[styles.label, disabled && { color: theme.colors.outline }]}>{label}</Text>
            <View style={styles.counterRow}>
                <Pressable
                    onPress={handleDecrement}
                    onLongPress={handleDecrementLong}
                    disabled={disabled || !canDecrease}
                    delayLongPress={350}
                    style={[
                        styles.counterBtn,
                        { backgroundColor: theme.colors.surfaceVariant },
                        (disabled || !canDecrease) && styles.disabledBtn,
                    ]}
                    accessibilityLabel="Disminuir (mantener para -5)"
                    accessibilityRole="button"
                >
                    <Text style={[styles.counterBtnText, { color: theme.colors.onSurfaceVariant }]}>-1</Text>
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
                        <TouchableOpacity
                            onPress={startEditing}
                            disabled={disabled}
                            accessibilityRole="button"
                            accessibilityLabel={`${currentValue}. Toca para editar`}
                            style={styles.valueTap}
                        >
                            <Text style={[styles.value, { color: disabled ? theme.colors.outline : theme.colors.primary }]}>
                                {currentValue}
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>
                <Pressable
                    onPress={handleIncrement}
                    onLongPress={handleIncrementLong}
                    disabled={disabled || !canIncrease}
                    delayLongPress={350}
                    style={[
                        styles.counterBtn,
                        { backgroundColor: theme.colors.primaryContainer },
                        (disabled || !canIncrease) && styles.disabledBtn,
                    ]}
                    accessibilityLabel="Incrementar (mantener para +5)"
                    accessibilityRole="button"
                >
                    <Text style={[styles.counterBtnText, { color: theme.colors.onPrimaryContainer }]}>+1</Text>
                </Pressable>
            </View>
            {!disabled && (
                <View style={styles.editHint}>
                    <MaterialCommunityIcons name="pencil-outline" size={11} color={theme.colors.outline} />
                    <Text style={styles.editHintText}>Toca el número para editarlo</Text>
                </View>
            )}
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
    valueTap: {
        paddingVertical: 4,
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
    editHint: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 4,
    },
    editHintText: {
        fontFamily: 'Montserrat_400Regular',
        fontSize: 11,
        color: '#94a3b8',
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
    disabledBtn: {
        opacity: 0.4,
    },
});
