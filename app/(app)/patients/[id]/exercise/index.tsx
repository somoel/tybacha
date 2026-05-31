import { ExerciseDayGroup } from '@/src/components/exercises/ExerciseDayGroup';
import { WeeklyProgressCard } from '@/src/components/exercises/WeeklyProgressCard';
import { AppLoader } from '@/src/components/ui/AppLoader';
import { fetchApiExerciseRecords } from '@/src/api/trackingApi';
import { fetchExercisePlans } from '@/src/services/exercisePlanService';
import { fetchPatientById } from '@/src/services/patientService';
import type { Exercise, ExercisePlan } from '@/src/types/exercise.types';
import type { Patient } from '@/src/types/patient.types';
import type { ApiExerciseRecord } from '@/src/types/apiTracking.types';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

const DAY_KEYS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'];

function getTodayKey(): string {
    const day = new Date().getDay();
    const map = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    return map[day];
}

function getWeekRange(): { from: string; to: string } {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(now);
    monday.setDate(now.getDate() + mondayOffset);
    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4);
    return {
        from: monday.toISOString().slice(0, 10),
        to: friday.toISOString().slice(0, 10),
    };
}

export default function WeeklySummaryScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();

    const [patient, setPatient] = useState<Patient | null>(null);
    const [activePlan, setActivePlan] = useState<ExercisePlan | null>(null);
    const [exerciseRecords, setExerciseRecords] = useState<ApiExerciseRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useFocusEffect(useCallback(() => {
        let isActive = true;
        const load = async () => {
            if (!id) return;
            setIsLoading(true);
            try {
                const [p, plans] = await Promise.all([
                    fetchPatientById(id),
                    fetchExercisePlans(id),
                ]);
                if (!isActive) return;
                setPatient(p);

                const active = plans.find((pl) => pl.status === 'active');
                setActivePlan(active ?? null);

                if (active) {
                    const weekRange = getWeekRange();
                    try {
                        const records = await fetchApiExerciseRecords(Number(id), weekRange.from, weekRange.to);
                        if (isActive) setExerciseRecords(records);
                    } catch {
                        // silent
                    }
                }
            } catch (error) {
                console.error('Error cargando plan semanal:', error);
            } finally {
                if (isActive) setIsLoading(false);
            }
        };
        load();
        return () => { isActive = false; };
    }, [id]));

    if (isLoading) return <AppLoader message="Cargando plan semanal..." />;
    if (!patient) return <AppLoader message="Adulto mayor no encontrado" />;

    if (!activePlan) {
        return (
            <View style={styles.centered}>
                <Text style={styles.emptyTitle}>Sin plan activo</Text>
                <Text style={styles.emptyText}>No hay un plan de ejercicios activo para este paciente.</Text>
            </View>
        );
    }

    const todayKey = getTodayKey();

    const completedIndices = new Set<number>();
    const exerciseResultsMap: Record<number, { reps?: number; duration?: number }> = {};
    exerciseRecords.forEach((record) => {
        if (record.estado === 'completado') {
            const exercise = activePlan.exercises.find(
                (ex) => ex.id_ejercicio_plan === record.idEjercicioPlan
            );
            if (exercise) {
                completedIndices.add(exercise.index);
                exerciseResultsMap[exercise.index] = {
                    reps: record.repeticionesRealizadas ?? undefined,
                    duration: record.duracionRealSegundos ?? undefined,
                };
            }
        }
    });

    const handleExercisePress = (exercise: Exercise) => {
        router.push(`/(app)/patients/${id}/exercise/${exercise.id_ejercicio_plan}/active` as never);
    };

    return (
        <ScrollView style={styles.container} contentInsetAdjustmentBehavior="automatic" showsVerticalScrollIndicator={false}>
            <WeeklyProgressCard
                exercises={activePlan.exercises}
                completedIndices={completedIndices}
                todayKey={todayKey}
            />

            {DAY_KEYS.map((dayKey) => {
                const dayExercises = activePlan.exercises.filter((ex) => ex.frequency === dayKey);
                if (dayExercises.length === 0) return null;
                return (
                    <ExerciseDayGroup
                        key={dayKey}
                        dayKey={dayKey}
                        exercises={dayExercises}
                        completedIndices={completedIndices}
                        exerciseResults={exerciseResultsMap}
                        isToday={dayKey === todayKey}
                        onExercisePress={handleExercisePress}
                    />
                );
            })}

            <View style={styles.bottomPadding} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc', paddingHorizontal: 16 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
    emptyTitle: { fontFamily: 'Montserrat_700Bold', fontSize: 18, color: '#1f2937', marginBottom: 8 },
    emptyText: { fontFamily: 'Montserrat_400Regular', fontSize: 14, color: '#6b7280', textAlign: 'center' },
    bottomPadding: { height: 32 },
});
