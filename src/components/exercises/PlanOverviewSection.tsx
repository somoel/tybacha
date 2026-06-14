import { TodayExerciseCard } from '@/src/components/exercises/TodayExerciseCard';
import { AppCard } from '@/src/components/ui/AppCard';
import { usePermissions } from '@/src/hooks/usePermissions';
import type { Exercise, ExercisePlan } from '@/src/types/exercise.types';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { IconButton, Text, useTheme } from 'react-native-paper';

const DAY_LABELS: Record<string, string> = {
    lunes: 'Lunes',
    martes: 'Martes',
    miercoles: 'Miércoles',
    jueves: 'Jueves',
    viernes: 'Viernes',
};
const DAY_ORDER = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'] as const;

function getTodayKey(): string {
    const day = new Date().getDay();
    return ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'][day];
}

interface PlanOverviewSectionProps {
    patientId: string;
    plan: ExercisePlan | null;
    exerciseRecords: { idEjercicioPlan: number; estado: string }[];
    onEdit?: () => void;
}

export function PlanOverviewSection({ patientId, plan, exerciseRecords, onEdit }: PlanOverviewSectionProps) {
    const theme = useTheme();
    const router = useRouter();
    const { isAdmin, isProfessional } = usePermissions();
    const hasStaffAccess = isAdmin || isProfessional;
    const todayKey = getTodayKey();
    const dayCardWidth = 170;

    if (!plan) {
        return (
            <View style={styles.emptyContainer}>
                <MaterialCommunityIcons name="dumbbell" size={36} color="#d1d5db" />
                <Text style={styles.emptyTitle}>Sin plan de ejercicios</Text>
                <Text style={styles.emptyText}>
                    {hasStaffAccess
                        ? 'Crea un plan desde una batería SFT o regístralo manualmente.'
                        : 'No hay un plan de ejercicios asignado aún.'}
                </Text>
            </View>
        );
    }

    const completedIndices = new Set<number>();
    const skippedIndices = new Set<number>();
    exerciseRecords.forEach((record) => {
        if (record.estado === 'completado') {
            const exercise = plan.exercises.find((ex) => ex.id_ejercicio_plan === record.idEjercicioPlan);
            if (exercise) completedIndices.add(exercise.index);
        } else if (record.estado === 'omitido') {
            const exercise = plan.exercises.find((ex) => ex.id_ejercicio_plan === record.idEjercicioPlan);
            if (exercise) skippedIndices.add(exercise.index);
        }
    });

    const todayExercises = plan.exercises.filter((ex) => ex.frequency === todayKey);
    const todayCompleted = todayExercises.filter((ex) => completedIndices.has(ex.index)).length;
    const todayTotal = todayExercises.length;

    const handleExercisePress = (exercise: Exercise) => {
        if (exercise.frequency === todayKey) {
            router.push(`/(app)/patients/${patientId}/exercise/${exercise.id_ejercicio_plan}/active` as never);
        } else {
            router.push(`/(app)/patients/${patientId}/exercise/${exercise.id_ejercicio_plan}/detail` as never);
        }
    };

    const displayText = plan.resumen || plan.summary;

    return (
        <View style={styles.container}>
            {/* Header del plan - patrón infoRow */}
            <AppCard style={styles.headerCard}>
                <View style={styles.headerRow}>
                    <View style={[styles.iconContainer, { backgroundColor: theme.colors.primaryContainer }]}>
                        <MaterialCommunityIcons name="dumbbell" size={20} color={theme.colors.primary} />
                    </View>
                    <View style={styles.headerText}>
                        <Text style={styles.planTitle}>{plan.titulo}</Text>
                        <Text style={styles.planDate}>{format(new Date(plan.generated_at), "dd MMM yyyy", { locale: es })}</Text>
                    </View>
                    {hasStaffAccess && onEdit && (
                        <IconButton
                            icon="pencil-outline"
                            size={20}
                            iconColor={theme.colors.onSurfaceVariant}
                            onPress={onEdit}
                            accessibilityLabel="Editar plan de ejercicios"
                        />
                    )}
                </View>
                {displayText ? (
                    <Text style={styles.summaryText} numberOfLines={3}>{displayText}</Text>
                ) : null}
            </AppCard>

            {/* Ejercicio de hoy */}
            {todayExercises.length > 0 && (
                <>
                    <Text style={styles.sectionLabel}>Ejercicio de hoy</Text>
                    <View style={styles.todayRow}>
                        <View style={[styles.todayBadge, { backgroundColor: todayCompleted === todayTotal && todayTotal > 0 ? '#e8f5e9' : theme.colors.primaryContainer }]}>
                            <Text style={[styles.todayBadgeText, { color: todayCompleted === todayTotal && todayTotal > 0 ? '#2e7d32' : theme.colors.primary }]}>
                                {todayCompleted}/{todayTotal}
                            </Text>
                        </View>
                        <Text style={styles.todayLabel}>
                            {todayCompleted === todayTotal && todayTotal > 0
                                ? '¡Completados!'
                                : `${todayCompleted} de ${todayTotal} completados`}
                        </Text>
                    </View>
                    {todayExercises.map((exercise) => (
                        <TodayExerciseCard
                            key={exercise.index}
                            exercise={exercise}
                            status={
                                completedIndices.has(exercise.index) ? 'completed'
                                    : skippedIndices.has(exercise.index) ? 'skipped'
                                        : 'pending'
                            }
                            onPress={() => handleExercisePress(exercise)}
                        />
                    ))}
                </>
            )}

            {/* Plan completo - scroll horizontal */}
            <Text style={styles.sectionLabel}>Plan de la semana</Text>
            <ScrollView
                horizontal
                pagingEnabled={false}
                showsHorizontalScrollIndicator={false}
                snapToInterval={dayCardWidth + 8}
                decelerationRate="fast"
                contentContainerStyle={styles.horizontalScrollContent}
            >
                {DAY_ORDER.map((dayKey) => {
                    const dayExercises = plan.exercises.filter((ex) => ex.frequency === dayKey);
                    if (dayExercises.length === 0) return null;

                    const allCompleted = dayExercises.every((ex) => completedIndices.has(ex.index));
                    const someCompleted = dayExercises.some((ex) => completedIndices.has(ex.index));
                    const isToday = dayKey === todayKey;

                    return (
                        <View
                            key={dayKey}
                            style={[
                                styles.dayCard,
                                { width: dayCardWidth },
                                isToday && { borderColor: theme.colors.primary, borderWidth: 2 },
                            ]}
                        >
                            <View style={styles.dayCardHeader}>
                                <View style={styles.dayCardHeaderLeft}>
                                    {allCompleted ? (
                                        <MaterialCommunityIcons name="check-circle" size={16} color="#2e7d32" />
                                    ) : someCompleted ? (
                                        <MaterialCommunityIcons name="minus-circle" size={16} color={theme.colors.primary} />
                                    ) : (
                                        <MaterialCommunityIcons name="circle-outline" size={16} color="#94a3b8" />
                                    )}
                                    <Text style={[styles.dayCardTitle, isToday && { color: theme.colors.primary }]}>
                                        {DAY_LABELS[dayKey]}
                                    </Text>
                                    {isToday && (
                                        <View style={[styles.todayTag, { backgroundColor: theme.colors.primaryContainer }]}>
                                            <Text style={[styles.todayTagText, { color: theme.colors.primary }]}>Hoy</Text>
                                        </View>
                                    )}
                                </View>
                                <Text style={styles.dayCardCount}>
                                    {dayExercises.filter((ex) => completedIndices.has(ex.index)).length}/{dayExercises.length}
                                </Text>
                            </View>

                            {dayExercises.map((exercise) => {
                                const isCompleted = completedIndices.has(exercise.index);
                                const isSkipped = skippedIndices.has(exercise.index);
                                return (
                                    <View key={exercise.index} style={styles.dayExerciseRow}>
                                        <MaterialCommunityIcons
                                            name={isCompleted ? 'check-circle' : isSkipped ? 'close-circle' : 'circle-outline'}
                                            size={14}
                                            color={isCompleted ? '#2e7d32' : isSkipped ? '#c62828' : '#94a3b8'}
                                        />
                                        <Text
                                            style={[styles.dayExerciseName, isCompleted && styles.dayExerciseCompleted]}
                                            numberOfLines={1}
                                        >
                                            {exercise.name}
                                        </Text>
                                    </View>
                                );
                            })}
                        </View>
                    );
                })}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {},
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: 24,
        paddingHorizontal: 16,
    },
    emptyTitle: {
        fontFamily: 'Montserrat_600SemiBold',
        fontSize: 15,
        color: '#6b7280',
        marginTop: 12,
    },
    emptyText: {
        fontFamily: 'Montserrat_400Regular',
        fontSize: 13,
        color: '#9ca3af',
        textAlign: 'center',
        marginTop: 4,
        lineHeight: 18,
    },
    headerCard: {
        marginBottom: 12,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerText: {
        flex: 1,
    },
    planTitle: {
        fontFamily: 'Montserrat_600SemiBold',
        fontSize: 15,
        color: '#1f2937',
    },
    planDate: {
        fontFamily: 'Montserrat_400Regular',
        fontSize: 12,
        color: '#6b7280',
        marginTop: 1,
    },
    summaryText: {
        fontFamily: 'Montserrat_400Regular',
        fontSize: 13,
        color: '#374151',
        lineHeight: 18,
        marginTop: 10,
        fontStyle: 'italic',
    },
    sectionLabel: {
        fontFamily: 'Montserrat_600SemiBold',
        fontSize: 12,
        letterSpacing: 0.5,
        color: '#6b7280',
        textTransform: 'uppercase',
        marginTop: 4,
        marginBottom: 8,
        marginLeft: 4,
    },
    todayRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    todayBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    todayBadgeText: {
        fontFamily: 'Montserrat_700Bold',
        fontSize: 13,
    },
    todayLabel: {
        fontFamily: 'Montserrat_500Medium',
        fontSize: 13,
        color: '#374151',
    },
    horizontalScrollContent: {
        paddingLeft: 4,
        paddingRight: 16,
        gap: 8,
    },
    dayCard: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    dayCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    dayCardHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    dayCardTitle: {
        fontFamily: 'Montserrat_600SemiBold',
        fontSize: 13,
        color: '#1f2937',
    },
    dayCardCount: {
        fontFamily: 'Montserrat_500Medium',
        fontSize: 11,
        color: '#6b7280',
    },
    todayTag: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    todayTagText: {
        fontFamily: 'Montserrat_600SemiBold',
        fontSize: 9,
    },
    dayExerciseRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 5,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    dayExerciseName: {
        fontFamily: 'Montserrat_500Medium',
        fontSize: 12,
        color: '#1f2937',
        flex: 1,
    },
    dayExerciseCompleted: {
        color: '#2e7d32',
    },
});
