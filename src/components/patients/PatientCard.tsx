import { AppCard } from '@/src/components/ui/AppCard';
import { PatientAvatar } from '@/src/components/ui/PatientAvatar';
import { usePatientsStore } from '@/src/stores/patientsStore';
import type { Patient } from '@/src/types/patient.types';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { differenceInYears } from 'date-fns';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

interface PatientCardProps {
    patient: Patient;
    lastBatteryDate?: string;
    batteryCount?: number;
    onPress: () => void;
}

/**
 * Adulto mayor card showing photo placeholder, name, age, gender,
 * and last battery date.
 */
export function PatientCard({ patient, lastBatteryDate, batteryCount, onPress }: PatientCardProps) {
    const theme = useTheme();
    const photoThumbnails = usePatientsStore((s) => s.photoThumbnails);
    const age = differenceInYears(new Date(), new Date(patient.birth_date));
    const fullName = [patient.first_name, patient.second_name, patient.first_lastname, patient.second_lastname]
        .filter(Boolean)
        .join(' ');
    const genderLabel = patient.gender === 'male' ? 'Masculino' : patient.gender === 'female' ? 'Femenino' : 'Otro';
    const photoData = photoThumbnails[patient.id] ?? patient.photo_data ?? null;

    return (
        <AppCard onPress={onPress} accessibilityLabel={`Adulto mayor ${fullName}`}>
            <View style={styles.row}>
                <PatientAvatar
                    photoData={photoData}
                    firstName={patient.first_name}
                    firstLastname={patient.first_lastname}
                    size={48}
                />
                <View style={styles.info}>
                    <Text style={styles.name} numberOfLines={1}>{fullName}</Text>
                    <View style={styles.detailRow}>
                        <MaterialCommunityIcons
                            name={patient.gender === 'male' ? 'gender-male' : patient.gender === 'female' ? 'gender-female' : 'gender-non-binary'}
                            size={14}
                            color={theme.colors.onSurfaceVariant}
                        />
                        <Text style={styles.detail}>{genderLabel} · {age} años</Text>
                    </View>
                    <View style={styles.detailRow}>
                        <MaterialCommunityIcons name="clipboard-text-outline" size={14} color={theme.colors.onSurfaceVariant} />
                        <Text style={styles.detail}>
                            {batteryCount != null && batteryCount > 0
                                ? `${batteryCount} batería${batteryCount !== 1 ? 's' : ''}`
                                : 'Sin baterías aún'}
                        </Text>
                    </View>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={24} color={theme.colors.outline} />
            </View>
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
    name: {
        fontFamily: 'Montserrat_600SemiBold',
        fontSize: 15,
        color: '#1f2937',
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
});
