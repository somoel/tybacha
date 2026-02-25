import type { Patient, SectionedPatients } from '@/src/types/patient.types';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { SectionList, StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { PatientCard } from './PatientCard';

interface PatientSectionListProps {
    sections: SectionedPatients;
    onPatientPress: (patient: Patient) => void;
    lastBatteryDates?: Record<string, string>;
}

interface SectionData {
    title: string;
    icon: string;
    color: string;
    data: Patient[];
}

/**
 * RF-10: Sectioned patient list for professionals.
 * - Sin baterías realizadas
 * - Pendiente por recomendar ejercicio
 * - En ejecución de plan de ejercicio
 */
export function PatientSectionList({
    sections,
    onPatientPress,
    lastBatteryDates,
}: PatientSectionListProps) {
    const theme = useTheme();

    const sectionData: SectionData[] = [
        {
            title: 'Sin baterías realizadas',
            icon: 'alert-outline',
            color: theme.colors.tertiary,
            data: sections.noBatteries,
        },
        {
            title: 'Pendiente por recomendar ejercicio',
            icon: 'clock-outline',
            color: theme.colors.secondary,
            data: sections.pendingRecommendation,
        },
        {
            title: 'En ejecución de plan de ejercicio',
            icon: 'check-circle-outline',
            color: theme.colors.primary,
            data: sections.inProgress,
        },
    ].filter((s) => s.data.length > 0);

    return (
        <SectionList
            sections={sectionData}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
                <View style={styles.itemContainer}>
                    <PatientCard
                        patient={item}
                        lastBatteryDate={lastBatteryDates?.[item.id]}
                        onPress={() => onPatientPress(item)}
                    />
                </View>
            )}
            renderSectionHeader={({ section }) => (
                <View style={styles.sectionHeader}>
                    <MaterialCommunityIcons
                        name={section.icon as keyof typeof MaterialCommunityIcons.glyphMap}
                        size={20}
                        color={section.color}
                    />
                    <Text style={[styles.sectionTitle, { color: section.color }]}>
                        {section.title}
                    </Text>
                    <View style={[styles.badge, { backgroundColor: section.color + '20' }]}>
                        <Text style={[styles.badgeText, { color: section.color }]}>
                            {section.data.length}
                        </Text>
                    </View>
                </View>
            )}
            stickySectionHeadersEnabled={false}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
        />
    );
}

const styles = StyleSheet.create({
    list: {
        paddingHorizontal: 16,
        paddingBottom: 24,
    },
    itemContainer: {
        marginHorizontal: 0,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingTop: 20,
        paddingBottom: 8,
        paddingHorizontal: 4,
    },
    sectionTitle: {
        fontFamily: 'Montserrat_700Bold',
        fontSize: 16,
        flex: 1,
    },
    badge: {
        borderRadius: 12,
        paddingHorizontal: 8,
        paddingVertical: 2,
    },
    badgeText: {
        fontFamily: 'Montserrat_600SemiBold',
        fontSize: 12,
    },
});
