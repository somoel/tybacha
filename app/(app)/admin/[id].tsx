import {
    fetchApiUserDetail,
    fetchApiUsers,
    updateApiProfessionalCaregivers,
    updateApiUser,
} from '@/src/api/usersApi';
import { AppButton } from '@/src/components/ui/AppButton';
import { AppCard } from '@/src/components/ui/AppCard';
import { AppInput } from '@/src/components/ui/AppInput';
import { AppLoader } from '@/src/components/ui/AppLoader';
import { AppSnackbar } from '@/src/components/ui/AppSnackbar';
import type { ApiAdminUserDetail, ApiUserSummary } from '@/src/types/apiUser.types';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SegmentedButtons, Text } from 'react-native-paper';
import { z } from 'zod';

const editSchema = z.object({
    nombres: z.string().min(1, 'Requerido'),
    apellidos: z.string().min(1, 'Requerido'),
    correo: z.string().email('Correo invalido'),
    contrasena: z.string().refine((value) => value.length === 0 || value.length >= 8, 'Minimo 8 caracteres'),
    telefono: z.string(),
    ciudad: z.string(),
    tipoDocumento: z.string(),
    numeroDocumento: z.string(),
    direccion: z.string(),
    fechaNacimiento: z.string(),
    genero: z.enum(['femenino', 'masculino', '']).optional(),
    estado: z.enum(['pendiente', 'activo', 'bloqueado', 'inactivo']),
});

type EditForm = z.infer<typeof editSchema>;

function userName(user: ApiUserSummary): string {
    return [user.nombres, user.apellidos].filter(Boolean).join(' ') || user.correo;
}

function roleLabel(role: ApiUserSummary['rol']): string {
    return role === 'profesional' ? 'Profesional' : role === 'cuidador' ? 'Cuidador' : 'Administrador';
}

