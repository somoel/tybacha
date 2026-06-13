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
    status: 'completed' | 'skipped' | 'partial';
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
        dateLabel = format(date, 'EEE d MMM', { locale: es });
    }

    const timeLabel = format(date, 'HH:mm');

    const statusConfig = {
        completed: { color: '#2e7d32', bg: '#e8f5e9', icon: 'check-circle' as const, label: 'Completado' },
        skipped: { color: '#c62828', bg: '#ffebee', icon: 'close-circle' as const, label: 'Omitido' },
        partial: { color: '#ca8a04', bg: '#fef9c3', icon: 'minus-circle' as const, label: 'Parcial' },
    };

    const config = statusConfig[status];

    const resultParts: string[] = [];
    if (reps !== undefined) resultParts.push(`${reps} reps`);
    if (duration !== undefined) resultParts.push(`${duration}s`);

    return (
        <AppCard style={styles.card}>
            <View style={styles.row}>
                <View style={[styles.dateBadge, { backgroundColor: config.bg }]}>
                    <Text style={[styles.dateLabel, { color: config.color }]}>{dateLabel}</Text>
                    <Text style={[styles.timeLabel, { color: config.color }]}>{timeLabel}</Text>
                </View>
                <View style={styles.info}>
                    <Text style={styles.name} numberOfLines={1}>{exerciseName}</Text>
                    {resultParts.length > 0 && (
                        <Text style={styles.result}>{resultParts.join(' · ')}</Text>
                    )}
                </View>
                <View style={styles.statusBadge}>
                    <MaterialCommunityIcons name={config.icon} size={18} color={config.color} />
                    <Text style={[styles.statusLabel, { color: config.color }]}>{config.label}</Text>
                </View>
            </View>
        </AppCard>
    );
}

const styles = StyleSheet.create({
    card: { marginBottom: 6 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    dateBadge: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        minWidth: 80,
        alignItems: 'center',
    },
    dateLabel: { fontFamily: 'Montserrat_600SemiBold', fontSize: 11 },
    timeLabel: { fontFamily: 'Montserrat_400Regular', fontSize: 10, marginTop: 1 },
    info: { flex: 1 },
    name: { fontFamily: 'Montserrat_500Medium', fontSize: 14, color: '#1f2937' },
    result: { fontFamily: 'Montserrat_400Regular', fontSize: 12, color: '#6b7280', marginTop: 2 },
    statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    statusLabel: { fontFamily: 'Montserrat_500Medium', fontSize: 11 },
});
