import { AppButton } from '@/src/components/ui/AppButton';
import { AppCard } from '@/src/components/ui/AppCard';
import { DateField } from '@/src/components/ui/DateField';
import { AppInput } from '@/src/components/ui/AppInput';
import { PatientAvatar } from '@/src/components/ui/PatientAvatar';
import { AppSnackbar } from '@/src/components/ui/AppSnackbar';
import { fetchApiUsers } from '@/src/api/usersApi';
import { OfflineBanner } from '@/src/components/ui/OfflineBanner';
import { usePermissions } from '@/src/hooks/usePermissions';
import { createPatient, uploadPatientPhoto } from '@/src/services/patientService';
import { useAuthStore } from '@/src/stores/authStore';
import { usePatientsStore } from '@/src/stores/patientsStore';
import { useSyncStore } from '@/src/stores/syncStore';
import { zodResolver } from '@hookform/resolvers/zod';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, SegmentedButtons, Text, useTheme } from 'react-native-paper';
import type { ApiUserSummary } from '@/src/types/apiUser.types';
import { z } from 'zod';

const patientSchema = z.object({
    first_name: z.string().min(1, 'El primer nombre es requerido'),
    second_name: z.string().optional(),
    first_lastname: z.string().min(1, 'El primer apellido es requerido'),
    second_lastname: z.string().optional(),
    gender: z.enum(['male', 'female', 'other'], { message: 'Seleccione un género' }),
    id_cuidador: z.string().optional(),
    pathologies: z.string().optional(),
});

type PatientFormValues = z.infer<typeof patientSchema>;

const MIN_SUBMIT_LOADING_MS = 650;

const waitForMinimumSubmitLoading = async (startedAt: number) => {
    const remainingMs = MIN_SUBMIT_LOADING_MS - (Date.now() - startedAt);
    if (remainingMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, remainingMs));
    }
};

/**
 * RF-02: Register a new patient (professional only).
 */
