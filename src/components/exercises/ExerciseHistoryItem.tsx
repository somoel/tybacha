import { AppCard } from '@/src/components/ui/AppCard';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format, isToday, isYesterday } from 'date-fns';
import { es } from 'date-fns/locale';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

interface ExerciseHistoryItemProps {
    exerciseName: string;
    completedAt: string;
    status: 'completed' | 'skipped';
    reps?: number;
    duration?: number;
}

export function ExerciseHistoryItem({ exerciseName, completedAt, status, reps, duration }: ExerciseHistoryItemProps) {
    const date = new Date(completedAt);

    let dateLabel: string;
    if (isToday(date)) {
        dateLabel = 'Hoy';
    } else if (isYesterday(date)) {
        dateLabel = 'Ayer';
    } else {
        dateLabel = format(date, 'EEE', { locale: es });
    }

    const isCompleted = status === 'completed';
    const statusColor = isCompleted ? '#2e7d32' : '#c62828';
    const statusIcon = isCompleted ? 'check-circle' : 'close-circle';

    const resultParts: string[] = [];
    if (reps !== undefined) resultParts.push(`${reps} reps`);
    if (duration !== undefined) resultParts.push(`${duration}s`);

    return (
        <AppCard style={styles.card}>
            <View style={styles.row}>
                <View style={[styles.dateBadge, { backgroundColor: isCompleted ? '#e8f5e9' : '#ffebee' }]}>
                    <Text style={[styles.dateLabel, { color: statusColor }]}>{dateLabel}</Text>
                </View>
                <View style={styles.info}>
                    <Text style={styles.name} numberOfLines={1}>{exerciseName}</Text>
                    {resultParts.length > 0 && (
                        <Text style={styles.result}>{resultParts.join(' · ')}</Text>
                    )}
                </View>
                <MaterialCommunityIcons name={statusIcon} size={20} color={statusColor} />
            </View>
        </AppCard>
    );
}

const styles = StyleSheet.create({
    card: { marginBottom: 6 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    dateBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        minWidth: 56,
        alignItems: 'center',
    },
    dateLabel: { fontFamily: 'Montserrat_600SemiBold', fontSize: 12 },
    info: { flex: 1 },
    name: { fontFamily: 'Montserrat_500Medium', fontSize: 14, color: '#1f2937' },
    result: { fontFamily: 'Montserrat_400Regular', fontSize: 12, color: '#6b7280', marginTop: 2 },
});
