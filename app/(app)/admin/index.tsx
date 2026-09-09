import { createApiUser, fetchApiProfessionals } from '@/src/api/usersApi';
import { fetchApiAuditChanges, fetchApiAuditDataAccess } from '@/src/api/auditApi';
import { testExercisePlanAiApi } from '@/src/api/exercisePlansApi';
import { AppButton } from '@/src/components/ui/AppButton';
import { AppCard } from '@/src/components/ui/AppCard';
import { AppInput } from '@/src/components/ui/AppInput';
import { AppSnackbar } from '@/src/components/ui/AppSnackbar';
import type { ApiUserRole } from '@/src/types/apiAuth.types';
import type { ApiUserSummary } from '@/src/types/apiUser.types';
import type { ApiAiTestResult } from '@/src/types/apiExercisePlan.types';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Searchbar, SegmentedButtons, Text } from 'react-native-paper';
import { z } from 'zod';

const userSchema = z.object({
    correo: z.string().email('Correo invalido'),
    contrasena: z.string().min(8, 'Minimo 8 caracteres'),
    rol: z.enum(['administrador', 'profesional']),
    nombres: z.string().min(1, 'Requerido'),
    apellidos: z.string().min(1, 'Requerido'),
});

type UserForm = z.infer<typeof userSchema>;

