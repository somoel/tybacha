import { AppButton } from '@/src/components/ui/AppButton';
import { AppCard } from '@/src/components/ui/AppCard';
import { AppLoader } from '@/src/components/ui/AppLoader';
import { usePermissions } from '@/src/hooks/usePermissions';
import { fetchBatteries } from '@/src/services/batteryService';
import { fetchExercisePlans } from '@/src/services/exercisePlanService';
import { fetchPatientById } from '@/src/services/patientService';
import { useAuthStore } from '@/src/stores/authStore';
import type { SFTBattery } from '@/src/types/battery.types';
import type { ExercisePlan } from '@/src/types/exercise.types';
import type { Patient } from '@/src/types/patient.types';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { differenceInYears, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Divider, Text, useTheme } from 'react-native-paper';

/**
 * Patient detail screen showing info, batteries, and action buttons.
 */
export default function PatientDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const theme = useTheme();
    const router = useRouter();
    const { user } = useAuthStore();
    const { isProfessional } = usePermissions();

    const [patient, setPatient] = useState<Patient | null>(null);
    const [batteries, setBatteries] = useState<SFTBattery[]>([]);
    const [plans, setPlans] = useState<ExercisePlan[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            if (!id) return;
            try {
                const [p, b, pl] = await Promise.all([
                    fetchPatientById(id),
                    fetchBatteries(id),
                    fetchExercisePlans(id),
                ]);
                setPatient(p);
                setBatteries(b);
                setPlans(pl);
            } catch (error) {
                console.error('Error cargando detalle:', error);
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, [id]);

    if (isLoading) return <AppLoader message="Cargando paciente..." />;
    if (!patient) return <AppLoader message="Paciente no encontrado" />;

    const age = differenceInYears(new Date(), new Date(patient.birth_date));
    const fullName = [patient.first_name, patient.second_name, patient.first_lastname, patient.second_lastname]
        .filter(Boolean).join(' ');
    const genderLabel = patient.gender === 'male' ? 'Masculino' : patient.gender === 'female' ? 'Femenino' : 'Otro';
    const hasActivePlan = plans.some((p) => p.status === 'active');

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            {/* Patient info card */}
            <AppCard style={styles.infoCard}>
                <View style={styles.header}>
                    <View style={[styles.avatar, { backgroundColor: theme.colors.primaryContainer }]}>
                        <Text style={[styles.initials, { color: theme.colors.onPrimaryContainer }]}>
                            {patient.first_name[0]}{patient.first_lastname[0]}
                        </Text>
                    </View>
                    <View style={styles.headerInfo}>
                        <Text style={styles.fullName}>{fullName}</Text>
                        <Text style={styles.detailText}>{genderLabel} · {age} años</Text>
                        <Text style={styles.detailText}>
                            Nacimiento: {format(new Date(patient.birth_date), 'dd MMM yyyy', { locale: es })}
                        </Text>
                    </View>
                </View>
                {patient.pathologies && (
                    <View style={styles.pathologiesContainer}>
                        <MaterialCommunityIcons name="medical-bag" size={16} color={theme.colors.secondary} />
                        <Text style={styles.pathologies}>{patient.pathologies}</Text>
                    </View>
                )}
            </AppCard>

            {/* Action buttons */}
            <View style={styles.actions}>
                <AppButton
                    label="Nueva batería SFT"
                    variant="filled"
                    icon="clipboard-plus"
                    onPress={() => router.push(`/(app)/patients/${id}/batteries/new` as never)}
                    accessibilityLabel="Crear nueva batería SFT"
                />
                <AppButton
                    label="Ver historial baterías"
                    variant="outlined"
                    icon="history"
                    onPress={() => router.push(`/(app)/patients/${id}/batteries` as never)}
                    accessibilityLabel="Ver historial de baterías"
                />
                {isProfessional && batteries.length > 0 && !hasActivePlan && (
                    <AppButton
                        label="Generar plan IA"
                        variant="filled"
                        icon="robot"
                        onPress={() => router.push(`/(app)/results` as never)}
                        accessibilityLabel="Generar plan de ejercicios con IA"
                    />
                )}
                {isProfessional && (
                    <>
                        <Divider style={styles.divider} />
                        <AppButton
                            label="Editar paciente"
                            variant="outlined"
                            icon="pencil"
                            onPress={() => router.push(`/(app)/patients/${id}/edit` as never)}
                            accessibilityLabel="Editar paciente"
                        />
                        <AppButton
                            label="Asignar cuidador"
                            variant="outlined"
                            icon="account-plus"
                            onPress={() => router.push(`/(app)/patients/${id}/assign-caregiver` as never)}
                            accessibilityLabel="Asignar cuidador"
                        />
                    </>
                )}
            </View>

            {/* Recent batteries */}
            <Text style={styles.sectionTitle}>Últimas baterías</Text>
            {batteries.length === 0 ? (
                <AppCard>
                    <Text style={styles.emptyText}>No hay baterías registradas aún.</Text>
                </AppCard>
            ) : (
                batteries.slice(0, 3).map((battery) => (
                    <AppCard
                        key={battery.id}
                        onPress={() => router.push(`/(app)/patients/${id}/batteries/${battery.id}` as never)}
                    >
                        <View style={styles.batteryRow}>
                            <MaterialCommunityIcons name="clipboard-check" size={24} color={theme.colors.primary} />
                            <View style={styles.batteryInfo}>
                                <Text style={styles.batteryDate}>
                                    {format(new Date(battery.performed_at), 'dd MMM yyyy, HH:mm', { locale: es })}
                                </Text>
                                {battery.notes && <Text style={styles.batteryNotes}>{battery.notes}</Text>}
                            </View>
                            <MaterialCommunityIcons name="chevron-right" size={20} color={theme.colors.outline} />
                        </View>
                    </AppCard>
                ))
            )}

            <View style={styles.bottomPadding} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc', paddingHorizontal: 16, paddingTop: 16 },
    infoCard: { marginBottom: 16 },
    header: { flexDirection: 'row', gap: 14, alignItems: 'center' },
    avatar: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
    initials: { fontFamily: 'Montserrat_700Bold', fontSize: 20 },
    headerInfo: { flex: 1, gap: 2 },
    fullName: { fontFamily: 'Montserrat_700Bold', fontSize: 18, color: '#1f2937' },
    detailText: { fontFamily: 'Montserrat_400Regular', fontSize: 13, color: '#6b7280' },
    pathologiesContainer: { flexDirection: 'row', gap: 6, marginTop: 12, backgroundColor: '#f0f3f6', borderRadius: 8, padding: 10 },
    pathologies: { fontFamily: 'Montserrat_400Regular', fontSize: 13, color: '#374151', flex: 1 },
    actions: { gap: 8, marginBottom: 24 },
    divider: { marginVertical: 4 },
    sectionTitle: { fontFamily: 'Montserrat_700Bold', fontSize: 16, color: '#1f2937', marginBottom: 10 },
    emptyText: { fontFamily: 'Montserrat_400Regular', fontSize: 14, color: '#6b7280', textAlign: 'center', paddingVertical: 8 },
    batteryRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    batteryInfo: { flex: 1 },
    batteryDate: { fontFamily: 'Montserrat_600SemiBold', fontSize: 14, color: '#1f2937' },
    batteryNotes: { fontFamily: 'Montserrat_400Regular', fontSize: 12, color: '#6b7280' },
    bottomPadding: { height: 32 },
});
