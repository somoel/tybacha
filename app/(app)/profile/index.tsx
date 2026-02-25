import { AppButton } from '@/src/components/ui/AppButton';
import { AppCard } from '@/src/components/ui/AppCard';
import { AppSnackbar } from '@/src/components/ui/AppSnackbar';
import { usePermissions } from '@/src/hooks/usePermissions';
import { useSyncQueue } from '@/src/hooks/useSyncQueue';
import { fetchCaregiverAssignments, unassignCaregiver } from '@/src/services/patientService';
import { useAuthStore } from '@/src/stores/authStore';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { Divider, Text, useTheme } from 'react-native-paper';

interface Assignment {
    id: string;
    patient_id: string;
    patients: { first_name: string; first_lastname: string } | null;
}

/**
 * Profile screen with user info, sync status, and caregiver unlink (RF-07).
 */
export default function ProfileScreen() {
    const theme = useTheme();
    const router = useRouter();
    const { user, role, logout } = useAuthStore();
    const { isProfessional, isCaregiver } = usePermissions();
    const { isOnline, isSyncing, pendingCount, syncNow } = useSyncQueue();

    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [snackbar, setSnackbar] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' });

    useEffect(() => {
        if (isCaregiver && user) {
            fetchCaregiverAssignments(user.id).then((data) => {
                setAssignments(data as unknown as Assignment[]);
            }).catch(console.error);
        }
    }, [isCaregiver, user]);

    const handleUnlink = (assignment: Assignment) => {
        Alert.alert(
            'Desasociarse del paciente',
            `¿Está seguro de desasociarse de ${assignment.patients?.first_name ?? 'este paciente'}? No tendrá acceso a sus datos.`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Desasociarme',
                    style: 'destructive',
                    onPress: async () => {
                        if (!user) return;
                        try {
                            await unassignCaregiver(user.id, assignment.patient_id);
                            setAssignments((prev) => prev.filter((a) => a.id !== assignment.id));
                            setSnackbar({ visible: true, message: 'Desasociado exitosamente ✓', type: 'success' });
                        } catch (error) {
                            const msg = error instanceof Error ? error.message : 'Error al desasociar.';
                            setSnackbar({ visible: true, message: msg, type: 'error' });
                        }
                    },
                },
            ]
        );
    };

    const handleLogout = () => {
        Alert.alert('Cerrar sesión', '¿Desea cerrar sesión?', [
            { text: 'Cancelar', style: 'cancel' },
            {
                text: 'Cerrar sesión',
                onPress: async () => {
                    await logout();
                    router.replace('/(auth)/login' as never);
                },
            },
        ]);
    };

    const handleManualSync = async () => {
        const result = await syncNow();
        if (result.error) {
            setSnackbar({ visible: true, message: result.error, type: 'error' });
        } else if (result.synced > 0) {
            setSnackbar({ visible: true, message: `${result.synced} registros sincronizados ✓`, type: 'success' });
        } else {
            setSnackbar({ visible: true, message: 'No hay registros pendientes', type: 'success' });
        }
    };

    const userName = user?.user_metadata?.full_name ?? 'Usuario';
    const roleLabel = role === 'professional' ? 'Profesional' : 'Cuidador';

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            {/* User info */}
            <AppCard style={styles.profileCard}>
                <View style={styles.avatarRow}>
                    <View style={[styles.avatar, { backgroundColor: theme.colors.primaryContainer }]}>
                        <MaterialCommunityIcons name="account" size={36} color={theme.colors.primary} />
                    </View>
                    <View style={styles.userInfo}>
                        <Text style={styles.name}>{userName}</Text>
                        <Text style={styles.email}>{user?.email ?? ''}</Text>
                        <View style={[styles.roleBadge, { backgroundColor: theme.colors.primaryContainer }]}>
                            <Text style={[styles.roleText, { color: theme.colors.onPrimaryContainer }]}>{roleLabel}</Text>
                        </View>
                    </View>
                </View>
            </AppCard>

            {/* Sync status */}
            <AppCard>
                <View style={styles.syncRow}>
                    <MaterialCommunityIcons
                        name={isOnline ? 'cloud-check' : 'cloud-off-outline'}
                        size={24}
                        color={isOnline ? '#2e7d32' : '#f59e0b'}
                    />
                    <View style={styles.syncInfo}>
                        <Text style={styles.syncStatus}>
                            {isOnline ? 'Conectado' : 'Sin conexión'}
                        </Text>
                        <Text style={styles.syncDetail}>
                            {pendingCount > 0 ? `${pendingCount} registros pendientes` : 'Todo sincronizado'}
                        </Text>
                    </View>
                    {pendingCount > 0 && isOnline && (
                        <AppButton label="Sincronizar" variant="outlined" onPress={handleManualSync} loading={isSyncing} />
                    )}
                </View>
            </AppCard>

            {/* Caregiver: assigned patients with unlink (RF-07) */}
            {isCaregiver && assignments.length > 0 && (
                <>
                    <Text style={styles.sectionTitle}>Mis pacientes asignados</Text>
                    {assignments.map((a) => (
                        <AppCard key={a.id}>
                            <View style={styles.assignmentRow}>
                                <MaterialCommunityIcons name="account" size={24} color={theme.colors.primary} />
                                <Text style={styles.patientName}>
                                    {a.patients?.first_name ?? ''} {a.patients?.first_lastname ?? ''}
                                </Text>
                                <AppButton label="Desasociarme" variant="outlined-error" onPress={() => handleUnlink(a)} />
                            </View>
                        </AppCard>
                    ))}
                </>
            )}

            <Divider style={styles.divider} />

            <AppButton
                label="Cerrar sesión"
                variant="outlined-error"
                icon="logout"
                onPress={handleLogout}
                accessibilityLabel="Cerrar sesión"
                style={styles.logoutBtn}
            />

            <View style={styles.bottomPad} />
            <AppSnackbar visible={snackbar.visible} message={snackbar.message} type={snackbar.type} onDismiss={() => setSnackbar((s) => ({ ...s, visible: false }))} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc', padding: 16 },
    profileCard: { marginBottom: 12 },
    avatarRow: { flexDirection: 'row', gap: 16, alignItems: 'center' },
    avatar: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center' },
    userInfo: { flex: 1, gap: 2 },
    name: { fontFamily: 'Montserrat_700Bold', fontSize: 18, color: '#1f2937' },
    email: { fontFamily: 'Montserrat_400Regular', fontSize: 13, color: '#6b7280' },
    roleBadge: { alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3, marginTop: 4 },
    roleText: { fontFamily: 'Montserrat_600SemiBold', fontSize: 12 },
    syncRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    syncInfo: { flex: 1 },
    syncStatus: { fontFamily: 'Montserrat_600SemiBold', fontSize: 14, color: '#1f2937' },
    syncDetail: { fontFamily: 'Montserrat_400Regular', fontSize: 12, color: '#6b7280' },
    sectionTitle: { fontFamily: 'Montserrat_700Bold', fontSize: 16, color: '#1f2937', marginTop: 20, marginBottom: 10 },
    assignmentRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    patientName: { fontFamily: 'Montserrat_500Medium', fontSize: 14, color: '#1f2937', flex: 1 },
    divider: { marginVertical: 20 },
    logoutBtn: { marginTop: 8 },
    bottomPad: { height: 32 },
});
