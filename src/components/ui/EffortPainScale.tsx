import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

interface EffortPainScaleProps {
    value: number;
    onChange: (value: number) => void;
    label: string;
    icon: IconName;
    color: string;
    leftLabel: string;
    rightLabel: string;
    disabled?: boolean;
}

const SCALE_VALUES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

export function EffortPainScale({
    value,
    onChange,
    label,
    icon,
    color,
    leftLabel,
    rightLabel,
    disabled = false,
}: EffortPainScaleProps) {
    const theme = useTheme();

    const handlePress = (n: number) => {
        if (disabled) return;
        if (n !== value) {
            Haptics.selectionAsync().catch(() => {});
            onChange(n);
        }
    };

    return (
        <View style={styles.container} accessibilityRole="adjustable" accessibilityValue={{ min: 0, max: 10, now: value }}>
            <View style={styles.headerRow}>
                <MaterialCommunityIcons name={icon} size={18} color={disabled ? theme.colors.outline : color} />
                <Text style={[styles.label, disabled && { color: theme.colors.outline }]}>{label}</Text>
                <Text style={[styles.value, { color: disabled ? theme.colors.outline : color }]}>
                    {value}/10
                </Text>
            </View>

            <View style={styles.scaleRow}>
                {SCALE_VALUES.map((n) => {
                    const active = n <= value;
                    return (
                        <Pressable
                            key={n}
                            onPress={() => handlePress(n)}
                            disabled={disabled}
                            accessibilityRole="button"
                            accessibilityLabel={`${n} de 10`}
                            accessibilityState={{ selected: n === value, disabled }}
                            style={[
                                styles.cell,
                                {
                                    backgroundColor: active ? color : theme.colors.surfaceVariant,
                                    opacity: disabled ? 0.6 : 1,
                                },
                            ]}
                        >
                            <Text
                                style={[
                                    styles.cellNumber,
                                    {
                                        color: active ? theme.colors.onPrimary : theme.colors.onSurfaceVariant,
                                        opacity: n === 0 ? 0.6 : 1,
                                    },
                                ]}
                            >
                                {n}
                            </Text>
                        </Pressable>
                    );
                })}
            </View>

            <View style={styles.extremeRow}>
                <Text style={styles.extremeText}>{leftLabel}</Text>
                <Text style={styles.extremeText}>{rightLabel}</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 20,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 10,
    },
    label: {
        fontFamily: 'Montserrat_500Medium',
        fontSize: 13,
        color: '#374151',
        flex: 1,
    },
    value: {
        fontFamily: 'Montserrat_700Bold',
        fontSize: 14,
    },
    scaleRow: {
        flexDirection: 'row',
        gap: 4,
    },
    cell: {
        flex: 1,
        minHeight: 44,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cellNumber: {
        fontFamily: 'Montserrat_600SemiBold',
        fontSize: 11,
    },
    extremeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 6,
        paddingHorizontal: 2,
    },
    extremeText: {
        fontFamily: 'Montserrat_400Regular',
        fontSize: 10,
        color: '#94a3b8',
    },
});
