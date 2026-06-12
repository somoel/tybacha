import { AppCard } from '@/src/components/ui/AppCard';
import type { ExercisePlan } from '@/src/types/exercise.types';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

interface ActivePlanCardProps {
    plan: ExercisePlan;
    onPress?: () => void;
}

export function ActivePlanCard({ plan, onPress }: ActivePlanCardProps) {
    const theme = useTheme();

    return (
        <AppCard style={styles.card} onPress={onPress}>
            <View style={styles.header}>
                <View style={[styles.iconContainer, { backgroundColor: theme.colors.primaryContainer }]}>
                    <MaterialCommunityIcons
                        name="dumbbell"
                        size={22}
                        color={theme.colors.primary}
                    />
                </View>
                <View style={styles.headerText}>
                    <Text style={styles.title}>Plan de ejercicios activo</Text>
                    <Text style={styles.exerciseCount}>
                        {plan.exercises.length} ejercicios
                    </Text>
                </View>
                <MaterialCommunityIcons
                    name="chevron-right"
                    size={24}
                    color={theme.colors.outline}
                />
            </View>

            {plan.summary ? (
                <Text style={styles.summary} numberOfLines={2}>
                    {plan.summary}
                </Text>
            ) : null}
        </AppCard>
    );
}

const styles = StyleSheet.create({
    card: {
        marginTop: 24,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerText: {
        flex: 1,
    },
    title: {
        fontFamily: 'Montserrat_700Bold',
        fontSize: 15,
        color: '#1f2937',
    },
    exerciseCount: {
        fontFamily: 'Montserrat_400Regular',
        fontSize: 12,
        color: '#6b7280',
        marginTop: 1,
    },
    summary: {
        fontFamily: 'Montserrat_400Regular',
        fontSize: 13,
        color: '#374151',
        lineHeight: 18,
        marginTop: 10,
        fontStyle: 'italic',
    },
});
