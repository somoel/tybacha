import { AppCard } from '@/src/components/ui/AppCard';
import type { Exercise } from '@/src/types/exercise.types';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

const DAY_LABELS = ['L', 'M', 'X', 'J', 'V'];
const DAY_KEYS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'];

interface WeeklyProgressCardProps {
    exercises: Exercise[];
    completedIndices: Set<number>;
    todayKey: string;
}

export function WeeklyProgressCard({ exercises, completedIndices, todayKey }: WeeklyProgressCardProps) {
    const theme = useTheme();

    const totalExercises = exercises.length;
    const completedCount = exercises.filter((ex) => completedIndices.has(ex.index)).length;
    const progress = totalExercises > 0 ? completedCount / totalExercises : 0;

    const dayStatus = DAY_KEYS.map((key) => {
        const dayExercises = exercises.filter((ex) => ex.frequency === key);
        const allCompleted = dayExercises.length > 0 && dayExercises.every((ex) => completedIndices.has(ex.index));
        const someCompleted = dayExercises.some((ex) => completedIndices.has(ex.index));
        const isToday = key === todayKey;
        return { key, allCompleted, someCompleted, isToday };
    });

    return (
        <AppCard style={styles.card}>
            <View style={styles.header}>
                <MaterialCommunityIcons name="calendar-week" size={20} color={theme.colors.primary} />
                <Text style={styles.title}>Progreso semanal</Text>
            </View>

            <View style={styles.progressInfo}>
                <Text style={styles.progressText}>
                    {completedCount} de {totalExercises} ejercicios completados
                </Text>
                <Text style={[styles.progressPercent, { color: theme.colors.primary }]}>
                    {Math.round(progress * 100)}%
                </Text>
            </View>

            <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: theme.colors.primary }]} />
            </View>

            <View style={styles.daysRow}>
                {dayStatus.map((day, i) => (
                    <View
                        key={day.key}
                        style={[
                            styles.dayBadge,
                            day.isToday && { backgroundColor: theme.colors.primaryContainer, borderColor: theme.colors.primary },
                            day.allCompleted && { backgroundColor: '#e8f5e9', borderColor: '#2e7d32' },
                        ]}
                    >
                        <Text
                            style={[
                                styles.dayLabel,
                                day.isToday && { color: theme.colors.primary },
                                day.allCompleted && { color: '#2e7d32' },
                            ]}
                        >
                            {DAY_LABELS[i]}
                        </Text>
                        {day.allCompleted ? (
                            <MaterialCommunityIcons name="check-circle" size={14} color="#2e7d32" />
                        ) : day.someCompleted ? (
                            <MaterialCommunityIcons name="minus-circle" size={14} color={theme.colors.primary} />
                        ) : (
                            <MaterialCommunityIcons name="circle-outline" size={14} color="#94a3b8" />
                        )}
                    </View>
                ))}
            </View>
        </AppCard>
    );
}

const styles = StyleSheet.create({
    card: { marginBottom: 16 },
    header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
    title: { fontFamily: 'Montserrat_700Bold', fontSize: 16, color: '#1f2937' },
    progressInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    progressText: { fontFamily: 'Montserrat_500Medium', fontSize: 13, color: '#6b7280' },
    progressPercent: { fontFamily: 'Montserrat_700Bold', fontSize: 14 },
    progressTrack: { height: 8, backgroundColor: '#e5e7eb', borderRadius: 4, overflow: 'hidden', marginBottom: 12 },
    progressFill: { height: 8, borderRadius: 4 },
    daysRow: { flexDirection: 'row', justifyContent: 'space-between' },
    dayBadge: {
        flex: 1,
        alignItems: 'center',
        gap: 4,
        paddingVertical: 6,
        marginHorizontal: 3,
        borderRadius: 10,
        borderWidth: 1.5,
        borderColor: '#e5e7eb',
    },
    dayLabel: { fontFamily: 'Montserrat_600SemiBold', fontSize: 12, color: '#6b7280' },
});