export default function NewPatientScreen() {
    const theme = useTheme();
    const router = useRouter();
    const { user } = useAuthStore();
    const { isAdmin, isProfessional } = usePermissions();
    const canAssignCaregiver = user?.rol === 'cuidador'
        ? false
        : isAdmin || isProfessional || user?.rol === 'administrador' || user?.rol === 'profesional' || !user;
    const { addPatient } = usePatientsStore();
    const isOnline = useSyncStore((s) => s.isOnline);

    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingCaregivers, setIsLoadingCaregivers] = useState(false);
    const [caregivers, setCaregivers] = useState<ApiUserSummary[]>([]);
    const [birthDate, setBirthDate] = useState(new Date(1950, 0, 1));
    const [photoUri, setPhotoUri] = useState<string | null>(null);
    const [snackbar, setSnackbar] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' });

    const { control, handleSubmit, setValue, watch } = useForm<PatientFormValues>({
        resolver: zodResolver(patientSchema),
        defaultValues: {
            first_name: '',
            second_name: '',
            first_lastname: '',
            second_lastname: '',
            gender: 'male',
            id_cuidador: undefined,
            pathologies: '',
        },
    });
    const selectedCaregiverId = watch('id_cuidador');

    useEffect(() => {
        const loadCaregivers = async () => {
            if (!canAssignCaregiver) return;
            setIsLoadingCaregivers(true);
            try {
                const users = await fetchApiUsers();
                setCaregivers(users.filter((item) => item.rol === 'cuidador' && item.estado === 'activo'));
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Error cargando cuidadores.';
                setSnackbar({ visible: true, message, type: 'error' });
            } finally {
                setIsLoadingCaregivers(false);
            }
        };

        void loadCaregivers();
    }, [canAssignCaregiver]);

    const caregiverName = (caregiver: ApiUserSummary) =>
        [caregiver.nombres, caregiver.apellidos].filter(Boolean).join(' ') || caregiver.correo;

    const handlePickPhoto = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            setSnackbar({ visible: true, message: 'Se necesita permiso para acceder a las fotos.', type: 'error' });
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });
        if (!result.canceled && result.assets[0]) {
            setPhotoUri(result.assets[0].uri);
        }
    };

    const handleRemovePhoto = () => {
        Alert.alert('Eliminar foto', '¿Desea eliminar la foto seleccionada?', [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Eliminar', style: 'destructive', onPress: () => setPhotoUri(null) },
        ]);
    };

    const onSubmit = async (data: PatientFormValues) => {
        if (isLoading) return;
        if (!user) return;
        const requiresCaregiver = canAssignCaregiver;
        if (requiresCaregiver && !data.id_cuidador) {
            setSnackbar({ visible: true, message: 'Debe asignar un cuidador al adulto mayor.', type: 'error' });
            return;
        }
        const startedAt = Date.now();
        setIsLoading(true);
        try {
            const patient = await createPatient(
                {
                    ...data,
                    birth_date: birthDate,
                    id_cuidador: data.id_cuidador ? Number(data.id_cuidador) : undefined,
                },
                user.id,
                isOnline
            );
            addPatient(patient);
            if (photoUri) {
                try {
                    await uploadPatientPhoto(patient.id, photoUri);
                } catch {
                    // Photo upload failed but patient was created
                }
            }
            await waitForMinimumSubmitLoading(startedAt);
            setSnackbar({ visible: true, message: 'Adulto mayor registrado exitosamente ✓', type: 'success' });
            setTimeout(() => router.back(), 1500);
        } catch (error) {
            await waitForMinimumSubmitLoading(startedAt);
            const message = error instanceof Error ? error.message : 'Error al registrar adulto mayor.';
            setSnackbar({ visible: true, message, type: 'error' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <OfflineBanner visible={!isOnline} />
            <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
                <View style={styles.form}>
                    <Text style={styles.sectionTitle}>Datos personales</Text>

                    <AppInput control={control} name="first_name" label="Primer nombre *" accessibilityLabel="Primer nombre" />
                    <AppInput control={control} name="second_name" label="Segundo nombre" accessibilityLabel="Segundo nombre" />
                    <AppInput control={control} name="first_lastname" label="Primer apellido *" accessibilityLabel="Primer apellido" />
                    <AppInput control={control} name="second_lastname" label="Segundo apellido" accessibilityLabel="Segundo apellido" />

                    <DateField
                        label="Fecha de nacimiento *"
                        value={birthDate}
                        onChange={setBirthDate}
                        maximumDate={new Date()}
                        accessibilityLabel="Seleccionar fecha de nacimiento"
                    />

                    {/* Gender selector */}
                    <Text style={styles.fieldLabel}>Género *</Text>
                    <Controller
                        control={control}
                        name="gender"
                        render={({ field: { onChange, value } }) => (
                            <SegmentedButtons
                                value={value}
                                onValueChange={onChange}
                                buttons={[
                                    { value: 'male', label: 'Masculino', accessibilityLabel: 'Masculino' },
                                    { value: 'female', label: 'Femenino', accessibilityLabel: 'Femenino' },
                                    { value: 'other', label: 'Otro', accessibilityLabel: 'Otro' },
                                ]}
                                style={styles.segmented}
                            />
                        )}
                    />

                    {canAssignCaregiver && (
                        <View style={styles.caregiverSection}>
                            <Text style={styles.fieldLabel}>Cuidador asignado *</Text>
                            {isLoadingCaregivers ? (
                                <Text style={styles.helperText}>Cargando cuidadores...</Text>
                            ) : caregivers.length === 0 ? (
                                <AppCard>
                                    <View style={styles.emptyCaregivers}>
                                        <MaterialCommunityIcons name="account-alert-outline" size={22} color={theme.colors.outline} />
                                        <Text style={styles.helperText}>No tienes cuidadores disponibles para asignar.</Text>
                                    </View>
                                </AppCard>
                            ) : (
                                <View style={styles.caregiverList}>
                                    {caregivers.map((caregiver) => {
                                        const id = String(caregiver.idUsuario);
                                        const selected = selectedCaregiverId === id;

                                        return (
                                            <AppCard
                                                key={id}
                                                onPress={() => {
                                                    if (!isLoading) {
                                                        setValue('id_cuidador', id, { shouldValidate: true });
                                                    }
                                                }}
                                                style={selected ? styles.selectedCaregiver : styles.caregiverCard}
                                                accessibilityLabel={`Seleccionar cuidador ${caregiverName(caregiver)}`}
                                            >
                                                <View style={styles.caregiverRow}>
                                                    <MaterialCommunityIcons
                                                        name={selected ? 'radiobox-marked' : 'radiobox-blank'}
                                                        size={22}
                                                        color={selected ? theme.colors.primary : theme.colors.outline}
                                                    />
                                                    <View style={styles.caregiverInfo}>
                                                        <Text style={styles.caregiverName}>{caregiverName(caregiver)}</Text>
                                                        <Text style={styles.caregiverEmail}>{caregiver.correo}</Text>
                                                    </View>
                                                </View>
                                            </AppCard>
                                        );
                                    })}
                                </View>
                            )}
                        </View>
                    )}

                    <AppInput
                        control={control}
                        name="pathologies"
                        label="Patologías"
                        placeholder="Hipertensión, diabetes, osteoporosis..."
                        multiline
                        numberOfLines={3}
                        accessibilityLabel="Patologías del adulto mayor"
                    />

                    <View style={styles.photoSection}>
                        <Text style={styles.fieldLabel}>Foto de perfil (opcional)</Text>
                        <View style={styles.photoRow}>
                            <PatientAvatar
                                photoData={photoUri}
                                firstName={watch('first_name') || 'A'}
                                firstLastname={watch('first_lastname') || 'M'}
                                size={72}
                            />
                            <View style={styles.photoActions}>
                                <AppButton
                                    label={photoUri ? 'Cambiar foto' : 'Agregar foto'}
                                    onPress={handlePickPhoto}
                                    variant="outlined"
                                    icon="camera"
                                    accessibilityLabel="Seleccionar foto de perfil"
                                />
                                {photoUri && (
                                    <AppButton
                                        label="Eliminar"
                                        onPress={handleRemovePhoto}
                                        variant="outlined-error"
                                        icon="delete"
                                        accessibilityLabel="Eliminar foto seleccionada"
                                    />
                                )}
                            </View>
                        </View>
                    </View>

                    <AppButton
                        label={isLoading ? 'Registrando...' : 'Registrar adulto mayor'}
                        onPress={handleSubmit(onSubmit)}
                        variant="filled"
                        loading={isLoading}
                        disabled={isLoading || isLoadingCaregivers}
                        icon="account-plus"
                        accessibilityLabel="Registrar adulto mayor"
                        style={styles.submitButton}
                    />

                    {isLoading && (
                        <View style={styles.loadingStatus} accessibilityRole="progressbar">
                            <ActivityIndicator size="small" color={theme.colors.primary} />
                            <Text style={styles.loadingStatusText}>Registrando adulto mayor...</Text>
                        </View>
                    )}
                </View>
            </ScrollView>

            <AppSnackbar
                visible={snackbar.visible}
                message={snackbar.message}
                type={snackbar.type}
                onDismiss={() => setSnackbar((s) => ({ ...s, visible: false }))}
            />
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    flex: { flex: 1, backgroundColor: '#f8fafc' },
    scroll: { flexGrow: 1 },
    form: { padding: 24 },
    sectionTitle: {
        fontFamily: 'Montserrat_700Bold',
        fontSize: 18,
        color: '#1f2937',
        marginBottom: 16,
    },
    fieldLabel: {
        fontFamily: 'Montserrat_600SemiBold',
        fontSize: 13,
        color: '#374151',
        marginBottom: 8,
        marginTop: 4,
    },
    caregiverSection: { marginBottom: 12 },
    caregiverList: { gap: 8 },
    caregiverCard: { marginBottom: 0 },
    selectedCaregiver: { marginBottom: 0, borderWidth: 2, borderColor: '#006d77' },
    caregiverRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    caregiverInfo: { flex: 1 },
    caregiverName: { fontFamily: 'Montserrat_600SemiBold', fontSize: 14, color: '#1f2937' },
    caregiverEmail: { fontFamily: 'Montserrat_400Regular', fontSize: 12, color: '#6b7280' },
    emptyCaregivers: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    helperText: { fontFamily: 'Montserrat_400Regular', fontSize: 13, color: '#6b7280' },
    segmented: { marginBottom: 16 },
    photoSection: { marginBottom: 12 },
    photoRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    photoActions: { flex: 1, gap: 8 },
    submitButton: { marginTop: 16 },
    loadingStatus: {
        marginTop: 12,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 8,
        backgroundColor: '#ecfdf5',
        borderWidth: 1,
        borderColor: '#a7f3d0',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    loadingStatusText: {
        fontFamily: 'Montserrat_600SemiBold',
        fontSize: 13,
        color: '#065f46',
    },
});
