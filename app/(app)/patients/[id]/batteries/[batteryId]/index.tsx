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
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useLocalSearchParams } from 'expo-router';
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
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            <AppCard style={styles.headerCard}>
                <Text style={styles.date}>
                    {format(new Date(battery.performed_at), "dd 'de' MMMM yyyy, HH:mm", { locale: es })}
                </Text>
                <Text style={styles.testCount}>{battery.results.length} pruebas registradas</Text>
                {battery.notes && <Text style={styles.notes}>{battery.notes}</Text>}

                {battery.peso_kg && battery.estatura_cm && battery.imc && (
                    <View style={styles.bodyMetricsContainer}>
                        <View style={styles.bodyMetric}>
                            <Text style={styles.bodyMetricLabel}>Peso</Text>
                            <Text style={styles.bodyMetricValue}>{battery.peso_kg} kg</Text>
                        </View>
                        <View style={styles.bodyMetricDivider} />
                        <View style={styles.bodyMetric}>
                            <Text style={styles.bodyMetricLabel}>Estatura</Text>
                            <Text style={styles.bodyMetricValue}>{battery.estatura_cm} cm</Text>
                        </View>
                        <View style={styles.bodyMetricDivider} />
                        <View style={styles.bodyMetric}>
                            <Text style={styles.bodyMetricLabel}>IMC</Text>
                            <Text style={[styles.bodyMetricValue, { color: getImcColor(battery.imc) }]}>
                                {battery.imc}
                            </Text>
                        </View>
                    </View>
                )}
            </AppCard>

            {hasStaffAccess && (
                <AppButton
                    label={isExporting ? 'Exportando...' : 'Exportar XLSX'}
                    variant="outlined"
                    icon="file-excel"
                    onPress={handleExportXlsx}
                    disabled={isExporting}
                    style={styles.exportButton}
                    accessibilityLabel="Exportar batería a archivo Excel"
                />
            )}

            {battery.results.length > 0 && (
                <AppCard>
                    <ResultChart
                        results={battery.results}
                        patientGender={patient?.gender === 'M' ? 'M' : patient?.gender === 'F' ? 'F' : undefined}
                        patientBirthDate={patient?.birth_date}
                    />
                </AppCard>
            )}

            <View style={styles.bottomPadding} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc', padding: 16 },
    headerCard: { marginBottom: 16 },
    date: { fontFamily: 'Montserrat_700Bold', fontSize: 16, color: '#1f2937' },
    testCount: { fontFamily: 'Montserrat_400Regular', fontSize: 13, color: '#6b7280', marginTop: 2 },
    notes: { fontFamily: 'Montserrat_400Regular', fontSize: 13, color: '#374151', marginTop: 6, fontStyle: 'italic' },
    bodyMetricsContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#e5e7eb' },
    bodyMetric: { alignItems: 'center', flex: 1 },
    bodyMetricLabel: { fontFamily: 'Montserrat_600SemiBold', fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 },
    bodyMetricValue: { fontFamily: 'Montserrat_800ExtraBold', fontSize: 18, color: '#1f2937', marginTop: 2 },
    bodyMetricDivider: { width: 1, height: 32, backgroundColor: '#e5e7eb' },
    exportButton: { marginBottom: 16 },
    bottomPadding: { height: 32 },
});
