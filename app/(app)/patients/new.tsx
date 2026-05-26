import { AppButton } from '@/src/components/ui/AppButton';
import { DateField } from '@/src/components/ui/DateField';
import { AppInput } from '@/src/components/ui/AppInput';
import { AppSnackbar } from '@/src/components/ui/AppSnackbar';
import { OfflineBanner } from '@/src/components/ui/OfflineBanner';
import { usePermissions } from '@/src/hooks/usePermissions';
import { createPatient } from '@/src/services/patientService';
import { useAuthStore } from '@/src/stores/authStore';
import { usePatientsStore } from '@/src/stores/patientsStore';
import { useSyncStore } from '@/src/stores/syncStore';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SegmentedButtons, Text } from 'react-native-paper';
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

/**
 * RF-02: Register a new patient (professional only).
 */
export default function NewPatientScreen() {
    const router = useRouter();
    const { user } = useAuthStore();
    const { isAdmin, isProfessional } = usePermissions();
    const { addPatient } = usePatientsStore();
    const isOnline = useSyncStore((s) => s.isOnline);

    const [isLoading, setIsLoading] = useState(false);
    const [birthDate, setBirthDate] = useState(new Date(1950, 0, 1));
    const [snackbar, setSnackbar] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' });

    const { control, handleSubmit } = useForm<PatientFormValues>({
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

    const onSubmit = async (data: PatientFormValues) => {
        if (!user) return;
        const requiresCaregiver = isAdmin || isProfessional;
        if (requiresCaregiver && !data.id_cuidador) {
            setSnackbar({ visible: true, message: 'Debe asignar un cuidador al adulto mayor.', type: 'error' });
            return;
        }
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
            setSnackbar({ visible: true, message: 'Adulto mayor registrado exitosamente ✓', type: 'success' });
            setTimeout(() => router.back(), 1500);
        } catch (error) {
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

                    {(isAdmin || isProfessional) && (
                        <AppInput
                            control={control}
                            name="id_cuidador"
                            label="ID del cuidador asignado *"
                            placeholder="Ej. 12"
                            keyboardType="numeric"
                            accessibilityLabel="ID del cuidador asignado"
                        />
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

                    <AppButton
                        label="Registrar adulto mayor"
                        onPress={handleSubmit(onSubmit)}
                        variant="filled"
                        loading={isLoading}
                        icon="account-plus"
                        accessibilityLabel="Registrar adulto mayor"
                        style={styles.submitButton}
                    />
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
    segmented: { marginBottom: 16 },
    submitButton: { marginTop: 16 },
});
