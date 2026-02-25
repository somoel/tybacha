import { PatientCard } from '@/src/components/patients/PatientCard';
import { AppCard } from '@/src/components/ui/AppCard';
import { AppLoader } from '@/src/components/ui/AppLoader';
import { usePermissions } from '@/src/hooks/usePermissions';
import { useSyncQueue } from '@/src/hooks/useSyncQueue';
import { fetchPatients } from '@/src/services/patientService';
import { useAuthStore } from '@/src/stores/authStore';
import { usePatientsStore } from '@/src/stores/patientsStore';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { FAB, Text, useTheme } from 'react-native-paper';

/**
 * Dashboard screen showing role-specific content.
 * Professional: summary stats + recent evaluations + FAB to add patient.
 * Caregiver: assigned patients with quick action buttons.
 */
export default function HomeScreen() {
    const theme = useTheme();
    const router = useRouter();
    const { user } = useAuthStore();
    const { isProfessional, isCaregiver } = usePermissions();
    const { patients, setPatients, setLoading, isLoading } = usePatientsStore();
    const { pendingCount } = useSyncQueue();
    const [greeting, setGreeting] = useState('Buenos días');

    useEffect(() => {
        const hour = new Date().getHours();
        if (hour >= 12 && hour < 18) setGreeting('Buenas tardes');
        else if (hour >= 18) setGreeting('Buenas noches');
    }, []);

    useEffect(() => {
        const loadPatients = async () => {
            if (!user) return;
            setLoading(true);
            try {
                const role = isProfessional ? 'professional' : 'caregiver';
                const data = await fetchPatients(user.id, role);
                setPatients(data);
            } catch (error) {
                console.error('Error cargando pacientes:', error);
            } finally {
                setLoading(false);
            }
        };
        loadPatients();
    }, [user, isProfessional, setPatients, setLoading]);

    const userName = user?.user_metadata?.full_name ?? 'Usuario';

    if (isLoading) {
        return <AppLoader message="Cargando datos..." />;
    }

    return (
        <View style={styles.container}>
            <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
                {/* Gradient header */}
                <LinearGradient
                    colors={['#006d77', '#80cbc4']}
                    style={styles.header}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    <Text style={styles.greeting}>{greeting},</Text>
                    <Text style={styles.userName}>{userName}</Text>
                    {isProfessional && (
                        <Text style={styles.roleLabel}>Profesional</Text>
                    )}
                    {isCaregiver && (
                        <Text style={styles.roleLabel}>Cuidador</Text>
                    )}
                </LinearGradient>

                <View style={styles.content}>
                    {/* Summary cards for professional */}
                    {isProfessional && (
                        <View style={styles.statsRow}>
                            <AppCard style={styles.statCard}>
                                <View style={styles.statContent}>
                                    <MaterialCommunityIcons name="account-group" size={28} color={theme.colors.primary} />
                                    <Text style={styles.statNumber}>{patients.length}</Text>
                                    <Text style={styles.statLabel}>Pacientes</Text>
                                </View>
                            </AppCard>
                            <AppCard style={styles.statCard}>
                                <View style={styles.statContent}>
                                    <MaterialCommunityIcons name="clipboard-check" size={28} color="#2e7d32" />
                                    <Text style={styles.statNumber}>
                                        {patients.length > 0 ? Math.min(patients.length, 3) : 0}
                                    </Text>
                                    <Text style={styles.statLabel}>Con plan activo</Text>
                                </View>
                            </AppCard>
                            {pendingCount > 0 && (
                                <AppCard style={styles.statCard}>
                                    <View style={styles.statContent}>
                                        <MaterialCommunityIcons name="cloud-sync" size={28} color="#f59e0b" />
                                        <Text style={styles.statNumber}>{pendingCount}</Text>
                                        <Text style={styles.statLabel}>Pendientes sync</Text>
                                    </View>
                                </AppCard>
                            )}
                        </View>
                    )}

                    {/* Recent patients */}
                    <Text style={styles.sectionTitle}>
                        {isProfessional ? 'Pacientes recientes' : 'Mis pacientes asignados'}
                    </Text>

                    {patients.length === 0 ? (
                        <AppCard>
                            <View style={styles.emptyContainer}>
                                <MaterialCommunityIcons name="account-question" size={48} color={theme.colors.outline} />
                                <Text style={styles.emptyText}>
                                    {isProfessional
                                        ? 'No tiene pacientes registrados aún.'
                                        : 'No tiene pacientes asignados aún.'}
                                </Text>
                            </View>
                        </AppCard>
                    ) : (
                        patients.slice(0, isProfessional ? 3 : undefined).map((patient) => (
                            <PatientCard
                                key={patient.id}
                                patient={patient}
                                onPress={() => router.push(`/(app)/patients/${patient.id}` as never)}
                            />
                        ))
                    )}

                    {isProfessional && patients.length > 3 && (
                        <Text
                            style={styles.seeAll}
                            onPress={() => router.push('/(app)/patients' as never)}
                        >
                            Ver todos los pacientes →
                        </Text>
                    )}
                </View>
            </ScrollView>

            {/* FAB for professional to add new patient */}
            {isProfessional && (
                <FAB
                    icon="plus"
                    label="Nuevo paciente"
                    style={[styles.fab, { backgroundColor: theme.colors.primary }]}
                    color={theme.colors.onPrimary}
                    onPress={() => router.push('/(app)/patients/new' as never)}
                    accessibilityLabel="Registrar nuevo paciente"
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    scroll: {
        flex: 1,
    },
    header: {
        paddingTop: 24,
        paddingBottom: 32,
        paddingHorizontal: 24,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
    },
    greeting: {
        fontFamily: 'Montserrat_500Medium',
        fontSize: 16,
        color: 'rgba(255,255,255,0.85)',
    },
    userName: {
        fontFamily: 'Montserrat_700Bold',
        fontSize: 24,
        color: '#FFFFFF',
        marginTop: 2,
    },
    roleLabel: {
        fontFamily: 'Montserrat_500Medium',
        fontSize: 12,
        color: 'rgba(255,255,255,0.7)',
        backgroundColor: 'rgba(255,255,255,0.15)',
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: 8,
        marginTop: 8,
        alignSelf: 'flex-start',
        overflow: 'hidden',
    },
    content: {
        paddingHorizontal: 16,
        paddingTop: 20,
        paddingBottom: 100,
    },
    statsRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 20,
    },
    statCard: {
        flex: 1,
    },
    statContent: {
        alignItems: 'center',
        gap: 4,
    },
    statNumber: {
        fontFamily: 'Montserrat_800ExtraBold',
        fontSize: 24,
        color: '#1f2937',
    },
    statLabel: {
        fontFamily: 'Montserrat_400Regular',
        fontSize: 11,
        color: '#6b7280',
        textAlign: 'center',
    },
    sectionTitle: {
        fontFamily: 'Montserrat_700Bold',
        fontSize: 18,
        color: '#1f2937',
        marginBottom: 12,
    },
    emptyContainer: {
        alignItems: 'center',
        gap: 8,
        paddingVertical: 16,
    },
    emptyText: {
        fontFamily: 'Montserrat_400Regular',
        fontSize: 14,
        color: '#6b7280',
        textAlign: 'center',
    },
    seeAll: {
        fontFamily: 'Montserrat_600SemiBold',
        fontSize: 14,
        color: '#006d77',
        textAlign: 'center',
        marginTop: 12,
        paddingVertical: 8,
    },
    fab: {
        position: 'absolute',
        right: 16,
        bottom: 24,
        borderRadius: 16,
    },
});
