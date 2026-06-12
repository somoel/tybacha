import { AppButton } from '@/src/components/ui/AppButton';
import { AppCard } from '@/src/components/ui/AppCard';
import { AppConfirmDialog } from '@/src/components/ui/AppConfirmDialog';
import { AppSnackbar } from '@/src/components/ui/AppSnackbar';
import { usePermissions } from '@/src/hooks/usePermissions';
import { useSyncQueue } from '@/src/hooks/useSyncQueue';
import { fetchCaregiverAssignments, unassignCaregiver } from '@/src/services/patientService';
import { useAuthStore } from '@/src/stores/authStore';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, LayoutAnimation, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Divider, Text, TextInput, useTheme } from 'react-native-paper';

interface Assignment {
    id: string;
    patient_id: string;
    patients: { first_name: string; first_lastname: string } | null;
}

function AvatarInitials({ name, size }: { name: string; size: number }) {
    const initials = name
        .split(' ')
        .filter(Boolean)
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();

    return (
        <View style={[styles.avatarCircle, { width: size, height: size, borderRadius: size / 2 }]}>
            <Text style={[styles.avatarInitials, { fontSize: size * 0.38 }]}>
                {initials || '?'}
            </Text>
        </View>
    );
}

function ProfileFieldRow({ icon, label, value }: { icon: string; label: string; value: string | null | undefined }) {
    return (
        <View style={styles.fieldRow}>
            <MaterialCommunityIcons name={icon as keyof typeof MaterialCommunityIcons.glyphMap} size={20} color="#94a3b8" style={styles.fieldIcon} />
            <View style={styles.fieldContent}>
                <Text style={styles.fieldLabel}>{label}</Text>
                <Text selectable style={styles.fieldValue}>{value || '-'}</Text>
            </View>
        </View>
    );
}

