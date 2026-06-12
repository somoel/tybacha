import { AppCard } from '@/src/components/ui/AppCard';
import { PatientAvatar } from '@/src/components/ui/PatientAvatar';
import { StatusBadge } from '@/src/components/ui/StatusBadge';
import { usePatientsStore } from '@/src/stores/patientsStore';
import type { Patient } from '@/src/types/patient.types';
import type { WeeklyExerciseData } from '@/src/services/batteryService';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { differenceInYears, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Checkbox, Text, useTheme } from 'react-native-paper';

interface PatientCardProps {
    patient: Patient;
    lastBatteryDate?: string;
    batteryCount?: number;
    hasActivePlan?: boolean;
    weeklyExerciseData?: WeeklyExerciseData;
    showQuickActions?: boolean;
    showStatusBadge?: boolean;
    selectionMode?: boolean;
    selected?: boolean;
    onExercisePress?: () => void;
    onPress: () => void;
    onToggleSelect?: () => void;
}

function getStatusFromToday(completed: number, total: number): 'healthy' | 'warning' | 'urgent' | 'neutral' {
    if (total === 0) return 'neutral';
    if (completed === total) return 'healthy';
    if (completed > 0) return 'warning';
    return 'urgent';
}

function getTodayLabel(completed: number, total: number): string {
    if (total === 0) return 'Sin ejercicios';
    if (completed === total) return 'Bien';
    if (completed > 0) return 'En progreso';
    const pending = total - completed;
    return `Pendientes: ${pending} ejercicio${pending !== 1 ? 's' : ''} para hoy`;
}

/**
 * Adulto mayor card showing photo, name, age, gender,
 * exercise status, and quick action buttons for caregivers.
 */
export function PatientCard({
    patient,
    lastBatteryDate,
    batteryCount,
    hasActivePlan,
    weeklyExerciseData,
    showQuickActions = false,
    showStatusBadge = true,
    selectionMode = false,
    selected = false,
    onExercisePress,
    onPress,
    onToggleSelect,
}: PatientCardProps) {
    const theme = useTheme();
    const photoThumbnails = usePatientsStore((s) => s.photoThumbnails);
    const age = differenceInYears(new Date(), new Date(patient.birth_date));
    const fullName = [patient.first_name, patient.second_name, patient.first_lastname, patient.second_lastname]
        .filter(Boolean)
        .join(' ');
    const genderLabel = patient.gender === 'male' ? 'Masculino' : 'Femenino';
    const photoData = photoThumbnails[patient.id] ?? patient.photo_data ?? null;

    const todayCompleted = weeklyExerciseData?.todayCompleted ?? 0;
    const todayTotal = weeklyExerciseData?.todayTotal ?? 0;
    const lastExercise = weeklyExerciseData?.lastExerciseDate;

    const status = hasActivePlan ? getStatusFromToday(todayCompleted, todayTotal) : 'neutral';
    const statusLabel = hasActivePlan ? getTodayLabel(todayCompleted, todayTotal) : 'Sin plan';
    const hasBatteries = batteryCount != null && batteryCount > 0;
    const isSelectable = selectionMode && hasBatteries;

    return (
        <AppCard
            onPress={isSelectable ? onToggleSelect : selectionMode ? undefined : onPress}
            accessibilityLabel={`Adulto mayor ${fullName}`}
            style={[
                selected ? styles.selectedCard : undefined,
                selectionMode && !hasBatteries ? styles.disabledCard : undefined,
            ]}
        >
            <View style={styles.row}>
                {selectionMode && (
                    <Checkbox
                        status={selected ? 'checked' : hasBatteries ? 'unchecked' : 'indeterminate'}
                        onPress={hasBatteries ? onToggleSelect : undefined}
                        color="#006d77"
                        disabled={!hasBatteries}
                    />
                )}
                <PatientAvatar
                    photoData={photoData}
                    firstName={patient.first_name}
                    firstLastname={patient.first_lastname}
                    size={48}
                />
                <View style={styles.info}>
                    <View style={styles.nameRow}>
                        <Text style={styles.name} numberOfLines={1}>{fullName}</Text>
                        {showStatusBadge && (
                            <StatusBadge status={status} label={statusLabel} size="small" />
                        )}
                    </View>
                    <View style={styles.detailRow}>
                        <MaterialCommunityIcons
                            name={patient.gender === 'male' ? 'gender-male' : 'gender-female'}
                            size={14}
                            color={theme.colors.onSurfaceVariant}
                        />
                        <Text style={styles.detail}>{genderLabel} · {age} años</Text>
                    </View>
                    {!hasActivePlan && (
                        <View style={styles.detailRow}>
                            <MaterialCommunityIcons name="clipboard-text-outline" size={14} color={theme.colors.onSurfaceVariant} />
                            <Text style={styles.detail}>
                                {batteryCount != null && batteryCount > 0
                                    ? `${batteryCount} batería${batteryCount !== 1 ? 's' : ''}`
                                    : 'Sin baterías aún'}
                            </Text>
                        </View>
                    )}
                    {lastExercise && (
                        <View style={styles.detailRow}>
                            <MaterialCommunityIcons name="clock-outline" size={14} color={theme.colors.onSurfaceVariant} />
                            <Text style={styles.detail}>
                                Último ejercicio: {formatDistanceToNow(new Date(lastExercise), { addSuffix: true, locale: es })}
                            </Text>
                        </View>
                    )}
                </View>
                <MaterialCommunityIcons name="chevron-right" size={24} color={theme.colors.outline} />
            </View>

            {showQuickActions && hasActivePlan && !(todayCompleted === todayTotal && todayTotal > 0) && (
                <View style={styles.actions}>
                    <Pressable
                        style={[styles.actionButton, { backgroundColor: theme.colors.primaryContainer }]}
                        onPress={onExercisePress}
                        accessibilityLabel="Ver ejercicios de hoy"
                        accessibilityRole="button"
                    >
                        <MaterialCommunityIcons name="dumbbell" size={16} color={theme.colors.onPrimaryContainer} />
                        <Text style={[styles.actionText, { color: theme.colors.onPrimaryContainer }]}>Ejercitar</Text>
                    </Pressable>
                </View>
            )}
        </AppCard>
    );
}

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    info: {
        flex: 1,
        gap: 2,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    name: {
        fontFamily: 'Montserrat_600SemiBold',
        fontSize: 15,
        color: '#1f2937',
        flexShrink: 1,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    detail: {
        fontFamily: 'Montserrat_400Regular',
        fontSize: 12,
        color: '#374151',
    },
    actions: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 10,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#f0f3f6',
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
    },
    actionText: {
        fontFamily: 'Montserrat_600SemiBold',
        fontSize: 13,
    },
    selectedCard: {
        borderColor: '#006d77',
        borderWidth: 2,
    },
    disabledCard: {
        opacity: 0.5,
    },
});
