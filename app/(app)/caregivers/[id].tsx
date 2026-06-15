import { PatientCard } from '@/src/components/patients/PatientCard';
import { CaregiverStats } from '@/src/components/caregivers/CaregiverStats';
import { AppCard } from '@/src/components/ui/AppCard';
import { AppLoader } from '@/src/components/ui/AppLoader';
import { AppSnackbar } from '@/src/components/ui/AppSnackbar';
import { usePatientsStore } from '@/src/stores/patientsStore';
import { fetchBatteryCountsForPatients, fetchActivePlanStatus, fetchWeeklyExerciseDataForPatients } from '@/src/services/batteryService';
import { fetchPatientThumbnails } from '@/src/services/patientService';
import { fetchCaregiverDetail, mapCaregiverPatientToPatient, type CaregiverDetail } from '@/src/services/caregiverService';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Linking, StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import type { WeeklyExerciseData } from '@/src/services/batteryService';

function getInitials(name: string): string {
    return name
        .split(' ')
        .filter(Boolean)
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
}

/**
 * Caregiver detail screen: header card + stats + PatientCard list for assigned patients.
 */
export default function CaregiverDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const theme = useTheme();
    const router = useRouter();
    const setPhotoThumbnails = usePatientsStore((s) => s.setPhotoThumbnails);

    const [caregiver, setCaregiver] = useState<CaregiverDetail | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activePlanMap, setActivePlanMap] = useState<Record<string, boolean>>({});
    const [batteryCounts, setBatteryCounts] = useState<Record<string, number>>({});
    const [exerciseData, setExerciseData] = useState<Record<string, WeeklyExerciseData>>({});
    const [snackbar, setSnackbar] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' });

    const load = useCallback(async () => {
        if (!id) return;
        setIsLoading(true);
        try {
            const data = await fetchCaregiverDetail(id);
            setCaregiver(data);

            if (data.pacientes.length > 0) {
                const patientIds = data.pacientes.map((p) => p.id);
                const [counts, plans, weeklyData, thumbnails] = await Promise.all([
                    fetchBatteryCountsForPatients(patientIds),
                    fetchActivePlanStatus(patientIds),
                    fetchWeeklyExerciseDataForPatients(patientIds),
                    fetchPatientThumbnails(),
                ]);
                setBatteryCounts(counts);
                setActivePlanMap(plans);
                setExerciseData(weeklyData);
                setPhotoThumbnails(thumbnails);
            }
        } catch (error) {
            setSnackbar({
                visible: true,
                message: error instanceof Error ? error.message : 'Error cargando cuidador',
                type: 'error',
            });
        } finally {
            setIsLoading(false);
        }
    }, [id, setPhotoThumbnails]);

    useEffect(() => {
        void load();
    }, [load]);

    if (isLoading) return <AppLoader />;

    if (!caregiver) {
        return (
            <View style={styles.center}>
                <MaterialCommunityIcons name="account-off" size={42} color="#6b7280" />
                <Text style={styles.empty}>Cuidador no encontrado.</Text>
            </View>
        );
    }

    const initials = getInitials(caregiver.fullName);

    return (
        <View style={styles.container}>
            <FlatList
                data={caregiver.pacientes}
                keyExtractor={(item) => item.id}
                ListHeaderComponent={
                    <>
                        <AppCard style={styles.headerCard}>
                            <View style={styles.headerRow}>
                                <View style={[styles.avatar, { backgroundColor: theme.colors.primaryContainer }]}>
                                    <Text style={[styles.avatarText, { color: theme.colors.onPrimaryContainer }]}>
                                        {initials || '?'}
                                    </Text>
                                </View>
                                <View style={styles.headerInfo}>
                                    <Text style={styles.fullName}>{caregiver.fullName}</Text>
                                    <Text style={styles.email}>{caregiver.correo}</Text>
                                </View>
                            </View>

                            <View style={styles.divider} />

                            {caregiver.telefono && (
                                <View style={styles.detailRow}>
                                    <MaterialCommunityIcons name="phone" size={18} color="#6b7280" />
                                    <Text
                                        style={styles.detailValueLink}
                                        onPress={() => Linking.openURL(`tel:${caregiver.telefono}`)}
                                    >
                                        {caregiver.telefono}
                                    </Text>
                                </View>
                            )}
                            {caregiver.ciudad && (
                                <View style={styles.detailRow}>
                                    <MaterialCommunityIcons name="map-marker" size={18} color="#6b7280" />
                                    <Text style={styles.detailValue}>{caregiver.ciudad}</Text>
                                </View>
                            )}
                            {caregiver.creadoEn && (
                                <View style={styles.detailRow}>
                                    <MaterialCommunityIcons name="calendar-plus" size={18} color="#6b7280" />
                                    <Text style={styles.detailValue}>
                                        Creado: {format(new Date(caregiver.creadoEn), 'dd MMM yyyy', { locale: es })}
                                    </Text>
                                </View>
                            )}
                            {caregiver.ultimoAccesoEn && (
                                <View style={styles.detailRow}>
                                    <MaterialCommunityIcons name="clock-outline" size={18} color="#6b7280" />
                                    <Text style={styles.detailValue}>
                                        Último acceso: {format(new Date(caregiver.ultimoAccesoEn), 'dd MMM yyyy', { locale: es })}
                                    </Text>
                                </View>
                            )}
                        </AppCard>

                        <AppCard style={styles.statsCard}>
                            <CaregiverStats
                                cantidadPacientes={caregiver.cantidadPacientes}
                                pacientesConPlanActivo={caregiver.pacientesConPlanActivo}
                                cumplimientoSemanalPromedio={caregiver.cumplimientoSemanalPromedio}
                            />
                        </AppCard>

                        <Text style={styles.sectionTitle}>
                            Adultos mayores asignados ({caregiver.pacientes.length})
                        </Text>

                        {caregiver.pacientes.length === 0 && (
                            <View style={styles.emptyPatients}>
                                <MaterialCommunityIcons name="account-off-outline" size={32} color="#6b7280" />
                                <Text style={styles.emptyPatientsText}>
                                    Este cuidador no tiene adultos mayores asignados.
                                </Text>
                            </View>
                        )}
                    </>
                }
                renderItem={({ item }) => {
                    const patient = mapCaregiverPatientToPatient(item);
                    return (
                        <PatientCard
                            patient={patient}
                            batteryCount={batteryCounts[item.id]}
                            hasActivePlan={activePlanMap[item.id]}
                            weeklyExerciseData={exerciseData[item.id]}
                            onPress={() => router.push(`/(app)/patients/${item.id}` as never)}
                        />
                    );
                }}
                contentContainerStyle={styles.list}
                showsVerticalScrollIndicator={false}
            />

            <AppSnackbar
                visible={snackbar.visible}
                message={snackbar.message}
                type={snackbar.type}
                onDismiss={() => setSnackbar((s) => ({ ...s, visible: false }))}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#f8fafc' },
    empty: { fontFamily: 'Montserrat_500Medium', fontSize: 14, color: '#6b7280', marginTop: 8 },
    list: { paddingHorizontal: 16, paddingBottom: 24 },
    headerCard: { marginTop: 8 },
    headerRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    avatar: {
        width: 56, height: 56, borderRadius: 28,
        alignItems: 'center', justifyContent: 'center',
    },
    avatarText: { fontFamily: 'Montserrat_700Bold', fontSize: 22 },
    headerInfo: { flex: 1 },
    fullName: { fontFamily: 'Montserrat_700Bold', fontSize: 18, color: '#1f2937' },
    email: { fontFamily: 'Montserrat_400Regular', fontSize: 13, color: '#6b7280', marginTop: 2 },
    divider: { height: 1, backgroundColor: '#e5e7eb', marginVertical: 12 },
    detailRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
    detailValue: { fontFamily: 'Montserrat_400Regular', fontSize: 13, color: '#374151' },
    detailValueLink: { fontFamily: 'Montserrat_400Regular', fontSize: 13, color: '#006d77', textDecorationLine: 'underline' },
    statsCard: { marginTop: 8 },
    sectionTitle: {
        fontFamily: 'Montserrat_700Bold', fontSize: 16, color: '#1f2937',
        marginBottom: 8, marginTop: 16,
    },
    emptyPatients: { alignItems: 'center', paddingVertical: 24, gap: 8 },
    emptyPatientsText: {
        fontFamily: 'Montserrat_500Medium', fontSize: 14, color: '#6b7280', textAlign: 'center',
    },
});
