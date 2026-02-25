import { AppCard } from '@/src/components/ui/AppCard';
import type { Exercise } from '@/src/types/exercise.types';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Checkbox, Text, useTheme } from 'react-native-paper';

interface ExercisePlanCardProps {
    exercise: Exercise;
    isCompleted?: boolean;
    onToggleComplete?: (exerciseIndex: number) => void;
    onLogPress?: (exerciseIndex: number) => void;
}

/**
 * Card showing a recommended exercise from an AI-generated plan.
 * Includes details, sets/reps, and a completion checkbox.
 */
export function ExercisePlanCard({
    exercise,
    isCompleted = false,
    onToggleComplete,
    onLogPress,
}: ExercisePlanCardProps) {
    const theme = useTheme();

    return (
        <AppCard
            accessibilityLabel={`Ejercicio: ${exercise.name}`}
            onPress={() => onLogPress?.(exercise.index)}
        >
            <View style={styles.header}>
                <View style={[styles.indexBadge, { backgroundColor: theme.colors.primaryContainer }]}>
                    <Text style={[styles.indexText, { color: theme.colors.onPrimaryContainer }]}>
                        {exercise.index + 1}
                    </Text>
                </View>
                <View style={styles.headerContent}>
                    <Text style={styles.name}>{exercise.name}</Text>
                    <Text style={styles.frequency}>
                        <MaterialCommunityIcons name="calendar-clock" size={12} color={theme.colors.secondary} />
                        {' '}{exercise.frequency}
                    </Text>
                </View>
                {onToggleComplete && (
                    <Checkbox
                        status={isCompleted ? 'checked' : 'unchecked'}
                        onPress={() => onToggleComplete(exercise.index)}
                        color={theme.colors.primary}
                    />
                )}
            </View>

            <Text style={styles.description}>{exercise.description}</Text>

            <View style={styles.detailsRow}>
                {exercise.sets > 0 && (
                    <View style={styles.detailChip}>
                        <MaterialCommunityIcons name="repeat" size={14} color={theme.colors.primary} />
                        <Text style={styles.detailText}>{exercise.sets} series</Text>
                    </View>
                )}
                {exercise.reps !== null && (
                    <View style={styles.detailChip}>
                        <MaterialCommunityIcons name="counter" size={14} color={theme.colors.primary} />
                        <Text style={styles.detailText}>{exercise.reps} reps</Text>
                    </View>
                )}
                {exercise.duration_seconds !== null && (
                    <View style={styles.detailChip}>
                        <MaterialCommunityIcons name="timer-outline" size={14} color={theme.colors.primary} />
                        <Text style={styles.detailText}>{exercise.duration_seconds}s</Text>
                    </View>
                )}
            </View>

            <View style={styles.rationaleContainer}>
                <MaterialCommunityIcons name="lightbulb-outline" size={14} color={theme.colors.secondary} />
                <Text style={styles.rationale}>{exercise.rationale}</Text>
            </View>
        </AppCard>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 8,
    },
    indexBadge: {
        width: 32,
        height: 32,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    indexText: {
        fontFamily: 'Montserrat_700Bold',
        fontSize: 14,
    },
    headerContent: {
        flex: 1,
    },
    name: {
        fontFamily: 'Montserrat_600SemiBold',
        fontSize: 15,
        color: '#1f2937',
    },
    frequency: {
        fontFamily: 'Montserrat_400Regular',
        fontSize: 12,
        color: '#6b7280',
        marginTop: 1,
    },
    description: {
        fontFamily: 'Montserrat_400Regular',
        fontSize: 13,
        color: '#374151',
        lineHeight: 18,
        marginBottom: 8,
    },
    detailsRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 8,
    },
    detailChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#f0f3f6',
        borderRadius: 8,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    detailText: {
        fontFamily: 'Montserrat_500Medium',
        fontSize: 12,
        color: '#374151',
    },
    rationaleContainer: {
        flexDirection: 'row',
        gap: 6,
        backgroundColor: '#f8f9fa',
        borderRadius: 8,
        padding: 8,
    },
    rationale: {
        fontFamily: 'Montserrat_400Regular',
        fontSize: 12,
        color: '#6b7280',
        lineHeight: 16,
        flex: 1,
        fontStyle: 'italic',
    },
});
