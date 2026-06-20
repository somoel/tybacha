import { AppCard } from '@/src/components/ui/AppCard';
import type { Exercise } from '@/src/types/exercise.types';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

function formatDuration(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    const mins = seconds / 60;
    return Number.isInteger(mins) ? `${mins}m` : `${mins.toFixed(1)}m`;
}

type ExerciseStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';

interface TodayExerciseCardProps {
    exercise: Exercise;
    status: ExerciseStatus;
    resultValue?: number;
    resultUnit?: string;
    onPress?: () => void;
}

export function TodayExerciseCard({ exercise, status, resultValue, resultUnit, onPress }: TodayExerciseCardProps) {
    const theme = useTheme();

    const isCompleted = status === 'completed';
    const isSkipped = status === 'skipped';
    const isInProgress = status === 'in_progress';
    const isPending = status === 'pending';

    const statusColor = isCompleted ? '#2e7d32' : isSkipped ? '#c62828' : isInProgress ? '#f57c0b' : '#94a3b8';
    const statusBg = isCompleted ? '#e8f5e9' : isSkipped ? '#ffebee' : isInProgress ? '#fff3e0' : '#f1f5f9';
    const statusIcon = isCompleted ? 'check-circle' : isSkipped ? 'close-circle' : isInProgress ? 'play-circle' : 'circle-outline';

    return (
        <AppCard
            style={{ ...styles.card, borderLeftWidth: 3, borderLeftColor: statusColor }}
            onPress={onPress}
        >
            <View style={styles.header}>
                <View style={[styles.indexBadge, { backgroundColor: statusBg }]}>
                    <Text style={[styles.indexText, { color: statusColor }]}>{exercise.index + 1}</Text>
                </View>
                <View style={styles.headerContent}>
                    <Text style={styles.name}>{exercise.name}</Text>
                    <Text style={styles.prescription}>
                        {exercise.sets > 0 && `${exercise.sets} series`}
                        {exercise.reps !== null && ` · ${exercise.reps} reps`}
                        {exercise.duration_seconds !== null && ` · ${formatDuration(exercise.duration_seconds)}`}
                    </Text>
                </View>
                <MaterialCommunityIcons name={statusIcon} size={22} color={statusColor} />
            </View>

            {exercise.description ? (
                <Text style={styles.description} numberOfLines={2}>{exercise.description}</Text>
            ) : null}

            {isCompleted && resultValue !== undefined && (
                <View style={styles.resultRow}>
                    <MaterialCommunityIcons name="check" size={14} color="#2e7d32" />
                    <Text style={styles.resultText}>
                        Completado: {resultValue} {resultUnit ?? ''}
                    </Text>
                </View>
            )}

            {isSkipped && (
                <View style={styles.resultRow}>
                    <MaterialCommunityIcons name="close" size={14} color="#c62828" />
                    <Text style={[styles.resultText, { color: '#c62828' }]}>Omitido</Text>
                </View>
            )}

            {(isPending || isInProgress) && onPress && (
                <View style={styles.actionRow}>
                    <Text style={[styles.actionText, { color: isInProgress ? '#f57c0b' : theme.colors.primary }]}>
                        {isInProgress ? 'Continuar ejercicio' : 'Iniciar ejercicio'}
                    </Text>
                    <MaterialCommunityIcons name="chevron-right" size={18} color={isInProgress ? '#f57c0b' : theme.colors.primary} />
                </View>
            )}
        </AppCard>
    );
}

const styles = StyleSheet.create({
    card: { marginBottom: 8 },
    header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    indexBadge: {
        width: 32,
        height: 32,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    indexText: { fontFamily: 'Montserrat_700Bold', fontSize: 14 },
    headerContent: { flex: 1 },
    name: { fontFamily: 'Montserrat_600SemiBold', fontSize: 15, color: '#1f2937' },
    prescription: { fontFamily: 'Montserrat_400Regular', fontSize: 12, color: '#6b7280', marginTop: 2 },
    description: { fontFamily: 'Montserrat_400Regular', fontSize: 13, color: '#374151', marginTop: 8, lineHeight: 18 },
    resultRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
    resultText: { fontFamily: 'Montserrat_500Medium', fontSize: 13, color: '#2e7d32' },
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        marginTop: 10,
    },
    actionText: { fontFamily: 'Montserrat_600SemiBold', fontSize: 13 },
});
