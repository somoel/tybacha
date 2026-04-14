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
    const { user, profile, role, logout } = useAuthStore();
    const { isCaregiver } = usePermissions();
    const { isOnline, isSyncing, pendingCount, syncNow } = useSyncQueue();

    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [snackbar, setSnackbar] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' });
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        phone: ''
    });

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

    const handleLogout = async () => {
        console.log('ProfileScreen - handleLogout called');
        
        // Use window.confirm for web compatibility
        const confirmed = window.confirm('¿Desea cerrar sesión?');
        
        if (confirmed) {
            try {
                console.log('ProfileScreen - Starting logout process');
                await logout();
                console.log('ProfileScreen - Logout completed, navigating to login');
                router.replace('/(auth)/login' as never);
            } catch (error) {
                console.error('ProfileScreen - Logout error:', error);
            }
        } else {
            console.log('ProfileScreen - Logout cancelled by user');
        }
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

    const handleEditProfile = () => {
        if (user) {
            setFormData({
                firstName: user.first_name || '',
                lastName: user.last_name || '',
                phone: user.phone || ''
            });
            setIsEditing(true);
        }
    };

    const handleSaveProfile = async () => {
        if (!user) return;

        try {
            const response = await fetch('http://localhost:3001/api/user/profile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: user.id,
                    firstName: formData.firstName,
                    lastName: formData.lastName,
                    phone: formData.phone
                })
            });

            const result = await response.json();

            if (result.success) {
                // Update user in auth store
                const updatedUser = { ...user, ...result.user };
                // You'll need to add an updateUser method to authStore
                setSnackbar({ visible: true, message: 'Perfil actualizado exitosamente', type: 'success' });
                setIsEditing(false);
            } else {
                setSnackbar({ visible: true, message: result.error || 'Error al actualizar perfil', type: 'error' });
            }
        } catch (error) {
            setSnackbar({ visible: true, message: 'Error de conexión', type: 'error' });
        }
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        setFormData({
            firstName: '',
            lastName: '',
            phone: ''
        });
    };

    const roleLabel = role === 'admin' ? 'Administrador' : role === 'professional' ? 'Profesional' : 'Cuidador';

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            {/* User info */}
            <AppCard style={styles.profileCard}>
                <View style={styles.avatarRow}>
                    <View style={[styles.avatar, { backgroundColor: theme.colors.primaryContainer }]}>
                        <MaterialCommunityIcons name="account" size={36} color={theme.colors.primary} />
                    </View>
                    <View style={styles.userInfo}>
                        {isEditing ? (
                            <>
                                <TextInput
                                    label="Nombre"
                                    value={formData.firstName}
                                    onChangeText={(text) => setFormData(prev => ({ ...prev, firstName: text }))}
                                    style={styles.input}
                                    mode="outlined"
                                    dense
                                />
                                <TextInput
                                    label="Apellido"
                                    value={formData.lastName}
                                    onChangeText={(text) => setFormData(prev => ({ ...prev, lastName: text }))}
                                    style={styles.input}
                                    mode="outlined"
                                    dense
                                />
                                <TextInput
                                    label="Teléfono"
                                    value={formData.phone}
                                    onChangeText={(text) => setFormData(prev => ({ ...prev, phone: text }))}
                                    style={styles.input}
                                    mode="outlined"
                                    dense
                                />
                                <View style={styles.editButtons}>
                                    <AppButton label="Guardar" onPress={handleSaveProfile} />
                                    <AppButton label="Cancelar" variant="outlined" onPress={handleCancelEdit} />
                                </View>
                            </>
                        ) : (
                            <>
                                <Text style={styles.name}>
                                    {user?.first_name && user?.last_name 
                                        ? `${user.first_name} ${user.last_name}` 
                                        : user?.email?.split('@')[0] || 'Usuario'}
                                </Text>
                                <Text style={styles.role}>{roleLabel}</Text>
                                <Text style={styles.email}>{user?.email ?? ''}</Text>
                                {user?.phone && <Text style={styles.phone}>{user.phone}</Text>}
                                <AppButton 
                                    label="Editar perfil" 
                                    variant="outlined" 
                                    onPress={handleEditProfile}
                                    style={styles.editButton}
                                />
                            </>
                        )}
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

            {/* Caregiver: assigned patients with unlinking (RF-07) */}
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
    role: { fontFamily: 'Montserrat_500Medium', fontSize: 14, color: '#6b7280' },
    email: { fontFamily: 'Montserrat_400Regular', fontSize: 13, color: '#6b7280' },
    phone: { fontFamily: 'Montserrat_400Regular', fontSize: 13, color: '#6b7280' },
    input: { marginBottom: 8 },
    editButtons: { flexDirection: 'row', gap: 8, marginTop: 8 },
    editButton: { marginTop: 8 },
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