export default function ProfileScreen() {
    const theme = useTheme();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { user, profile, role, logout, updateProfile, changeEmail, changePassword } = useAuthStore();
    const { isCaregiver } = usePermissions();
    const { isOnline, isSyncing, pendingCount, syncNow } = useSyncQueue();

    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [snackbar, setSnackbar] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' });

    const [confirmDialog, setConfirmDialog] = useState<{ visible: boolean; type: 'unlink' | 'logout'; assignment?: Assignment }>({
        visible: false,
        type: 'logout',
    });

    const [editingSection, setEditingSection] = useState<null | 'profile' | 'email' | 'password'>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [editNombres, setEditNombres] = useState('');
    const [editApellidos, setEditApellidos] = useState('');
    const [editTelefono, setEditTelefono] = useState('');
    const [editCiudad, setEditCiudad] = useState('');

    const [isSavingEmail, setIsSavingEmail] = useState(false);
    const [editNuevoCorreo, setEditNuevoCorreo] = useState('');
    const [editEmailContrasena, setEditEmailContrasena] = useState('');

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

    const startEditingProfile = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        if (editingSection === 'profile') {
            setEditingSection(null);
            return;
        }
        setEditNombres(profile?.nombres ?? '');
        setEditApellidos(profile?.apellidos ?? '');
        setEditTelefono(profile?.telefono ?? '');
        setEditCiudad(profile?.ciudad ?? '');
        setEditingSection('profile');
    };

    const cancelEditingProfile = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setEditingSection(null);
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
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setEditingSection(null);
            setSnackbar({ visible: true, message: 'Perfil actualizado exitosamente', type: 'success' });
        } catch (error) {
            const msg = error instanceof Error ? error.message : 'Error al actualizar el perfil.';
            setSnackbar({ visible: true, message: msg, type: 'error' });
        } finally {
            setIsSaving(false);
        }
    };

    const startEditingEmail = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        if (editingSection === 'email') {
            setEditingSection(null);
            return;
        }
        setEditNuevoCorreo(user?.email ?? '');
        setEditEmailContrasena('');
        setEditingSection('email');
    };

    const cancelEditingEmail = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setEditingSection(null);
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
            setEditingSection(null);
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
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        if (editingSection === 'password') {
            setEditingSection(null);
            return;
        }
        setEditContrasenaActual('');
        setEditNuevaContrasena('');
        setEditConfirmarContrasena('');
        setEditingSection('password');
    };

    const cancelEditingPassword = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setEditingSection(null);
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
            setEditingSection(null);
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
    const roleIcon = role === 'administrador' ? 'shield-account' : role === 'profesional' ? 'stethoscope' : 'account-heart';

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentInsetAdjustmentBehavior="automatic"
            >
                <LinearGradient
                    colors={['#006d77', '#80cbc4']}
                    style={[styles.header, { paddingTop: insets.top + 24 }]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    <View style={styles.headerContent}>
                        <View style={styles.headerTop}>
                            <AvatarInitials name={userName} size={88} />
                            <Pressable
                                style={styles.headerEditBtn}
                                onPress={startEditingProfile}
                                accessibilityLabel={editingSection === 'profile' ? 'Cerrar edición' : 'Editar perfil'}
                            >
                                <MaterialCommunityIcons
                                    name={editingSection === 'profile' ? 'close' : 'pencil-outline'}
                                    size={20}
                                    color="#FFFFFF"
                                />
                            </Pressable>
                        </View>

                        <Text style={styles.headerName}>{userName}</Text>
                        <Text style={styles.headerEmail}>{user?.email ?? ''}</Text>

                        <View style={styles.headerBadges}>
                            <View style={styles.badge}>
                                <MaterialCommunityIcons name={roleIcon} size={14} color="rgba(255,255,255,0.9)" />
                                <Text style={styles.badgeText}>{roleLabel}</Text>
                            </View>

                            {pendingCount > 0 && isOnline ? (
                                <Pressable style={styles.badge} onPress={handleManualSync} disabled={isSyncing}>
                                    <MaterialCommunityIcons
                                        name={isSyncing ? 'cloud-sync' : 'cloud-alert'}
                                        size={14}
                                        color="rgba(255,255,255,0.9)"
                                    />
                                    <Text style={styles.badgeText}>{pendingCount} pendientes</Text>
                                </Pressable>
                            ) : (
                                <View style={styles.badge}>
                                    <MaterialCommunityIcons
                                        name={isOnline ? 'cloud-check' : 'cloud-off-outline'}
                                        size={14}
                                        color="rgba(255,255,255,0.9)"
                                    />
                                    <Text style={styles.badgeText}>
                                        {isOnline ? 'Conectado' : 'Sin conexión'}
                                    </Text>
                                </View>
                            )}
                        </View>
                    </View>
                </LinearGradient>

                <View style={styles.content}>
                    <AppCard style={styles.infoCard}>
                        <View style={styles.sectionHeaderRow}>
                            <Text style={styles.sectionTitle}>Información personal</Text>
                            {editingSection !== 'profile' && (
                                <Pressable onPress={startEditingProfile} hitSlop={8} style={styles.editLabelBtn}>
                                    <MaterialCommunityIcons name="pencil-outline" size={14} color="#006d77" />
                                    <Text style={styles.editLabelText}>Editar</Text>
                                </Pressable>
                            )}
                        </View>

                        {editingSection === 'profile' ? (
                            <View style={styles.editForm}>
                                <TextInput
                                    label="Nombres"
                                    value={editNombres}
                                    onChangeText={setEditNombres}
                                    mode="outlined"
                                    style={styles.input}
                                    left={<TextInput.Icon icon="account-outline" />}
                                />
                                <TextInput
                                    label="Apellidos"
                                    value={editApellidos}
                                    onChangeText={setEditApellidos}
                                    mode="outlined"
                                    style={styles.input}
                                    left={<TextInput.Icon icon="card-account-details-outline" />}
                                />
                                <TextInput
                                    label="Teléfono"
                                    value={editTelefono}
                                    onChangeText={setEditTelefono}
                                    mode="outlined"
                                    keyboardType="phone-pad"
                                    style={styles.input}
                                    left={<TextInput.Icon icon="phone-outline" />}
                                />
                                <TextInput
                                    label="Ciudad"
                                    value={editCiudad}
                                    onChangeText={setEditCiudad}
                                    mode="outlined"
                                    style={styles.input}
                                    left={<TextInput.Icon icon="map-marker-outline" />}
                                />
                                <View style={styles.editActions}>
                                    <AppButton
                                        label="Cancelar"
                                        variant="outlined"
                                        onPress={cancelEditingProfile}
                                        style={styles.editBtn}
                                    />
                                    <AppButton
                                        label="Guardar cambios"
                                        onPress={saveProfile}
                                        loading={isSaving}
                                        style={styles.editBtn}
                                    />
                                </View>
                            </View>
                        ) : (
                            <View style={styles.fieldsList}>
                                <ProfileFieldRow icon="account-outline" label="Nombres" value={profile?.nombres} />
                                <Divider style={styles.fieldDivider} />
                                <ProfileFieldRow icon="card-account-details-outline" label="Apellidos" value={profile?.apellidos} />
                                <Divider style={styles.fieldDivider} />
                                <ProfileFieldRow icon="phone-outline" label="Teléfono" value={profile?.telefono} />
                                <Divider style={styles.fieldDivider} />
                                <ProfileFieldRow icon="map-marker-outline" label="Ciudad" value={profile?.ciudad} />
                            </View>
                        )}
                    </AppCard>

                    <AppCard style={styles.securityCard}>
                        <View style={styles.sectionHeaderRow}>
                            <Text style={styles.sectionTitle}>Seguridad</Text>
                        </View>

                        <View style={styles.securityRow}>
                            <View style={styles.securityRowLeft}>
                                <MaterialCommunityIcons name="email-outline" size={22} color="#94a3b8" />
                                <View style={styles.securityRowInfo}>
                                    <Text style={styles.securityRowLabel}>Correo electrónico</Text>
                                    <Text style={styles.securityRowValue} numberOfLines={1}>{user?.email ?? ''}</Text>
                                </View>
                            </View>
                            {editingSection !== 'email' && (
                                <Pressable onPress={startEditingEmail} hitSlop={8}>
                                    <Text style={styles.securityActionText}>Cambiar</Text>
                                </Pressable>
                            )}
                        </View>

                        {editingSection === 'email' && (
                            <View style={styles.securityForm}>
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
                                    textContentType="password"
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
                        )}

                        <Divider style={styles.securityDivider} />

                        <View style={styles.securityRow}>
                            <View style={styles.securityRowLeft}>
                                <MaterialCommunityIcons name="lock-outline" size={22} color="#94a3b8" />
                                <View style={styles.securityRowInfo}>
                                    <Text style={styles.securityRowLabel}>Contraseña</Text>
                                    <Text style={styles.securityRowValue}>••••••••</Text>
                                </View>
                            </View>
                            {editingSection !== 'password' && (
                                <Pressable onPress={startEditingPassword} hitSlop={8}>
                                    <Text style={styles.securityActionText}>Cambiar</Text>
                                </Pressable>
                            )}
                        </View>

                        {editingSection === 'password' && (
                            <View style={styles.securityForm}>
                                <TextInput
                                    label="Contraseña actual"
                                    value={editContrasenaActual}
                                    onChangeText={setEditContrasenaActual}
                                    mode="outlined"
                                    secureTextEntry={!showPassword}
                                    textContentType="password"
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
                                    textContentType="newPassword"
                                    style={styles.input}
                                />
                                <TextInput
                                    label="Confirmar nueva contraseña"
                                    value={editConfirmarContrasena}
                                    onChangeText={setEditConfirmarContrasena}
                                    mode="outlined"
                                    secureTextEntry={!showPassword}
                                    textContentType="newPassword"
                                    style={styles.input}
                                />
                                <View style={styles.editActions}>
                                    <AppButton label="Cancelar" variant="outlined" onPress={cancelEditingPassword} style={styles.editBtn} />
                                    <AppButton label="Guardar" onPress={savePassword} loading={isSavingPassword} style={styles.editBtn} />
                                </View>
                            </View>
                        )}
                    </AppCard>

                    {isCaregiver && (
                        <>
                            <View style={styles.standaloneSection}>
                                <Text style={styles.sectionTitle}>Mis adultos mayores</Text>
                            </View>
                            {assignments.length === 0 ? (
                                <AppCard>
                                    <View style={styles.emptyContainer}>
                                        <MaterialCommunityIcons name="account-question" size={40} color={theme.colors.outline} />
                                        <Text style={styles.emptyText}>No tiene adultos mayores asignados.</Text>
                                    </View>
                                </AppCard>
                            ) : (
                                assignments.map((assignment) => (
                                    <AppCard key={assignment.id} style={styles.assignmentCard}>
                                        <View style={styles.assignmentRow}>
                                            <View style={styles.assignmentInfo}>
                                                <View style={[styles.assignmentAvatar, { backgroundColor: theme.colors.primaryContainer }]}>
                                                    <Text style={[styles.assignmentInitials, { color: theme.colors.onPrimaryContainer }]}>
                                                        {assignment.patients
                                                            ? `${assignment.patients.first_name[0]}${assignment.patients.first_lastname[0]}`.toUpperCase()
                                                            : '?'}
                                                    </Text>
                                                </View>
                                                <Text style={styles.assignmentName} numberOfLines={1}>
                                                    {assignment.patients
                                                        ? `${assignment.patients.first_name} ${assignment.patients.first_lastname}`
                                                        : 'Adulto mayor'}
                                                </Text>
                                            </View>
                                            <Pressable
                                                onPress={() => handleUnlink(assignment)}
                                                hitSlop={8}
                                                accessibilityLabel="Desasociar"
                                            >
                                                <MaterialCommunityIcons name="link-variant-off" size={20} color="#c62828" />
                                            </Pressable>
                                        </View>
                                    </AppCard>
                                ))
                            )}
                        </>
                    )}

                    <View style={styles.logoutSection}>
                        <AppButton
                            label="Cerrar sesión"
                            variant="outlined-error"
                            icon="logout"
                            onPress={handleLogout}
                            accessibilityLabel="Cerrar sesión"
                        />
                    </View>

                    <View style={styles.bottomPad} />
                </View>

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
                <AppSnackbar
                    visible={snackbar.visible}
                    message={snackbar.message}
                    type={snackbar.type}
                    onDismiss={() => setSnackbar((s) => ({ ...s, visible: false }))}
                />
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    header: {
        paddingBottom: 32,
        paddingHorizontal: 24,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
    },
    headerContent: {},
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    headerEditBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.15)',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 24,
    },
    avatarCircle: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    avatarInitials: {
        fontFamily: 'Montserrat_700Bold',
        color: '#FFFFFF',
    },
    headerName: {
        fontFamily: 'Montserrat_700Bold',
        fontSize: 24,
        color: '#FFFFFF',
        marginTop: 16,
    },
    headerEmail: {
        fontFamily: 'Montserrat_400Regular',
        fontSize: 14,
        color: 'rgba(255,255,255,0.7)',
        marginTop: 2,
    },
    headerBadges: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 12,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(255,255,255,0.15)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    badgeText: {
        fontFamily: 'Montserrat_500Medium',
        fontSize: 12,
        color: 'rgba(255,255,255,0.9)',
    },
    content: {
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 40,
    },
    infoCard: {
        marginTop: -16,
        marginBottom: 12,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    sectionTitle: {
        fontFamily: 'Montserrat_700Bold',
        fontSize: 16,
        color: '#1f2937',
    },
    editLabelBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingVertical: 4,
        paddingHorizontal: 8,
    },
    editLabelText: {
        fontFamily: 'Montserrat_600SemiBold',
        fontSize: 13,
        color: '#006d77',
    },
    fieldsList: {},
    fieldRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    fieldIcon: {},
    fieldContent: {
        flex: 1,
    },
    fieldLabel: {
        fontFamily: 'Montserrat_500Medium',
        fontSize: 12,
        color: '#6b7280',
    },
    fieldValue: {
        fontFamily: 'Montserrat_400Regular',
        fontSize: 15,
        color: '#1f2937',
        marginTop: 1,
    },
    fieldDivider: {
        marginVertical: 12,
    },
    input: {
        fontFamily: 'Montserrat_400Regular',
    },
    editForm: {
        gap: 12,
    },
    editActions: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 4,
    },
    editBtn: {
        flex: 1,
    },
    securityCard: {
        marginBottom: 12,
    },
    securityRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 4,
    },
    securityRowLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    securityRowInfo: {
        flex: 1,
    },
    securityRowLabel: {
        fontFamily: 'Montserrat_600SemiBold',
        fontSize: 14,
        color: '#1f2937',
    },
    securityRowValue: {
        fontFamily: 'Montserrat_400Regular',
        fontSize: 13,
        color: '#6b7280',
        marginTop: 1,
    },
    securityActionText: {
        fontFamily: 'Montserrat_600SemiBold',
        fontSize: 13,
        color: '#006d77',
    },
    securityForm: {
        gap: 12,
        marginTop: 12,
    },
    securityDivider: {
        marginVertical: 16,
    },
    standaloneSection: {
        paddingHorizontal: 0,
        paddingTop: 8,
        paddingBottom: 4,
    },
    assignmentCard: {
        marginBottom: 0,
    },
    assignmentRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    assignmentInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    assignmentAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    assignmentInitials: {
        fontFamily: 'Montserrat_700Bold',
        fontSize: 14,
    },
    assignmentName: {
        fontFamily: 'Montserrat_500Medium',
        fontSize: 14,
        color: '#1f2937',
        flex: 1,
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
    logoutSection: {
        marginTop: 24,
    },
    bottomPad: {
        height: 24,
    },
});
