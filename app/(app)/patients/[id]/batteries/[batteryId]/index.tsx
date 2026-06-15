import { ResultChart } from '@/src/components/results/ResultChart';
import { AppButton } from '@/src/components/ui/AppButton';
import { AppCard } from '@/src/components/ui/AppCard';
import { BatteryDetailSkeleton } from '@/src/components/ui/PatientDetailSkeletons';
import { exportBatteryXlsx } from '@/src/api/reportsApi';
import { fetchBatteryWithResults } from '@/src/services/batteryService';
import { fetchPatientById } from '@/src/services/patientService';
import { usePermissions } from '@/src/hooks/usePermissions';
import type { BatteryWithResults } from '@/src/types/battery.types';
import type { Patient } from '@/src/types/database.types';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Stack, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

function getImcColor(imc: number): string {
    if (imc < 18.5) return '#3b82f6';
    if (imc < 25) return '#22c55e';
    if (imc < 30) return '#f59e0b';
    return '#ef4444';
}

export default function BatteryDetailScreen() {
    const { id: patientId, batteryId } = useLocalSearchParams<{ id: string; batteryId: string }>();
    const [battery, setBattery] = useState<BatteryWithResults | null>(null);
    const [patient, setPatient] = useState<Patient | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isExporting, setIsExporting] = useState(false);
    const { isAdmin, isProfessional } = usePermissions();
    const hasStaffAccess = isAdmin || isProfessional;

    useEffect(() => {
        const load = async () => {
            if (!batteryId) return;
            try {
                const [batteryData, patientData] = await Promise.all([
                    fetchBatteryWithResults(batteryId),
                    patientId ? fetchPatientById(patientId) : null,
                ]);
                setBattery(batteryData);
                setPatient(patientData);
            } catch (error) {
                console.error('Error:', error);
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, [batteryId, patientId]);

    const handleExportXlsx = useCallback(async () => {
        if (!batteryId) return;
        setIsExporting(true);
        try {
            const blob = await exportBatteryXlsx(Number(batteryId));
            const url = URL.createObjectURL(blob);
            if (Platform.OS === 'web') {
                const a = document.createElement('a');
                a.href = url;
                a.download = `bateria-sft-${batteryId}.xlsx`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            }
            URL.revokeObjectURL(url);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Error al exportar';
            Alert.alert('Error', message);
        } finally {
            setIsExporting(false);
        }
    }, [batteryId]);

    if (isLoading) return <BatteryDetailSkeleton />;
    if (!battery) return <BatteryDetailSkeleton />;

    return (
        <>
            <Stack.Screen
                options={{
                    title: 'Batería SFT',
                    headerRight: () => (
                        hasStaffAccess ? (
                            <AppButton
                                label={isExporting ? 'Exportando...' : 'Exportar'}
                                icon="file-excel"
                                variant="text"
                                onPress={handleExportXlsx}
                                disabled={isExporting}
                                loading={isExporting}
                                accessibilityLabel="Exportar batería a archivo Excel"
                            />
                        ) : undefined
                    ),
                }}
            />

            <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
                {/* Header card: fecha + métricas + notes */}
                <AppCard style={styles.headerCard}>
                    <Text style={styles.date}>
                        {format(new Date(battery.performed_at), "dd 'de' MMMM yyyy, HH:mm", { locale: es })}
                    </Text>

                    {battery.notes && <Text style={styles.notes}>{battery.notes}</Text>}

                    {battery.peso_kg && battery.estatura_cm && battery.imc && (
                        <View style={styles.metricsRow}>
                            <View style={styles.metricChip}>
                                <MaterialCommunityIcons name="scale-bathroom" size={14} color="#6b7280" />
                                <Text style={styles.metricLabel}>Peso</Text>
                                <Text style={styles.metricValue}>{battery.peso_kg} kg</Text>
                            </View>
                            <View style={styles.metricChip}>
                                <MaterialCommunityIcons name="human-male-height" size={14} color="#6b7280" />
                                <Text style={styles.metricLabel}>Estatura</Text>
                                <Text style={styles.metricValue}>{battery.estatura_cm} cm</Text>
                            </View>
                            <View style={styles.metricChip}>
                                <MaterialCommunityIcons name="heart-pulse" size={14} color={getImcColor(battery.imc)} />
                                <Text style={styles.metricLabel}>IMC</Text>
                                <Text style={[styles.metricValue, { color: getImcColor(battery.imc) }]}>{battery.imc}</Text>
                            </View>
                        </View>
                    )}
                </AppCard>

                {/* ResultChart */}
                {battery.results.length > 0 && (
                    <AppCard style={styles.chartCard}>
                        <ResultChart
                            results={battery.results}
                            patientGender={patient?.gender === 'M' ? 'M' : patient?.gender === 'F' ? 'F' : undefined}
                            patientBirthDate={patient?.birth_date}
                        />
                    </AppCard>
                )}
            </ScrollView>
        </>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc', padding: 16 },
    headerCard: { marginBottom: 12 },
    chartCard: { marginBottom: 8 },
    date: { fontFamily: 'Montserrat_700Bold', fontSize: 15, color: '#1f2937' },
    notes: { fontFamily: 'Montserrat_400Regular', fontSize: 13, color: '#374151', marginTop: 8, fontStyle: 'italic' },
    metricsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
    },
    metricChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: '#f3f4f6',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
    },
    metricLabel: { fontFamily: 'Montserrat_500Medium', fontSize: 11, color: '#6b7280' },
    metricValue: { fontFamily: 'Montserrat_700Bold', fontSize: 12, color: '#1f2937' },
});
