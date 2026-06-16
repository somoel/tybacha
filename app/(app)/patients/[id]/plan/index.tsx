import { AppCard } from '@/src/components/ui/AppCard';
import { ProgressSkeleton } from '@/src/components/ui/PatientDetailSkeletons';
import type { ExercisePlan } from '@/src/types/exercise.types';
import { fetchExercisePlans } from '@/src/services/exercisePlanService';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { IconButton, Text, useTheme } from 'react-native-paper';

const DAY_LABELS: Record<string, string> = {
    lunes: 'Lunes',
    martes: 'Martes',
    miercoles: 'Miércoles',
    jueves: 'Jueves',
    viernes: 'Viernes',
};

export default function PlanDetailScreen() {
    const { id: patientId } = useLocalSearchParams<{ id: string }>();
    const theme = useTheme();
    const router = useRouter();
    const [plan, setPlan] = useState<ExercisePlan | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useFocusEffect(useCallback(() => {
        let isActive = true;
        const load = async () => {
            if (!patientId) return;
            setIsLoading(true);
            try {
                const plans = await fetchExercisePlans(patientId);
                if (!isActive) return;
                setPlan(plans[0] ?? null);
            } catch (error) {
                console.error('Error cargando plan:', error);
            } finally {
                if (isActive) setIsLoading(false);
            }
        };
        load();
        return () => { isActive = false; };
    }, [patientId]));

    if (isLoading) return <ProgressSkeleton />;

    const displayText = plan?.resumen || plan?.summary;

    return (
        <ScrollView style={styles.container} contentInsetAdjustmentBehavior="automatic" showsVerticalScrollIndicator={false}>
            <Stack.Screen
                options={{
                    title: 'Plan de ejercicios',
                    headerRight: () => (
                        <IconButton
                            icon="pencil-outline"
                            size={22}
                            iconColor={theme.colors.onSurfaceVariant}
                            onPress={() => router.push(`/(app)/patients/${patientId}/progress/edit-plan` as never)}
                            accessibilityLabel="Editar plan"
                        />
                    ),
                }}
            />

            {!plan ? (
                <View style={styles.emptyState}>
                    <MaterialCommunityIcons name="dumbbell" size={40} color="#d1d5db" />
                    <Text style={styles.emptyTitle}>Sin plan de ejercicios</Text>
                    <Text style={styles.emptyText}>
                        Crea un plan desde una batería SFT o regístralo manualmente.
                    </Text>
                </View>
            ) : (
                <>
                    {/* Header del plan */}
                    <AppCard style={styles.headerCard}>
                        <View style={styles.headerRow}>
                            <View style={[styles.iconContainer, { backgroundColor: theme.colors.primaryContainer }]}>
                                <MaterialCommunityIcons name="dumbbell" size={22} color={theme.colors.primary} />
                            </View>
                            <View style={styles.headerText}>
                                <Text style={styles.planTitle}>{plan.titulo}</Text>
                                <Text style={styles.planDate}>
                                    {format(new Date(plan.generated_at), "dd MMM yyyy", { locale: es })}
                                </Text>
                            </View>
                        </View>
                        {displayText ? (
                            <Text style={styles.summaryText} numberOfLines={5}>{displayText}</Text>
                        ) : null}
                    </AppCard>

                    {/* Ejercicios por día */}
                    {(['lunes', 'martes', 'miercoles', 'jueves', 'viernes'] as const).map((dayKey) => {
                        const dayExercises = plan.exercises.filter((ex) => ex.frequency === dayKey);
                        if (dayExercises.length === 0) return null;

                        return (
                            <View key={dayKey} style={styles.daySection}>
                                <Text style={styles.dayLabel}>{DAY_LABELS[dayKey]}</Text>
                                {dayExercises.map((exercise) => (
                                    <AppCard key={exercise.index} style={styles.exerciseCard}>
                                        <View style={styles.exerciseRow}>
                                            <View style={styles.exerciseIcon}>
                                                <MaterialCommunityIcons name="dumbbell" size={16} color="#1a73e8" />
                                            </View>
                                            <View style={styles.exerciseInfo}>
                                                <Text style={styles.exerciseName}>{exercise.name}</Text>
                                                <Text style={styles.exerciseDescription} numberOfLines={2}>
                                                    {exercise.description || exercise.rationale}
                                                </Text>
                                                <View style={styles.exerciseMeta}>
                                                    {exercise.sets > 1 && (
                                                        <Text style={styles.metaText}>{exercise.sets} series</Text>
                                                    )}
                                                    {exercise.reps != null && (
                                                        <Text style={styles.metaText}>{exercise.reps} reps</Text>
                                                    )}
                                                    {exercise.duration_seconds != null && (
                                                        <Text style={styles.metaText}>{exercise.duration_seconds}s</Text>
                                                    )}
                                                </View>
                                            </View>
                                        </View>
                                    </AppCard>
                                ))}
                            </View>
                        );
                    })}
                </>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    emptyState: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 32 },
    emptyTitle: { fontFamily: 'Montserrat_600SemiBold', fontSize: 16, color: '#6b7280', marginTop: 12 },
    emptyText: { fontFamily: 'Montserrat_400Regular', fontSize: 13, color: '#9ca3af', textAlign: 'center', marginTop: 4, lineHeight: 18 },
    headerCard: { marginBottom: 16, marginHorizontal: 16 },
    headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    iconContainer: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    headerText: { flex: 1 },
    planTitle: { fontFamily: 'Montserrat_700Bold', fontSize: 16, color: '#1f2937' },
    planDate: { fontFamily: 'Montserrat_400Regular', fontSize: 12, color: '#6b7280', marginTop: 2 },
    summaryText: { fontFamily: 'Montserrat_400Regular', fontSize: 13, color: '#374151', lineHeight: 18, marginTop: 12, fontStyle: 'italic' },
    daySection: { marginBottom: 16, paddingHorizontal: 16 },
    dayLabel: { fontFamily: 'Montserrat_700Bold', fontSize: 14, color: '#1f2937', marginBottom: 8 },
    exerciseCard: { marginBottom: 8 },
    exerciseRow: { flexDirection: 'row', gap: 12 },
    exerciseIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#e8f0fe', justifyContent: 'center', alignItems: 'center' },
    exerciseInfo: { flex: 1 },
    exerciseName: { fontFamily: 'Montserrat_600SemiBold', fontSize: 14, color: '#1f2937' },
    exerciseDescription: { fontFamily: 'Montserrat_400Regular', fontSize: 12, color: '#6b7280', marginTop: 2, lineHeight: 16 },
    exerciseMeta: { flexDirection: 'row', gap: 8, marginTop: 6 },
    metaText: { fontFamily: 'Montserrat_500Medium', fontSize: 11, color: '#9ca3af', backgroundColor: '#f3f4f6', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
});
