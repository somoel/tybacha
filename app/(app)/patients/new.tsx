import { AppButton } from '@/src/components/ui/AppButton';
import { AppInput } from '@/src/components/ui/AppInput';
import { AppSnackbar } from '@/src/components/ui/AppSnackbar';
import { OfflineBanner } from '@/src/components/ui/OfflineBanner';
import { createPatient } from '@/src/services/patientService';
import { useAuthStore } from '@/src/stores/authStore';
import { usePatientsStore } from '@/src/stores/patientsStore';
import { useSyncStore } from '@/src/stores/syncStore';
import { zodResolver } from '@hookform/resolvers/zod';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SegmentedButtons, Text, useTheme } from 'react-native-paper';
import { z } from 'zod';

const patientSchema = z.object({
    first_name: z.string().min(1, 'El primer nombre es requerido'),
    second_name: z.string().optional(),
    first_lastname: z.string().min(1, 'El primer apellido es requerido'),
    second_lastname: z.string().optional(),
    gender: z.enum(['male', 'female', 'other'], { message: 'Seleccione un género' }),
    pathologies: z.string().optional(),
});

type PatientFormValues = z.infer<typeof patientSchema>;

/**
 * RF-02: Register a new patient (professional only).
 */
export default function NewPatientScreen() {
    const theme = useTheme();
    const router = useRouter();
    const { user } = useAuthStore();
    const { addPatient } = usePatientsStore();
    const isOnline = useSyncStore((s) => s.isOnline);

    const [isLoading, setIsLoading] = useState(false);
    const [birthDate, setBirthDate] = useState(new Date(1950, 0, 1));
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [snackbar, setSnackbar] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' });

    const { control, handleSubmit } = useForm<PatientFormValues>({
        resolver: zodResolver(patientSchema),
        defaultValues: {
            first_name: '',
            second_name: '',
            first_lastname: '',
            second_lastname: '',
            gender: 'male',
            pathologies: '',
        },
    });

    const onSubmit = async (data: PatientFormValues) => {
        if (!user) return;
        setIsLoading(true);
        try {
            const patient = await createPatient(
                { ...data, birth_date: birthDate },
                user.id,
                isOnline
            );
            addPatient(patient);
            setSnackbar({ visible: true, message: 'Paciente registrado exitosamente ✓', type: 'success' });
            setTimeout(() => router.back(), 1500);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Error al registrar paciente.';
            setSnackbar({ visible: true, message, type: 'error' });
        } finally {
            setIsLoading(false);
        }
    };

    const formatDate = (date: Date): string => {
        return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
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

                    {/* Date picker */}
                    <Text style={styles.fieldLabel}>Fecha de nacimiento *</Text>
                    <AppButton
                        label={formatDate(birthDate)}
                        variant="outlined"
                        icon="calendar"
                        onPress={() => setShowDatePicker(true)}
                        accessibilityLabel="Seleccionar fecha de nacimiento"
                        style={styles.dateButton}
                    />
                    {showDatePicker && (
                        <DateTimePicker
                            value={birthDate}
                            mode="date"
                            maximumDate={new Date()}
                            onChange={(_, date) => {
                                setShowDatePicker(Platform.OS === 'ios');
                                if (date) setBirthDate(date);
                            }}
                        />
                    )}

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

                    <AppInput
                        control={control}
                        name="pathologies"
                        label="Patologías"
                        placeholder="Hipertensión, diabetes, osteoporosis..."
                        multiline
                        numberOfLines={3}
                        accessibilityLabel="Patologías del paciente"
                    />

                    <AppButton
                        label="Registrar paciente"
                        onPress={handleSubmit(onSubmit)}
                        variant="filled"
                        loading={isLoading}
                        icon="account-plus"
                        accessibilityLabel="Registrar paciente"
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
    dateButton: { marginBottom: 12, alignSelf: 'flex-start' },
    segmented: { marginBottom: 16 },
    submitButton: { marginTop: 16 },
});
