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
    exerciseResults: Record<number, { reps?: number; duration?: number }>;
    isToday: boolean;
    onExercisePress?: (exercise: Exercise) => void;
}

export function ExerciseDayGroup({ dayKey, exercises, completedIndices, exerciseResults, isToday, onExercisePress }: ExerciseDayGroupProps) {
    const theme = useTheme();

    const allCompleted = exercises.every((ex) => completedIndices.has(ex.index));
    const dayCompletedCount = exercises.filter((ex) => completedIndices.has(ex.index)).length;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    {allCompleted ? (
                        <MaterialCommunityIcons name="check-circle" size={18} color="#2e7d32" />
                    ) : isToday ? (
                        <MaterialCommunityIcons name="circle-slice-8" size={18} color={theme.colors.primary} />
                    ) : (
                        <MaterialCommunityIcons name="circle-outline" size={18} color="#94a3b8" />
                    )}
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

            {exercises.map((exercise) => (
                <TodayExerciseCard
                    key={exercise.index}
                    exercise={exercise}
                    status={
                        completedIndices.has(exercise.index)
                            ? 'completed'
                            : 'pending'
                    }
                    resultValue={exerciseResults[exercise.index]?.reps ?? exerciseResults[exercise.index]?.duration}
                    resultUnit={exerciseResults[exercise.index]?.reps !== undefined ? 'reps' : exerciseResults[exercise.index]?.duration !== undefined ? 's' : undefined}
                    onPress={isToday && onExercisePress ? () => onExercisePress(exercise) : undefined}
                />
            ))}
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
