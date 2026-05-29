import { PatientCard } from '@/src/components/patients/PatientCard';
import { AppCard } from '@/src/components/ui/AppCard';
import { HomeSkeleton } from '@/src/components/ui/HomeSkeleton';
import { ActivityFeed } from '@/src/components/ui/ActivityFeed';
import type { ActivityItem } from '@/src/components/ui/ActivityFeed';
import { usePermissions } from '@/src/hooks/usePermissions';
import { useSyncQueue } from '@/src/hooks/useSyncQueue';
import { fetchActivePlanStatus, fetchBatteryCountsForPatients, fetchWeeklyExerciseDataForPatients } from '@/src/services/batteryService';
import { fetchPatients, fetchPatientThumbnails } from '@/src/services/patientService';
import { useAuthStore } from '@/src/stores/authStore';
import { usePatientsStore } from '@/src/stores/patientsStore';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, useTheme } from 'react-native-paper';

/**
 * Dashboard screen showing role-specific content.
 * Professional: summary stats + recent evaluations + FAB to add patient.
 * Caregiver: exercise compliance stats + patients with quick actions + activity feed.
 */
export default function HomeScreen() {
    const theme = useTheme();
    const router = useRouter();
    const { user, profile } = useAuthStore();
    const { isAdmin, isProfessional, isCaregiver } = usePermissions();
    const { patients, setPatients, setLoading, isLoading, setPhotoThumbnails, exerciseData, setExerciseData } = usePatientsStore();
    const { pendingCount } = useSyncQueue();
    const [greeting, setGreeting] = useState('Buenos días');
    const [activePlanMap, setActivePlanMap] = useState<Record<string, boolean>>({});
    const [batteryCounts, setBatteryCounts] = useState<Record<string, number>>({});
    const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);

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
                const role = isAdmin || isProfessional ? 'profesional' : 'cuidador';
                const data = await fetchPatients(user.id, role);
                setPatients(data);

                if (data.length > 0) {
                    const ids = data.map((p) => p.id);
                    const [counts, plans, weeklyData] = await Promise.all([
                        fetchBatteryCountsForPatients(ids),
                        fetchActivePlanStatus(ids),
                        fetchWeeklyExerciseDataForPatients(ids),
                    ]);
                    setBatteryCounts(counts);
                    setActivePlanMap(plans);
                    setExerciseData(weeklyData);

                    // Build recent activity from exercise data
                    const activity: ActivityItem[] = [];
                    for (const patient of data) {
                        const exData = weeklyData[patient.id];
                        if (exData?.lastExerciseDate) {
                            const fullName = [patient.first_name, patient.first_lastname].filter(Boolean).join(' ');
                            activity.push({
                                patientName: fullName,
                                action: exData.todayCompleted > 0 ? 'Ejercicio completado' : 'Último ejercicio registrado',
                                date: exData.lastExerciseDate,
                                icon: 'dumbbell',
                                iconColor: '#2e7d32',
                            });
                        }
                    }
                    activity.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                    setRecentActivity(activity);
                }

                const thumbnails = await fetchPatientThumbnails();
                setPhotoThumbnails(thumbnails);
            } catch (error) {
                console.error('Error cargando adultos mayores:', error);
            } finally {
                setLoading(false);
            }
        };
        void loadPatients();
    }, [user, isAdmin, isProfessional, setPatients, setLoading, setPhotoThumbnails, setExerciseData]);

    const userName = profile?.full_name ?? 'Usuario';
    const hasStaffAccess = isAdmin || isProfessional;

    // Caregiver stats
    const totalTodayCompleted = Object.values(exerciseData).reduce((sum, d) => sum + d.todayCompleted, 0);
    const totalTodayExercises = Object.values(exerciseData).reduce((sum, d) => sum + d.todayTotal, 0);
    const avgCompliance = patients.length > 0
        ? Math.round(Object.values(exerciseData).reduce((sum, d) => sum + d.weeklyCompliance, 0) / patients.length)
        : 0;

    if (isLoading) {
        return <HomeSkeleton />;
    }

    return (
        <View style={styles.container}>
            <StatusBar style="light" />
            <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
                {/* Gradient header */}
                <LinearGradient
                    colors={['#006d77', '#80cbc4']}
                    style={styles.header}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    <SafeAreaView edges={['top']} style={styles.headerContent}>
                        <Text style={styles.greeting}>{greeting},</Text>
                        <Text style={styles.userName}>{userName}</Text>
                        {isAdmin && <Text style={styles.roleLabel}>Administrador</Text>}
                        {isProfessional && <Text style={styles.roleLabel}>Profesional</Text>}
                        {isCaregiver && (
                            <Text style={styles.roleLabel}>Cuidador</Text>
                        )}
                    </SafeAreaView>
                </LinearGradient>

                <View style={styles.content}>
                    {/* Summary cards for professional */}
                    {hasStaffAccess && (
                        <View style={styles.statsRow}>
                            <AppCard style={styles.statCard}>
                                <View style={styles.statContent}>
                                    <MaterialCommunityIcons name="account-group" size={28} color={theme.colors.primary} />
                                    <Text style={styles.statNumber}>{patients.length}</Text>
                                    <Text style={styles.statLabel}>Adultos mayores</Text>
                                </View>
                            </AppCard>
                            <AppCard style={styles.statCard}>
                                <View style={styles.statContent}>
                                    <MaterialCommunityIcons name="clipboard-check" size={28} color="#2e7d32" />
                                    <Text style={styles.statNumber}>
                                        {Object.values(activePlanMap).filter(Boolean).length}
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

                    {/* Summary stats for caregiver */}
                    {isCaregiver && patients.length > 0 && (
                        <View style={styles.statsRow}>
                            <AppCard style={styles.statCard}>
                                <View style={styles.statContent}>
                                    <MaterialCommunityIcons name="account-group" size={28} color={theme.colors.primary} />
                                    <Text style={styles.statNumber}>{patients.length}</Text>
                                    <Text style={styles.statLabel}>Adultos mayores</Text>
                                </View>
                            </AppCard>
                            <AppCard style={styles.statCard}>
                                <View style={styles.statContent}>
                                    <MaterialCommunityIcons name="dumbbell" size={28} color="#2e7d32" />
                                    <Text style={styles.statNumber}>
                                        {totalTodayExercises > 0 ? totalTodayExercises - totalTodayCompleted : '0'}
                                    </Text>
                                    <Text style={styles.statLabel}>Pendientes hoy</Text>
                                </View>
                            </AppCard>
                            <AppCard style={styles.statCard}>
                                <View style={styles.statContent}>
                                    <MaterialCommunityIcons name="chart-line" size={28} color={avgCompliance >= 80 ? '#2e7d32' : avgCompliance >= 50 ? '#f57c0b' : '#c62828'} />
                                    <Text style={styles.statNumber}>{avgCompliance}%</Text>
                                    <Text style={styles.statLabel}>Cumplimiento</Text>
                                </View>
                            </AppCard>
                        </View>
                    )}

                    {/* Recent patients */}
                    <Text style={styles.sectionTitle}>
                        {hasStaffAccess ? 'Adultos mayores recientes' : 'Mis adultos mayores'}
                    </Text>

                    {patients.length === 0 ? (
                        <AppCard>
                            <View style={styles.emptyContainer}>
                                <MaterialCommunityIcons name="account-question" size={48} color={theme.colors.outline} />
                                <Text style={styles.emptyText}>
                                    {hasStaffAccess
                                        ? 'No tiene adultos mayores registrados aún.'
                                        : 'No tiene adultos mayores asignados aún.'}
                                </Text>
                            </View>
                        </AppCard>
                    ) : (
                        patients.slice(0, hasStaffAccess ? 3 : undefined).map((patient) => (
                            <PatientCard
                                key={patient.id}
                                patient={patient}
                                batteryCount={batteryCounts[patient.id]}
                                hasActivePlan={activePlanMap[patient.id]}
                                weeklyExerciseData={exerciseData[patient.id]}
                                showQuickActions={isCaregiver}
                                onExercisePress={() => router.push(`/(app)/patients/${patient.id}` as never)}
                                onPress={() => router.push(`/(app)/patients/${patient.id}` as never)}
                            />
                        ))
                    )}

                    {hasStaffAccess && patients.length > 3 && (
                        <Text
                            style={styles.seeAll}
                            onPress={() => router.push('/(app)/patients' as never)}
                        >
                            Ver todos los adultos mayores →
                        </Text>
                    )}

                    {/* Activity feed for caregivers */}
                    {isCaregiver && recentActivity.length > 0 && (
                        <>
                            <Text style={[styles.sectionTitle, styles.activitySection]}>Actividad reciente</Text>
                            <AppCard>
                                <ActivityFeed items={recentActivity} maxItems={5} />
                            </AppCard>
                        </>
                    )}
                </View>
            </ScrollView>

            {/* FAB for professional to add new patient */}
            {hasStaffAccess && (
                <Pressable
                    style={[styles.fab, { backgroundColor: theme.colors.primary }]}
                    onPress={() => router.push('/(app)/patients/new' as never)}
                    accessibilityLabel="Registrar nuevo adulto mayor"
                    accessibilityRole="button"
                >
                    <MaterialCommunityIcons name="plus" size={20} color={theme.colors.onPrimary} />
                    <Text style={[styles.fabText, { color: theme.colors.onPrimary }]}>Nuevo adulto mayor</Text>
                </Pressable>
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
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
    },
    headerContent: {
        paddingTop: 24,
        paddingBottom: 32,
        paddingHorizontal: 24,
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
    activitySection: {
        marginTop: 24,
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
        minHeight: 56,
        paddingHorizontal: 18,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        elevation: 4,
    },
    fabText: {
        fontFamily: 'Montserrat_700Bold',
        fontSize: 14,
    },
});
