import { AppButton } from '@/src/components/ui/AppButton';
import { AppCard } from '@/src/components/ui/AppCard';
import { AppConfirmDialog } from '@/src/components/ui/AppConfirmDialog';
import { AppSnackbar } from '@/src/components/ui/AppSnackbar';
import { usePermissions } from '@/src/hooks/usePermissions';
import { useSyncQueue } from '@/src/hooks/useSyncQueue';
import { fetchCaregiverAssignments, unassignCaregiver } from '@/src/services/patientService';
import { useAuthStore } from '@/src/stores/authStore';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Divider, Text, TextInput, useTheme } from 'react-native-paper';

interface Assignment {
    id: string;
    patient_id: string;
    patients: { first_name: string; first_lastname: string } | null;
}

export default function ProfileScreen() {
    const theme = useTheme();
    const router = useRouter();
    const { user, profile, role, logout, updateProfile, changeEmail, changePassword } = useAuthStore();
    const { isCaregiver } = usePermissions();
    const { isOnline, isSyncing, pendingCount, syncNow } = useSyncQueue();

    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [snackbar, setSnackbar] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' });

    const [confirmDialog, setConfirmDialog] = useState<{ visible: boolean; type: 'unlink' | 'logout'; assignment?: Assignment }>({
        visible: false,
        type: 'logout',
    });

    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editNombres, setEditNombres] = useState('');
    const [editApellidos, setEditApellidos] = useState('');
    const [editTelefono, setEditTelefono] = useState('');
    const [editCiudad, setEditCiudad] = useState('');

    const [isEditingEmail, setIsEditingEmail] = useState(false);
    const [isSavingEmail, setIsSavingEmail] = useState(false);
    const [editNuevoCorreo, setEditNuevoCorreo] = useState('');
    const [editEmailContrasena, setEditEmailContrasena] = useState('');

    const [isEditingPassword, setIsEditingPassword] = useState(false);
    const [isSavingPassword, setIsSavingPassword] = useState(false);
    const [editContrasenaActual, setEditContrasenaActual] = useState('');
    const [editNuevaContrasena, setEditNuevaContrasena] = useState('');
    const [editConfirmarContrasena, setEditConfirmarContrasena] = useState('');

    const [emailConfirmVisible, setEmailConfirmVisible] = useState(false);

    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => {
        if (isCaregiver && user) {
            fetchCaregiverAssignments(user.id).then((data) => {
                setAssignments(data as unknown as Assignment[]);
            }).catch(console.error);
        }
    }, [isCaregiver, user]);

    const startEditing = () => {
        setEditNombres(profile?.nombres ?? '');
        setEditApellidos(profile?.apellidos ?? '');
        setEditTelefono(profile?.telefono ?? '');
        setEditCiudad(profile?.ciudad ?? '');
        setIsEditing(true);
    };

    const cancelEditing = () => {
        setIsEditing(false);
    };

    const saveProfile = async () => {
        setIsSaving(true);
        try {
            await updateProfile({
                nombres: editNombres.trim() || undefined,
                apellidos: editApellidos.trim() || undefined,
                telefono: editTelefono.trim() || undefined,
                ciudad: editCiudad.trim() || undefined,
            });
            setIsEditing(false);
            setSnackbar({ visible: true, message: 'Perfil actualizado exitosamente', type: 'success' });
        } catch (error) {
            const msg = error instanceof Error ? error.message : 'Error al actualizar el perfil.';
            setSnackbar({ visible: true, message: msg, type: 'error' });
        } finally {
            setIsSaving(false);
        }
    };

    const startEditingEmail = () => {
        setEditNuevoCorreo(user?.email ?? '');
        setEditEmailContrasena('');
        setIsEditingEmail(true);
    };

    const cancelEditingEmail = () => {
        setIsEditingEmail(false);
        setEditNuevoCorreo('');
        setEditEmailContrasena('');
    };

    const saveEmail = async () => {
        if (!editNuevoCorreo.trim() || !editEmailContrasena.trim()) {
            setSnackbar({ visible: true, message: 'Todos los campos son requeridos', type: 'error' });
            return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editNuevoCorreo.trim())) {
            setSnackbar({ visible: true, message: 'Correo inválido', type: 'error' });
            return;
        }
        if (editEmailContrasena.length < 8) {
            setSnackbar({ visible: true, message: 'La contraseña debe tener al menos 8 caracteres', type: 'error' });
            return;
        }
        setEmailConfirmVisible(true);
    };

    const performEmailChange = async () => {
        setEmailConfirmVisible(false);
        setIsSavingEmail(true);
        try {
            await changeEmail({
                nuevoCorreo: editNuevoCorreo.trim().toLowerCase(),
                contrasena: editEmailContrasena,
            });
            setIsEditingEmail(false);
            setEditNuevoCorreo('');
            setEditEmailContrasena('');
            setSnackbar({ visible: true, message: 'Correo actualizado exitosamente', type: 'success' });
        } catch (error) {
            const msg = error instanceof Error ? error.message : 'Error al cambiar el correo.';
            setSnackbar({ visible: true, message: msg, type: 'error' });
        } finally {
            setIsSavingEmail(false);
        }
    };

    const startEditingPassword = () => {
        setEditContrasenaActual('');
        setEditNuevaContrasena('');
        setEditConfirmarContrasena('');
        setIsEditingPassword(true);
    };

    const cancelEditingPassword = () => {
        setIsEditingPassword(false);
        setEditContrasenaActual('');
        setEditNuevaContrasena('');
        setEditConfirmarContrasena('');
    };

    const savePassword = async () => {
        if (!editContrasenaActual.trim() || !editNuevaContrasena.trim() || !editConfirmarContrasena.trim()) {
            setSnackbar({ visible: true, message: 'Todos los campos son requeridos', type: 'error' });
            return;
        }
        if (editNuevaContrasena.length < 8) {
            setSnackbar({ visible: true, message: 'La nueva contraseña debe tener al menos 8 caracteres', type: 'error' });
            return;
        }
        if (editNuevaContrasena !== editConfirmarContrasena) {
            setSnackbar({ visible: true, message: 'Las contraseñas no coinciden', type: 'error' });
            return;
        }
        setIsSavingPassword(true);
        try {
            await changePassword({
                contrasenaActual: editContrasenaActual,
                nuevaContrasena: editNuevaContrasena,
            });
            setIsEditingPassword(false);
            setEditContrasenaActual('');
            setEditNuevaContrasena('');
            setEditConfirmarContrasena('');
            setSnackbar({ visible: true, message: 'Contraseña actualizada exitosamente', type: 'success' });
        } catch (error) {
            const msg = error instanceof Error ? error.message : 'Error al cambiar la contraseña.';
            setSnackbar({ visible: true, message: msg, type: 'error' });
        } finally {
            setIsSavingPassword(false);
        }
    };

    const handleUnlink = (assignment: Assignment) => {
        setConfirmDialog({ visible: true, type: 'unlink', assignment });
    };

    const handleConfirmUnlink = async () => {
        if (!user || !confirmDialog.assignment) return;
        const assignment = confirmDialog.assignment;
        try {
            await unassignCaregiver(user.id, assignment.patient_id);
            setAssignments((prev) => prev.filter((a) => a.id !== assignment.id));
            setSnackbar({ visible: true, message: 'Desasociado exitosamente', type: 'success' });
        } catch (error) {
            const msg = error instanceof Error ? error.message : 'Error al desasociar.';
            setSnackbar({ visible: true, message: msg, type: 'error' });
        } finally {
            setConfirmDialog((prev) => ({ ...prev, visible: false }));
        }
    };

    const performLogout = async () => {
        await logout();
        router.replace('/(auth)/login' as never);
    };

    const handleLogout = () => {
        setConfirmDialog({ visible: true, type: 'logout' });
    };

    const handleManualSync = async () => {
        const result = await syncNow();
        if (result.error) {
            setSnackbar({ visible: true, message: result.error, type: 'error' });
        } else if (result.synced > 0) {
            setSnackbar({ visible: true, message: `${result.synced} registros sincronizados`, type: 'success' });
        } else {
            setSnackbar({ visible: true, message: 'No hay registros pendientes', type: 'success' });
        }
    };

    const userName = profile?.full_name ?? 'Usuario';
    const roleLabel = role === 'administrador' ? 'Administrador' : role === 'profesional' ? 'Profesional' : 'Cuidador';

    return (
        <ScrollView
            style={styles.container}
            contentInsetAdjustmentBehavior="automatic"
            showsVerticalScrollIndicator={false}
        >
            {/* User info + edit form */}
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

                <Divider style={styles.cardDivider} />

                {isEditing ? (
                    <View style={styles.editForm}>
                        <TextInput
                            label="Nombres"
                            value={editNombres}
                            onChangeText={setEditNombres}
                            mode="outlined"
                            style={styles.input}
                        />
                        <TextInput
                            label="Apellidos"
                            value={editApellidos}
                            onChangeText={setEditApellidos}
                            mode="outlined"
                            style={styles.input}
                        />
                        <TextInput
                            label="Teléfono"
                            value={editTelefono}
                            onChangeText={setEditTelefono}
                            mode="outlined"
                            keyboardType="phone-pad"
                            style={styles.input}
                        />
                        <TextInput
                            label="Ciudad"
                            value={editCiudad}
                            onChangeText={setEditCiudad}
                            mode="outlined"
                            style={styles.input}
                        />
                        <View style={styles.editActions}>
                            <AppButton
                                label="Cancelar"
                                variant="outlined"
                                onPress={cancelEditing}
                                style={styles.editBtn}
                            />
                            <AppButton
                                label="Guardar"
                                onPress={saveProfile}
                                loading={isSaving}
                                style={styles.editBtn}
                            />
                        </View>
                    </View>
                ) : (
                    <View style={styles.viewFields}>
                        <View style={styles.fieldRow}>
                            <Text style={styles.fieldLabel}>Nombres</Text>
                            <Text selectable style={styles.fieldValue}>{profile?.nombres ?? '-'}</Text>
                        </View>
                        <View style={styles.fieldRow}>
                            <Text style={styles.fieldLabel}>Apellidos</Text>
                            <Text selectable style={styles.fieldValue}>{profile?.apellidos ?? '-'}</Text>
                        </View>
                        <View style={styles.fieldRow}>
                            <Text style={styles.fieldLabel}>Teléfono</Text>
                            <Text selectable style={styles.fieldValue}>{profile?.telefono ?? '-'}</Text>
                        </View>
                        <View style={styles.fieldRow}>
                            <Text style={styles.fieldLabel}>Ciudad</Text>
                            <Text selectable style={styles.fieldValue}>{profile?.ciudad ?? '-'}</Text>
                        </View>
                        <AppButton
                            label="Editar perfil"
                            variant="outlined"
                            icon="pencil"
                            onPress={startEditing}
                            style={styles.editProfileBtn}
                        />
                    </View>
                )}
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

            {/* Change email */}
            <AppCard style={styles.changeCard}>
                <Text style={styles.sectionTitle}>Correo electrónico</Text>
                <Text style={styles.currentEmail}>{user?.email ?? ''}</Text>
                {isEditingEmail ? (
                    <View style={styles.changeForm}>
                        <TextInput
                            label="Nuevo correo"
                            value={editNuevoCorreo}
                            onChangeText={setEditNuevoCorreo}
                            mode="outlined"
                            keyboardType="email-address"
                            autoCapitalize="none"
                            style={styles.input}
                        />
                        <TextInput
                            label="Contraseña actual"
                            value={editEmailContrasena}
                            onChangeText={setEditEmailContrasena}
                            mode="outlined"
                            secureTextEntry={!showPassword}
                            style={styles.input}
                            right={
                                <TextInput.Icon
                                    icon={showPassword ? 'eye-off' : 'eye'}
                                    onPress={() => setShowPassword(!showPassword)}
                                />
                            }
                        />
                        <View style={styles.editActions}>
                            <AppButton label="Cancelar" variant="outlined" onPress={cancelEditingEmail} style={styles.editBtn} />
                            <AppButton label="Guardar" onPress={saveEmail} loading={isSavingEmail} style={styles.editBtn} />
                        </View>
                    </View>
                ) : (
                    <AppButton label="Cambiar correo" variant="outlined" icon="email-edit-outline" onPress={startEditingEmail} style={styles.changeBtn} />
                )}
            </AppCard>

            {/* Change password */}
            <AppCard style={styles.changeCard}>
                <Text style={styles.sectionTitle}>Contraseña</Text>
                <Text style={styles.currentEmail}>••••••••</Text>
                {isEditingPassword ? (
                    <View style={styles.changeForm}>
                        <TextInput
                            label="Contraseña actual"
                            value={editContrasenaActual}
                            onChangeText={setEditContrasenaActual}
                            mode="outlined"
                            secureTextEntry={!showPassword}
                            style={styles.input}
                            right={
                                <TextInput.Icon
                                    icon={showPassword ? 'eye-off' : 'eye'}
                                    onPress={() => setShowPassword(!showPassword)}
                                />
                            }
                        />
                        <TextInput
                            label="Nueva contraseña"
                            value={editNuevaContrasena}
                            onChangeText={setEditNuevaContrasena}
                            mode="outlined"
                            secureTextEntry={!showPassword}
                            style={styles.input}
                        />
                        <TextInput
                            label="Confirmar contraseña"
                            value={editConfirmarContrasena}
                            onChangeText={setEditConfirmarContrasena}
                            mode="outlined"
                            secureTextEntry={!showPassword}
                            style={styles.input}
                        />
                        <View style={styles.editActions}>
                            <AppButton label="Cancelar" variant="outlined" onPress={cancelEditingPassword} style={styles.editBtn} />
                            <AppButton label="Guardar" onPress={savePassword} loading={isSavingPassword} style={styles.editBtn} />
                        </View>
                    </View>
                ) : (
                    <AppButton label="Cambiar contraseña" variant="outlined" icon="lock-reset" onPress={startEditingPassword} style={styles.changeBtn} />
                )}
            </AppCard>

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
            <AppConfirmDialog
                visible={emailConfirmVisible}
                title="Cambiar correo"
                message={`¿Está seguro de cambiar su correo a ${editNuevoCorreo.trim()}? Se cerrarán todas sus sesiones activas y deberá iniciar sesión nuevamente.`}
                confirmLabel="Cambiar"
                destructive={false}
                onConfirm={performEmailChange}
                onCancel={() => setEmailConfirmVisible(false)}
            />
            <AppConfirmDialog
                visible={confirmDialog.visible && confirmDialog.type === 'unlink'}
                title="Desasociarse del adulto mayor"
                message={`¿Está seguro de desasociarse de ${confirmDialog.assignment?.patients?.first_name ?? 'este adulto mayor'}? No tendrá acceso a sus datos.`}
                confirmLabel="Desasociarme"
                destructive
                onConfirm={handleConfirmUnlink}
                onCancel={() => setConfirmDialog((prev) => ({ ...prev, visible: false }))}
            />
            <AppConfirmDialog
                visible={confirmDialog.visible && confirmDialog.type === 'logout'}
                title="Cerrar sesión"
                message="¿Desea cerrar sesión?"
                confirmLabel="Cerrar sesión"
                destructive={false}
                onConfirm={() => { setConfirmDialog((prev) => ({ ...prev, visible: false })); void performLogout(); }}
                onCancel={() => setConfirmDialog((prev) => ({ ...prev, visible: false }))}
            />
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
    cardDivider: { marginVertical: 16 },
    viewFields: { gap: 12 },
    fieldRow: { gap: 2 },
    fieldLabel: { fontFamily: 'Montserrat_600SemiBold', fontSize: 12, color: '#6b7280' },
    fieldValue: { fontFamily: 'Montserrat_400Regular', fontSize: 15, color: '#1f2937' },
    editProfileBtn: { marginTop: 8, alignSelf: 'flex-start' },
    editForm: { gap: 12 },
    input: { fontFamily: 'Montserrat_400Regular' },
    editActions: { flexDirection: 'row', gap: 12, marginTop: 4 },
    editBtn: { flex: 1 },
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
    changeCard: { marginBottom: 12 },
    currentEmail: { fontFamily: 'Montserrat_400Regular', fontSize: 14, color: '#6b7280', marginBottom: 8 },
    changeForm: { gap: 12, marginTop: 4 },
    changeBtn: { alignSelf: 'flex-start' },
});
