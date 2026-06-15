import { AppCard } from '@/src/components/ui/AppCard';
import { StatusBadge } from '@/src/components/ui/StatusBadge';
import type { CaregiverSummary } from '@/src/services/caregiverService';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

interface CaregiverCardProps {
    caregiver: CaregiverSummary;
    onPress: () => void;
}

function getInitials(name: string): string {
    return name
        .split(' ')
        .filter(Boolean)
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
}

function getComplianceStatus(value: number): 'healthy' | 'warning' | 'urgent' | 'neutral' {
    if (value >= 0.7) return 'healthy';
    if (value >= 0.4) return 'warning';
    return 'urgent';
}

/**
 * Caregiver card matching PatientCard layout: avatar + info + status + chevron.
 */
export function CaregiverCard({ caregiver, onPress }: CaregiverCardProps) {
    const theme = useTheme();
    const initials = getInitials(caregiver.fullName);
    const compliancePercent = Math.round(caregiver.cumplimientoSemanalPromedio * 100);
    const status = caregiver.cantidadPacientes > 0
        ? getComplianceStatus(caregiver.cumplimientoSemanalPromedio)
        : 'neutral';
    const statusLabel = caregiver.cantidadPacientes > 0
        ? `${compliancePercent}% cumplimiento`
        : 'Sin pacientes';

    return (
        <AppCard onPress={onPress} accessibilityLabel={`Cuidador ${caregiver.fullName}`}>
            <View style={styles.row}>
                <View style={[styles.avatar, { backgroundColor: theme.colors.primaryContainer }]}>
                    <Text style={[styles.avatarText, { color: theme.colors.onPrimaryContainer }]}>
                        {initials || '?'}
                    </Text>
                </View>
                <View style={styles.info}>
                    <View style={styles.nameRow}>
                        <Text style={styles.name} numberOfLines={1}>{caregiver.fullName}</Text>
                        <StatusBadge status={status} label={statusLabel} size="small" />
                    </View>
                    <Text style={styles.detail} numberOfLines={1}>{caregiver.correo}</Text>
                    <View style={styles.detailRow}>
                        <MaterialCommunityIcons name="account-group" size={14} color={theme.colors.onSurfaceVariant} />
                        <Text style={styles.detail}>
                            {caregiver.cantidadPacientes} paciente{caregiver.cantidadPacientes !== 1 ? 's' : ''}
                            {caregiver.pacientesConPlanActivo > 0 && ` · ${caregiver.pacientesConPlanActivo} con plan`}
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
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        fontFamily: 'Montserrat_700Bold',
        fontSize: 18,
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
        marginTop: 2,
    },
    detail: {
        fontFamily: 'Montserrat_400Regular',
        fontSize: 12,
        color: '#374151',
    },
});