export default function AdminUserDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const [user, setUser] = useState<ApiAdminUserDetail | null>(null);
    const [allUsers, setAllUsers] = useState<ApiUserSummary[]>([]);
    const [selectedCaregiverIds, setSelectedCaregiverIds] = useState<number[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isSavingCaregivers, setIsSavingCaregivers] = useState(false);
    const [snackbar, setSnackbar] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' });

    const { control, handleSubmit, reset } = useForm<EditForm>({
        resolver: zodResolver(editSchema),
        defaultValues: {
            nombres: '', apellidos: '', correo: '', contrasena: '', telefono: '', ciudad: '',
            tipoDocumento: '', numeroDocumento: '', direccion: '', fechaNacimiento: '', genero: '', estado: 'activo',
        },
    });

    const load = useCallback(async () => {
        if (!id) return;
        setIsLoading(true);
        try {
            const [detail, users] = await Promise.all([fetchApiUserDetail(Number(id)), fetchApiUsers()]);
            setUser(detail);
            setAllUsers(users);
            setSelectedCaregiverIds(detail.cuidadores.map((caregiver) => caregiver.idUsuario));
            reset({
                nombres: detail.nombres ?? '',
                apellidos: detail.apellidos ?? '',
                correo: detail.correo,
                contrasena: '',
                telefono: detail.telefono ?? '',
                ciudad: detail.ciudad ?? '',
                tipoDocumento: detail.tipoDocumento ?? '',
                numeroDocumento: detail.numeroDocumento ?? '',
                direccion: detail.direccion ?? '',
                fechaNacimiento: detail.fechaNacimiento ?? '',
                genero: detail.genero ?? '',
                estado: detail.estado,
            });
        } catch (error) {
            setSnackbar({ visible: true, message: error instanceof Error ? error.message : 'Error cargando usuario', type: 'error' });
        } finally {
            setIsLoading(false);
        }
    }, [id, reset]);

    useEffect(() => { void load(); }, [load]);

    const availableCaregivers = useMemo(
        () => allUsers.filter((candidate) => candidate.rol === 'cuidador'
            && (candidate.estado !== 'inactivo' || selectedCaregiverIds.includes(candidate.idUsuario))),
        [allUsers, selectedCaregiverIds],
    );

    const onSubmit = async (data: EditForm) => {
        if (!user) return;
        setIsSaving(true);
        try {
            const updated = await updateApiUser(user.idUsuario, {
                nombres: data.nombres,
                apellidos: data.apellidos,
                correo: data.correo,
                contrasena: data.contrasena || undefined,
                estado: data.estado,
                telefono: data.telefono || undefined,
                ciudad: data.ciudad || undefined,
                tipoDocumento: data.tipoDocumento || undefined,
                numeroDocumento: data.numeroDocumento || undefined,
                direccion: data.direccion || undefined,
                fechaNacimiento: data.fechaNacimiento || undefined,
                genero: data.genero || undefined,
            });
            setUser(updated);
            reset({ ...data, contrasena: '' });
            setSnackbar({ visible: true, message: 'Usuario actualizado correctamente', type: 'success' });
        } catch (error) {
            setSnackbar({ visible: true, message: error instanceof Error ? error.message : 'Error actualizando usuario', type: 'error' });
        } finally {
            setIsSaving(false);
        }
    };

    const toggleCaregiver = (caregiverId: number) => {
        setSelectedCaregiverIds((current) => current.includes(caregiverId)
            ? current.filter((idValue) => idValue !== caregiverId)
            : [...current, caregiverId]);
    };

    const saveCaregivers = async () => {
        if (!user || user.rol !== 'profesional') return;
        setIsSavingCaregivers(true);
        try {
            const updated = await updateApiProfessionalCaregivers(user.idUsuario, selectedCaregiverIds);
            setUser(updated);
            setSelectedCaregiverIds(updated.cuidadores.map((caregiver) => caregiver.idUsuario));
            setSnackbar({ visible: true, message: 'Cuidadores asignados correctamente', type: 'success' });
        } catch (error) {
            setSnackbar({ visible: true, message: error instanceof Error ? error.message : 'Error actualizando cuidadores', type: 'error' });
            await load();
        } finally {
            setIsSavingCaregivers(false);
        }
    };

    if (isLoading) return <AppLoader />;
    if (!user) return <View style={styles.center}><Text>Usuario no encontrado.</Text></View>;

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content} contentInsetAdjustmentBehavior="automatic">
            <AppCard>
                <View style={styles.titleRow}>
                    <View style={styles.avatar}><Text style={styles.avatarText}>{(user.nombres ?? user.correo)[0]?.toUpperCase()}</Text></View>
                    <View style={styles.titleInfo}>
                        <Text style={styles.title}>{userName(user)}</Text>
                        <Text style={styles.subtitle}>{roleLabel(user.rol)}</Text>
                    </View>
                </View>
            </AppCard>

            <AppCard>
                <Text style={styles.sectionTitle}>Datos y acceso</Text>
                <AppInput control={control} name="nombres" label="Nombres" />
                <AppInput control={control} name="apellidos" label="Apellidos" />
                <AppInput control={control} name="correo" label="Correo" keyboardType="email-address" autoCapitalize="none" />
                <AppInput control={control} name="contrasena" label="Nueva contraseña (opcional)" secureTextEntry />
                <AppInput control={control} name="telefono" label="Telefono" keyboardType="phone-pad" />
                <AppInput control={control} name="ciudad" label="Ciudad" />
                <Text style={styles.fieldLabel}>Estado</Text>
                <Controller
                    control={control}
                    name="estado"
                    render={({ field: { value, onChange } }) => (
                        <SegmentedButtons
                            value={value}
                            onValueChange={onChange}
                            buttons={[{ value: 'activo', label: 'Activo' }, { value: 'pendiente', label: 'Pendiente' }, { value: 'inactivo', label: 'Inactivo' }, { value: 'bloqueado', label: 'Bloqueado' }]}
                        />
                    )}
                />
                <Text style={styles.sectionSubtitle}>Datos adicionales</Text>
                <AppInput control={control} name="tipoDocumento" label="Tipo de documento" />
                <AppInput control={control} name="numeroDocumento" label="Numero de documento" />
                <AppInput control={control} name="direccion" label="Direccion" />
                <AppInput control={control} name="fechaNacimiento" label="Fecha de nacimiento (YYYY-MM-DD)" />
                <Text style={styles.fieldLabel}>Genero</Text>
                <Controller
                    control={control}
                    name="genero"
                    render={({ field: { value, onChange } }) => (
                        <SegmentedButtons value={value ?? ''} onValueChange={onChange} buttons={[{ value: 'femenino', label: 'Femenino' }, { value: 'masculino', label: 'Masculino' }]} />
                    )}
                />
                <AppButton label="Guardar datos" icon="content-save" loading={isSaving} onPress={handleSubmit(onSubmit)} style={styles.button} />
            </AppCard>

            {user.rol === 'profesional' && (
                <AppCard>
                    <View style={styles.sectionHeader}>
                        <View style={styles.titleInfo}>
                            <Text style={styles.sectionTitle}>Cuidadores asignados</Text>
                            <Text style={styles.helper}>{selectedCaregiverIds.length} seleccionados</Text>
                        </View>
                        <MaterialCommunityIcons name="account-heart" size={24} color="#006d77" />
                    </View>
                    {availableCaregivers.length === 0 && <Text style={styles.empty}>No hay cuidadores disponibles.</Text>}
                    {availableCaregivers.map((caregiver) => {
                        const selected = selectedCaregiverIds.includes(caregiver.idUsuario);
                        return (
                            <View key={caregiver.idUsuario} style={styles.caregiverRow}>
                                <Pressable onPress={() => toggleCaregiver(caregiver.idUsuario)} style={styles.caregiverSelect} accessibilityRole="checkbox" accessibilityState={{ checked: selected }}>
                                    <MaterialCommunityIcons name={selected ? 'checkbox-marked' : 'checkbox-blank-outline'} size={24} color={selected ? '#006d77' : '#94a3b8'} />
                                    <View style={styles.titleInfo}>
                                        <Text style={styles.caregiverName}>{userName(caregiver)}</Text>
                                        <Text style={styles.caregiverMeta}>{caregiver.correo} · {caregiver.estado}</Text>
                                    </View>
                                </Pressable>
                                <Pressable onPress={() => router.push(`/(app)/admin/${caregiver.idUsuario}` as never)} hitSlop={8} accessibilityLabel={`Editar ${userName(caregiver)}`}>
                                    <MaterialCommunityIcons name="pencil-outline" size={21} color="#006d77" />
                                </Pressable>
                            </View>
                        );
                    })}
                    <AppButton label="Guardar asignaciones" icon="account-check" loading={isSavingCaregivers} onPress={() => void saveCaregivers()} style={styles.button} />
                </AppCard>
            )}

            <AppSnackbar visible={snackbar.visible} message={snackbar.message} type={snackbar.type} onDismiss={() => setSnackbar((state) => ({ ...state, visible: false }))} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    content: { padding: 16, gap: 12, paddingBottom: 40 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc' },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    titleInfo: { flex: 1 },
    avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#d9f0ef', alignItems: 'center', justifyContent: 'center' },
    avatarText: { fontFamily: 'Montserrat_800ExtraBold', color: '#006d77', fontSize: 20 },
    title: { fontFamily: 'Montserrat_700Bold', fontSize: 17, color: '#1f2937' },
    subtitle: { fontFamily: 'Montserrat_500Medium', fontSize: 12, color: '#006d77', marginTop: 2 },
    sectionTitle: { fontFamily: 'Montserrat_700Bold', fontSize: 16, color: '#1f2937', marginBottom: 12 },
    sectionSubtitle: { fontFamily: 'Montserrat_700Bold', fontSize: 14, color: '#374151', marginTop: 8, marginBottom: 10 },
    fieldLabel: { fontFamily: 'Montserrat_600SemiBold', fontSize: 13, color: '#374151', marginBottom: 8 },
    button: { marginTop: 16 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center' },
    helper: { fontFamily: 'Montserrat_400Regular', fontSize: 12, color: '#6b7280', marginTop: -8, marginBottom: 10 },
    caregiverRow: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#eef2f5', paddingVertical: 12, gap: 8 },
    caregiverSelect: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
    caregiverName: { fontFamily: 'Montserrat_600SemiBold', fontSize: 13, color: '#1f2937' },
    caregiverMeta: { fontFamily: 'Montserrat_400Regular', fontSize: 11, color: '#6b7280', marginTop: 2 },
    empty: { fontFamily: 'Montserrat_400Regular', color: '#6b7280', paddingVertical: 8 },
});
