import { TodayExerciseCard } from '@/src/components/exercises/TodayExerciseCard';
import type { Exercise } from '@/src/types/exercise.types';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

const DAY_NAMES: Record<string, string> = {
    lunes: 'Lunes',
    martes: 'Martes',
    miercoles: 'Miércoles',
    jueves: 'Jueves',
    viernes: 'Viernes',
};

interface ExerciseDayGroupProps {
    dayKey: string;
    exercises: Exercise[];
    completedIndices: Set<number>;
    skippedIndices?: Set<number>;
    inProgressIndices?: Set<number>;
    exerciseResults: Record<number, { reps?: number; duration?: number }>;
    isToday: boolean;
    onExercisePress?: (exercise: Exercise) => void;
}

export function ExerciseDayGroup({ dayKey, exercises, completedIndices, skippedIndices = new Set(), inProgressIndices = new Set(), exerciseResults, isToday, onExercisePress }: ExerciseDayGroupProps) {
    const theme = useTheme();

    const allCompleted = exercises.length > 0 && exercises.every((ex) => completedIndices.has(ex.index));
    const allSkipped = exercises.length > 0 && exercises.every((ex) => skippedIndices.has(ex.index));
    const dayCompletedCount = exercises.filter((ex) => completedIndices.has(ex.index)).length;

    let headerIcon: string;
    let headerIconColor: string;
    if (allCompleted) {
        headerIcon = 'check-circle';
        headerIconColor = '#2e7d32';
    } else if (allSkipped) {
        headerIcon = 'close-circle';
        headerIconColor = '#c62828';
    } else if (isToday) {
        headerIcon = 'circle-slice-8';
        headerIconColor = theme.colors.primary;
    } else {
        headerIcon = 'circle-outline';
        headerIconColor = '#94a3b8';
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <MaterialCommunityIcons name={headerIcon as any} size={18} color={headerIconColor} />
                    <Text style={[styles.dayTitle, isToday && { color: theme.colors.primary }]}>
                        {DAY_NAMES[dayKey] ?? dayKey}
                    </Text>
                    {isToday && (
                        <View style={[styles.todayBadge, { backgroundColor: theme.colors.primaryContainer }]}>
                            <Text style={[styles.todayText, { color: theme.colors.primary }]}>Hoy</Text>
                        </View>
                    )}
                </View>
                <Text style={styles.countText}>
                    {dayCompletedCount}/{exercises.length}
                </Text>
            </View>

            {exercises.map((exercise) => {
                const status = completedIndices.has(exercise.index)
                    ? 'completed' as const
                    : skippedIndices.has(exercise.index)
                        ? 'skipped' as const
                        : inProgressIndices.has(exercise.index)
                            ? 'in_progress' as const
                            : 'pending' as const;

                return (
                    <TodayExerciseCard
                        key={exercise.index}
                        exercise={exercise}
                        status={status}
                        resultValue={exerciseResults[exercise.index]?.reps ?? exerciseResults[exercise.index]?.duration}
                        resultUnit={exerciseResults[exercise.index]?.reps !== undefined ? 'reps' : exerciseResults[exercise.index]?.duration !== undefined ? 's' : undefined}
                        onPress={onExercisePress ? () => onExercisePress(exercise) : undefined}
                    />
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { marginBottom: 20 },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    dayTitle: { fontFamily: 'Montserrat_700Bold', fontSize: 16, color: '#1f2937' },
    todayBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
    todayText: { fontFamily: 'Montserrat_600SemiBold', fontSize: 11 },
    countText: { fontFamily: 'Montserrat_500Medium', fontSize: 13, color: '#6b7280' },
});
