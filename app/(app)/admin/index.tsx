import { createApiUser, fetchApiUsers } from '@/src/api/usersApi';
import { fetchApiAuditChanges, fetchApiAuditDataAccess } from '@/src/api/auditApi';
import { AppButton } from '@/src/components/ui/AppButton';
import { AppCard } from '@/src/components/ui/AppCard';
import { AppInput } from '@/src/components/ui/AppInput';
import { AppSnackbar } from '@/src/components/ui/AppSnackbar';
import { usePermissions } from '@/src/hooks/usePermissions';
import type { ApiUserRole } from '@/src/types/apiAuth.types';
import type { ApiUserSummary } from '@/src/types/apiUser.types';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import React, { useCallback, useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SegmentedButtons, Text } from 'react-native-paper';
import { z } from 'zod';

const userSchema = z.object({
    correo: z.string().email('Correo invalido'),
    contrasena: z.string().min(8, 'Minimo 8 caracteres'),
    rol: z.enum(['administrador', 'profesional', 'cuidador']),
    nombres: z.string().min(1, 'Requerido'),
    apellidos: z.string().min(1, 'Requerido'),
});

type UserForm = z.infer<typeof userSchema>;

export default function AdminScreen() {
    const { isAdmin, isProfessional } = usePermissions();
    const [users, setUsers] = useState<ApiUserSummary[]>([]);
    const [auditCount, setAuditCount] = useState(0);
    const [accessCount, setAccessCount] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [snackbar, setSnackbar] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' });

    const { control, handleSubmit, reset } = useForm<UserForm>({
        resolver: zodResolver(userSchema),
        defaultValues: {
            correo: '',
            contrasena: '',
            rol: isAdmin ? 'profesional' : 'cuidador',
            nombres: '',
            apellidos: '',
        },
    });

    const load = useCallback(async () => {
        setIsLoading(true);
        try {
            const [userRows, changes, access] = await Promise.all([
                fetchApiUsers(),
                isAdmin ? fetchApiAuditChanges(undefined, 20) : Promise.resolve([]),
                isAdmin ? fetchApiAuditDataAccess(undefined, 20) : Promise.resolve([]),
            ]);
            setUsers(userRows);
            setAuditCount(changes.length);
            setAccessCount(access.length);
        } catch (error) {
            setSnackbar({
                visible: true,
                message: error instanceof Error ? error.message : 'Error cargando administracion',
                type: 'error',
            });
        } finally {
            setIsLoading(false);
        }
    }, [isAdmin]);

    useEffect(() => {
        if (isAdmin || isProfessional) {
            void load();
        }
    }, [isAdmin, isProfessional, load]);

    const onSubmit = async (data: UserForm) => {
        setIsLoading(true);
        try {
            await createApiUser(data);
            reset({
                correo: '',
                contrasena: '',
                rol: isAdmin ? 'profesional' : 'cuidador',
                nombres: '',
                apellidos: '',
            });
            await load();
            setSnackbar({ visible: true, message: 'Usuario creado', type: 'success' });
        } catch (error) {
            setSnackbar({
                visible: true,
                message: error instanceof Error ? error.message : 'Error creando usuario',
                type: 'error',
            });
        } finally {
            setIsLoading(false);
        }
    };

    if (!isAdmin && !isProfessional) {
        return (
            <View style={styles.center}>
                <MaterialCommunityIcons name="lock-alert-outline" size={42} color="#6b7280" />
                <Text style={styles.empty}>No tiene permisos para administrar usuarios.</Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <Text style={styles.title}>Administracion</Text>

            <View style={styles.metrics}>
                <AppCard style={styles.metric}>
                    <Text style={styles.metricNumber}>{users.length}</Text>
                    <Text style={styles.metricLabel}>Usuarios</Text>
                </AppCard>
                {isAdmin && (
                    <>
                        <AppCard style={styles.metric}>
                            <Text style={styles.metricNumber}>{auditCount}</Text>
                            <Text style={styles.metricLabel}>Cambios</Text>
                        </AppCard>
                        <AppCard style={styles.metric}>
                            <Text style={styles.metricNumber}>{accessCount}</Text>
                            <Text style={styles.metricLabel}>Accesos</Text>
                        </AppCard>
                    </>
                )}
            </View>

            <AppCard>
                <Text style={styles.sectionTitle}>Crear usuario</Text>
                <AppInput control={control} name="nombres" label="Nombres" />
                <AppInput control={control} name="apellidos" label="Apellidos" />
                <AppInput control={control} name="correo" label="Correo" keyboardType="email-address" autoCapitalize="none" />
                <AppInput control={control} name="contrasena" label="Contrasena" secureTextEntry />
                <Text style={styles.fieldLabel}>Rol</Text>
                <Controller
                    control={control}
                    name="rol"
                    render={({ field: { value, onChange } }) => (
                        <SegmentedButtons
                            value={value}
                            onValueChange={(next) => onChange(next as ApiUserRole)}
                            buttons={isAdmin ? [
                                { value: 'administrador', label: 'Admin' },
                                { value: 'profesional', label: 'Profesional' },
                                { value: 'cuidador', label: 'Cuidador' },
                            ] : [
                                { value: 'cuidador', label: 'Cuidador' },
                            ]}
                        />
                    )}
                />
                <AppButton
                    label="Crear usuario"
                    icon="account-plus"
                    variant="filled"
                    loading={isLoading}
                    onPress={handleSubmit(onSubmit)}
                    style={styles.submit}
                />
            </AppCard>

            <Text style={styles.sectionTitle}>Usuarios recientes</Text>
            {users.slice(0, 10).map((user) => (
                <AppCard key={user.idUsuario}>
                    <View style={styles.userRow}>
                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>{(user.nombres ?? user.correo)[0]?.toUpperCase()}</Text>
                        </View>
                        <View style={styles.userInfo}>
                            <Text style={styles.userName}>{user.nombres} {user.apellidos}</Text>
                            <Text style={styles.userMeta}>{user.correo} · {user.rol}</Text>
                        </View>
                    </View>
                </AppCard>
            ))}

            <AppSnackbar
                visible={snackbar.visible}
                message={snackbar.message}
                type={snackbar.type}
                onDismiss={() => setSnackbar((state) => ({ ...state, visible: false }))}
            />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    content: { padding: 16, paddingBottom: 40 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#f8fafc' },
    empty: { fontFamily: 'Montserrat_500Medium', fontSize: 14, color: '#6b7280', textAlign: 'center', marginTop: 8 },
    title: { fontFamily: 'Montserrat_800ExtraBold', fontSize: 24, color: '#1f2937', marginBottom: 16 },
    metrics: { flexDirection: 'row', gap: 8, marginBottom: 16 },
    metric: { flex: 1 },
    metricNumber: { fontFamily: 'Montserrat_800ExtraBold', fontSize: 24, color: '#006d77', textAlign: 'center' },
    metricLabel: { fontFamily: 'Montserrat_500Medium', fontSize: 11, color: '#6b7280', textAlign: 'center' },
    sectionTitle: { fontFamily: 'Montserrat_700Bold', fontSize: 16, color: '#1f2937', marginBottom: 12, marginTop: 8 },
    fieldLabel: { fontFamily: 'Montserrat_600SemiBold', fontSize: 13, color: '#374151', marginBottom: 8 },
    submit: { marginTop: 16 },
    userRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#d9f0ef', alignItems: 'center', justifyContent: 'center' },
    avatarText: { fontFamily: 'Montserrat_800ExtraBold', color: '#006d77' },
    userInfo: { flex: 1 },
    userName: { fontFamily: 'Montserrat_700Bold', fontSize: 14, color: '#1f2937' },
    userMeta: { fontFamily: 'Montserrat_400Regular', fontSize: 12, color: '#6b7280' },
});
