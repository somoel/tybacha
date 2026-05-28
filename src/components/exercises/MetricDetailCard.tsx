import { AppCard } from '@/src/components/ui/AppCard';
import type { ApiExerciseRecord } from '@/src/types/apiTracking.types';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

interface MetricDetailCardProps {
    records: ApiExerciseRecord[];
}

export function MetricDetailCard({ records }: MetricDetailCardProps) {
    const theme = useTheme();

    const completedRecords = records.filter((r) => r.estado === 'completado');
    const totalSessions = completedRecords.length;

    const effortValues = completedRecords
        .map((r) => r.esfuerzoPercibido)
        .filter((v): v is number => v != null);
    const painValues = completedRecords
        .map((r) => r.dolorReportado)
        .filter((v): v is number => v != null);

    const avgEffort = effortValues.length > 0
        ? effortValues.reduce((a, b) => a + b, 0) / effortValues.length
        : null;
    const avgPain = painValues.length > 0
        ? painValues.reduce((a, b) => a + b, 0) / painValues.length
        : null;

    return (
        <AppCard style={styles.card}>
            <Text style={styles.title}>Bienestar</Text>

            <View style={styles.statsRow}>
                <View style={styles.statItem}>
                    <View style={[styles.statIconContainer, { backgroundColor: theme.colors.primaryContainer }]}>
                        <MaterialCommunityIcons name="dumbbell" size={20} color={theme.colors.primary} />
                    </View>
                    <Text style={[styles.statValue, { color: theme.colors.primary }]}>{totalSessions}</Text>
                    <Text style={styles.statLabel}>Sesiones</Text>
                </View>

                <View style={styles.statItem}>
                    <View style={[styles.statIconContainer, { backgroundColor: '#e8f5e9' }]}>
                        <MaterialCommunityIcons name="check-circle" size={20} color="#2e7d32" />
                    </View>
                    <Text style={[styles.statValue, { color: '#2e7d32' }]}>
                        {completedRecords.length}
                    </Text>
                    <Text style={styles.statLabel}>Completados</Text>
                </View>

                <View style={styles.statItem}>
                    <View style={[styles.statIconContainer, { backgroundColor: '#ffebee' }]}>
                        <MaterialCommunityIcons name="close-circle" size={20} color="#c62828" />
                    </View>
                    <Text style={[styles.statValue, { color: '#c62828' }]}>
                        {records.filter((r) => r.estado === 'omitido').length}
                    </Text>
                    <Text style={styles.statLabel}>Omitidos</Text>
                </View>
            </View>

            {(avgEffort != null || avgPain != null) && (
                <View style={styles.averagesContainer}>
                    <Text style={styles.averagesTitle}>Promedios</Text>
                    <View style={styles.averagesRow}>
                        {avgEffort != null && (
                            <View style={styles.averageItem}>
                                <MaterialCommunityIcons name="arm-flex" size={16} color={theme.colors.primary} />
                                <Text style={styles.averageLabel}>Esfuerzo</Text>
                                <Text style={[styles.averageValue, { color: theme.colors.primary }]}>
                                    {avgEffort.toFixed(1)}/10
                                </Text>
                            </View>
                        )}
                        {avgPain != null && (
                            <View style={styles.averageItem}>
                                <MaterialCommunityIcons name="heart-pulse" size={16} color="#c62828" />
                                <Text style={styles.averageLabel}>Dolor</Text>
                                <Text style={[styles.averageValue, { color: '#c62828' }]}>
                                    {avgPain.toFixed(1)}/10
                                </Text>
                            </View>
                        )}
                    </View>
                </View>
            )}
        </AppCard>
    );
}

const styles = StyleSheet.create({
    card: { marginBottom: 16 },
    title: { fontFamily: 'Montserrat_700Bold', fontSize: 16, color: '#1f2937', marginBottom: 16 },
    statsRow: { flexDirection: 'row', justifyContent: 'space-around' },
    statItem: { alignItems: 'center', gap: 4 },
    statIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 4,
    },
    statValue: { fontFamily: 'Montserrat_800ExtraBold', fontSize: 20 },
    statLabel: { fontFamily: 'Montserrat_400Regular', fontSize: 11, color: '#6b7280' },
    averagesContainer: {
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
    },
    averagesTitle: { fontFamily: 'Montserrat_600SemiBold', fontSize: 13, color: '#374151', marginBottom: 12 },
    averagesRow: { flexDirection: 'row', gap: 24 },
    averageItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    averageLabel: { fontFamily: 'Montserrat_400Regular', fontSize: 13, color: '#6b7280' },
    averageValue: { fontFamily: 'Montserrat_700Bold', fontSize: 14 },
});
