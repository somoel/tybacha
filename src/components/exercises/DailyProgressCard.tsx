import { AppCard } from '@/src/components/ui/AppCard';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

interface DailyProgressCardProps {
    completed: number;
    skipped: number;
    total: number;
}

export function DailyProgressCard({ completed, skipped, total }: DailyProgressCardProps) {
    const theme = useTheme();
    const allDone = total > 0 && completed === total;
    const progress = total > 0 ? completed / total : 0;

    if (total === 0) return null;

    return (
        <AppCard style={allDone ? { ...styles.card, borderColor: '#2e7d32', borderWidth: 1 } : styles.card}>
            <View style={styles.header}>
                <MaterialCommunityIcons
                    name={allDone ? 'check-circle' : 'calendar-check'}
                    size={20}
                    color={allDone ? '#2e7d32' : theme.colors.primary}
                />
                <Text style={[styles.title, allDone && { color: '#2e7d32' }]}>
                    {allDone ? '¡Ejercicios del día completados!' : 'Ejercicios de hoy'}
                </Text>
            </View>

            {!allDone && (
                <View style={styles.progressInfo}>
                    <Text style={styles.progressText}>
                        {completed} de {total} completados{skipped > 0 ? ` · ${skipped} omitidos` : ''}
                    </Text>
                    <Text style={[styles.progressPercent, { color: theme.colors.primary }]}>
                        {Math.round(progress * 100)}%
                    </Text>
                </View>
            )}

            {!allDone && (
                <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: theme.colors.primary }]} />
                </View>
            )}

            {allDone && (
                <Text style={styles.allDoneText}>
                    {skipped > 0
                        ? `Realizados: ${completed} · Omitidos: ${skipped}`
                        : 'Todos los ejercicios fueron realizados'}
                </Text>
            )}
        </AppCard>
    );
}

const styles = StyleSheet.create({
    card: {
        marginBottom: 12,
        borderColor: 'transparent',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 10,
    },
    title: {
        fontFamily: 'Montserrat_700Bold',
        fontSize: 15,
        color: '#1f2937',
    },
    progressInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    progressText: {
        fontFamily: 'Montserrat_500Medium',
        fontSize: 13,
        color: '#6b7280',
    },
    progressPercent: {
        fontFamily: 'Montserrat_700Bold',
        fontSize: 14,
    },
    progressTrack: {
        height: 6,
        backgroundColor: '#e5e7eb',
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressFill: {
        height: 6,
        borderRadius: 3,
    },
    allDoneText: {
        fontFamily: 'Montserrat_500Medium',
        fontSize: 13,
        color: '#2e7d32',
    },
});
