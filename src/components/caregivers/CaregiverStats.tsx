import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

interface CaregiverStatsProps {
    cantidadPacientes: number;
    pacientesConPlanActivo: number;
    cumplimientoSemanalPromedio: number;
}

function getComplianceColor(value: number): string {
    if (value >= 0.7) return '#2e7d32';
    if (value >= 0.4) return '#f57c00';
    return '#c62828';
}

/**
 * Stats row showing caregiver metrics: patients, plans, compliance.
 */
export function CaregiverStats({
    cantidadPacientes,
    pacientesConPlanActivo,
    cumplimientoSemanalPromedio,
}: CaregiverStatsProps) {
    const compliancePercent = Math.round(cumplimientoSemanalPromedio * 100);
    const complianceColor = getComplianceColor(cumplimientoSemanalPromedio);

    return (
        <View style={styles.container}>
            <View style={styles.statItem}>
                <MaterialCommunityIcons name="account-group" size={22} color="#006d77" />
                <Text style={styles.statNumber}>{cantidadPacientes}</Text>
                <Text style={styles.statLabel}>Adultos mayores</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.statItem}>
                <MaterialCommunityIcons name="clipboard-check" size={22} color="#006d77" />
                <Text style={styles.statNumber}>{pacientesConPlanActivo}</Text>
                <Text style={styles.statLabel}>Con plan activo</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.statItem}>
                <MaterialCommunityIcons name="chart-line" size={22} color={complianceColor} />
                <Text style={[styles.statNumber, { color: complianceColor }]}>{compliancePercent}%</Text>
                <Text style={styles.statLabel}>Cumplimiento</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        paddingVertical: 16,
        paddingHorizontal: 8,
    },
    statItem: {
        alignItems: 'center',
        gap: 4,
        flex: 1,
    },
    statNumber: {
        fontFamily: 'Montserrat_800ExtraBold',
        fontSize: 22,
        color: '#006d77',
    },
    statLabel: {
        fontFamily: 'Montserrat_500Medium',
        fontSize: 11,
        color: '#6b7280',
        textAlign: 'center',
    },
    divider: {
        width: 1,
        height: 48,
        backgroundColor: '#e5e7eb',
    },
});