export default function AdminScreen() {
    const router = useRouter();
    const [users, setUsers] = useState<ApiUserSummary[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [auditCount, setAuditCount] = useState(0);
    const [accessCount, setAccessCount] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [snackbar, setSnackbar] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' });
    const [isTestingAi, setIsTestingAi] = useState(false);
    const [aiTestResult, setAiTestResult] = useState<ApiAiTestResult | null>(null);

    const { control, handleSubmit, reset } = useForm<UserForm>({
        resolver: zodResolver(userSchema),
        defaultValues: {
            correo: '',
            contrasena: '',
            rol: 'profesional',
            nombres: '',
            apellidos: '',
        },
    });

    const load = useCallback(async () => {
        setIsLoading(true);
        try {
            const [userRows, changes, access] = await Promise.all([
                fetchApiProfessionals(),
                fetchApiAuditChanges(undefined, 20),
                fetchApiAuditDataAccess(undefined, 20),
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
    }, []);

    useEffect(() => {
        void load();
    }, [load]);

    const filteredUsers = useMemo(() => {
        const normalizedQuery = searchQuery.trim().toLocaleLowerCase();
        if (!normalizedQuery) return users;

        return users.filter((user) => [user.nombres, user.apellidos, user.correo, user.ciudad]
            .filter(Boolean)
            .join(' ')
            .toLocaleLowerCase()
            .includes(normalizedQuery));
    }, [searchQuery, users]);

    const onSubmit = async (data: UserForm) => {
        setIsLoading(true);
        try {
            await createApiUser(data);
            reset({ correo: '', contrasena: '', rol: 'profesional', nombres: '', apellidos: '' });
            setShowCreateForm(false);
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

    const handleTestAi = async () => {
        setIsTestingAi(true);
        setAiTestResult(null);
        try {
            const result = await testExercisePlanAiApi();
            setAiTestResult(result);
            setSnackbar({ visible: true, message: `API respondio en ${result.durationMs}ms`, type: 'success' });
        } catch (error) {
            setSnackbar({
                visible: true,
                message: error instanceof Error ? error.message : 'Error probando la API de IA',
                type: 'error',
            });
        } finally {
            setIsTestingAi(false);
        }
    };

    return (
        <ScrollView style={styles.container} contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
            <View style={styles.metrics}>
                <AppCard style={styles.metric}>
                    <Text style={styles.metricNumber}>{users.length}</Text>
                    <Text style={styles.metricLabel}>Usuarios</Text>
                </AppCard>
                <AppCard style={styles.metric}>
                    <Text style={styles.metricNumber}>{auditCount}</Text>
                    <Text style={styles.metricLabel}>Cambios</Text>
                </AppCard>
                <AppCard style={styles.metric}>
                    <Text style={styles.metricNumber}>{accessCount}</Text>
                    <Text style={styles.metricLabel}>Accesos</Text>
                </AppCard>
            </View>

            <AppCard style={styles.linkCard}>
                <View style={styles.linkRow}>
                    <MaterialCommunityIcons name="account-heart" size={24} color="#006d77" />
                    <View style={styles.linkInfo}>
                        <Text style={styles.linkTitle}>Gestionar cuidadores</Text>
                        <Text style={styles.linkSubtitle}>Crear, ver y administrar cuidadores y sus pacientes</Text>
                    </View>
                    <MaterialCommunityIcons
                        name="chevron-right"
                        size={24}
                        color="#6b7280"
                        onPress={() => router.push('/(app)/caregivers' as never)}
                    />
                </View>
            </AppCard>

            <AppCard style={styles.linkCard}>
                <View style={styles.linkRow}>
                    <MaterialCommunityIcons name="robot" size={24} color="#7c3aed" />
                    <View style={styles.linkInfo}>
                        <Text style={styles.linkTitle}>Probar API de IA</Text>
                        <Text style={styles.linkSubtitle}>Verificar que Cerebras genera planes correctamente</Text>
                    </View>
                </View>
                <AppButton
                    label={isTestingAi ? 'Probando...' : 'Probar generacion de plan'}
                    icon="brain"
                    variant="outlined"
                    loading={isTestingAi}
                    onPress={handleTestAi}
                    style={styles.testAiButton}
                />
                {aiTestResult && (
                    <View style={styles.aiResult}>
                        <View style={styles.aiResultHeader}>
                            <MaterialCommunityIcons name="check-circle" size={18} color="#059669" />
                            <Text style={styles.aiResultTitle}>Respuesta exitosa ({aiTestResult.durationMs}ms)</Text>
                        </View>
                        <Text style={styles.aiResultSummary}>{aiTestResult.resumen}</Text>
                        <Text style={styles.aiResultMeta}>
                            Nivel: {aiTestResult.nivelDificultad} | Ejercicios: {aiTestResult.ejercicios.length}
                        </Text>
                        {aiTestResult.ejercicios.map((ex, i) => (
                            <Text key={i} style={styles.aiResultExercise}>
                                {ex.diaSemana}: {ex.nombre}
                            </Text>
                        ))}
                    </View>
                )}
            </AppCard>

            {!showCreateForm ? (
                <AppButton
                    label="Crear usuario (admin/profesional)"
                    icon="account-plus"
                    variant="outlined"
                    onPress={() => setShowCreateForm(true)}
                    style={styles.showFormButton}
                />
            ) : (
                <AppCard>
                    <Text style={styles.sectionTitle}>Crear usuario del equipo</Text>
                    <AppInput control={control} name="nombres" label="Nombres" />
                    <AppInput control={control} name="apellidos" label="Apellidos" />
                    <AppInput control={control} name="correo" label="Correo" keyboardType="email-address" autoCapitalize="none" />
                    <AppInput control={control} name="contrasena" label="Contraseña" secureTextEntry />
                    <Text style={styles.fieldLabel}>Rol</Text>
                    <Controller
                        control={control}
                        name="rol"
                        render={({ field: { value, onChange } }) => (
                            <SegmentedButtons
                                value={value}
                                onValueChange={(next) => onChange(next as ApiUserRole)}
                                buttons={[
                                    { value: 'profesional', label: 'Profesional' },
                                    { value: 'administrador', label: 'Administrador' },
                                ]}
                            />
                        )}
                    />
                    <View style={styles.formActions}>
                        <AppButton
                            label="Cancelar"
                            variant="text"
                            onPress={() => setShowCreateForm(false)}
                        />
                        <AppButton
                            label="Crear usuario"
                            icon="account-plus"
                            variant="filled"
                            loading={isLoading}
                            onPress={handleSubmit(onSubmit)}
                        />
                    </View>
                </AppCard>
            )}

            <Text style={styles.sectionTitle}>Profesionales ({filteredUsers.length})</Text>
            <Searchbar
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Buscar profesionales"
                accessibilityLabel="Buscar profesionales"
                style={styles.searchbar}
                inputStyle={styles.searchInput}
            />
            {filteredUsers.map((user) => (
                <AppCard
                    key={user.idUsuario}
                    onPress={user.rol === 'profesional' || user.rol === 'cuidador'
                        ? () => router.push(`/(app)/admin/${user.idUsuario}` as never)
                        : undefined}
                    accessibilityLabel={`Editar ${user.nombres ?? user.correo}`}
                >
                    <View style={styles.userRow}>
                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>{(user.nombres ?? user.correo)[0]?.toUpperCase()}</Text>
                        </View>
                        <View style={styles.userInfo}>
                            <Text style={styles.userName}>{user.nombres} {user.apellidos}</Text>
                            <Text style={styles.userMeta}>{user.correo} · {user.estado}</Text>
                        </View>
                        <MaterialCommunityIcons name="chevron-right" size={22} color="#6b7280" />
                    </View>
                </AppCard>
            ))}
            {filteredUsers.length === 0 && (
                <Text style={styles.empty}>No se encontraron profesionales.</Text>
            )}

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
    metrics: { flexDirection: 'row', gap: 8, marginBottom: 16 },
    metric: { flex: 1 },
    metricNumber: { fontFamily: 'Montserrat_800ExtraBold', fontSize: 24, color: '#006d77', textAlign: 'center' },
    metricLabel: { fontFamily: 'Montserrat_500Medium', fontSize: 11, color: '#6b7280', textAlign: 'center' },
    linkCard: { marginBottom: 8 },
    linkRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    linkInfo: { flex: 1 },
    linkTitle: { fontFamily: 'Montserrat_700Bold', fontSize: 14, color: '#1f2937' },
    linkSubtitle: { fontFamily: 'Montserrat_400Regular', fontSize: 12, color: '#6b7280' },
    showFormButton: { marginBottom: 8 },
    sectionTitle: { fontFamily: 'Montserrat_700Bold', fontSize: 16, color: '#1f2937', marginBottom: 12, marginTop: 8 },
    searchbar: { marginBottom: 8, backgroundColor: '#ffffff' },
    searchInput: { fontFamily: 'Montserrat_400Regular', fontSize: 14 },
    fieldLabel: { fontFamily: 'Montserrat_600SemiBold', fontSize: 13, color: '#374151', marginBottom: 8 },
    formActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 16 },
    userRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#d9f0ef', alignItems: 'center', justifyContent: 'center' },
    avatarText: { fontFamily: 'Montserrat_800ExtraBold', color: '#006d77' },
    userInfo: { flex: 1 },
    userName: { fontFamily: 'Montserrat_700Bold', fontSize: 14, color: '#1f2937' },
    userMeta: { fontFamily: 'Montserrat_400Regular', fontSize: 12, color: '#6b7280' },
    empty: { fontFamily: 'Montserrat_400Regular', fontSize: 13, color: '#6b7280', paddingVertical: 12 },
    testAiButton: { marginTop: 12 },
    aiResult: { marginTop: 12, padding: 12, backgroundColor: '#f0fdf4', borderRadius: 8 },
    aiResultHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
    aiResultTitle: { fontFamily: 'Montserrat_600SemiBold', fontSize: 13, color: '#059669' },
    aiResultSummary: { fontFamily: 'Montserrat_400Regular', fontSize: 13, color: '#374151', marginBottom: 4 },
    aiResultMeta: { fontFamily: 'Montserrat_500Medium', fontSize: 12, color: '#6b7280', marginBottom: 8 },
    aiResultExercise: { fontFamily: 'Montserrat_400Regular', fontSize: 12, color: '#4b5563', marginLeft: 8, marginBottom: 2 },
});
