import { AppButton } from '@/src/components/ui/AppButton';
import { DateField } from '@/src/components/ui/DateField';
import { AppInput } from '@/src/components/ui/AppInput';
import { AppLoader } from '@/src/components/ui/AppLoader';
import { AppSnackbar } from '@/src/components/ui/AppSnackbar';
import { deletePatient, fetchPatientById, updatePatient } from '@/src/services/patientService';
import { usePatientsStore } from '@/src/stores/patientsStore';
import { useSyncStore } from '@/src/stores/syncStore';
import type { Patient } from '@/src/types/patient.types';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SegmentedButtons, Text } from 'react-native-paper';
import { z } from 'zod';

const editSchema = z.object({
    first_name: z.string().min(1, 'El primer nombre es requerido'),
    second_name: z.string().optional(),
    first_lastname: z.string().min(1, 'El primer apellido es requerido'),
    second_lastname: z.string().optional(),
    gender: z.enum(['male', 'female', 'other']),
    pathologies: z.string().optional(),
});

type EditFormValues = z.infer<typeof editSchema>;

/**
 * RF-06: Edit/delete patient (professional only).
 */
export default function EditPatientScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const { updatePatient: updateStore, removePatient } = usePatientsStore();
    const isOnline = useSyncStore((s) => s.isOnline);

    const [patient, setPatient] = useState<Patient | null>(null);
    const [birthDate, setBirthDate] = useState(new Date(1950, 0, 1));
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [snackbar, setSnackbar] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' });

    const { control, handleSubmit, reset } = useForm<EditFormValues>({
        resolver: zodResolver(editSchema),
    });

    useEffect(() => {
        const load = async () => {
            if (!id) return;
            const p = await fetchPatientById(id);
            if (p) {
                setPatient(p);
                setBirthDate(new Date(p.birth_date));
                reset({
                    first_name: p.first_name,
                    second_name: p.second_name ?? '',
                    first_lastname: p.first_lastname,
                    second_lastname: p.second_lastname ?? '',
                    gender: p.gender,
                    pathologies: p.pathologies ?? '',
                });
            }
            setIsLoading(false);
        };
        load();
    }, [id, reset]);

    const onSubmit = async (data: EditFormValues) => {
        if (!id) return;
        setIsSaving(true);
        try {
            const updated = await updatePatient(id, { ...data, birth_date: birthDate }, isOnline);
            updateStore(updated);
            setSnackbar({ visible: true, message: 'Adulto mayor actualizado ✓', type: 'success' });
            setTimeout(() => router.back(), 1500);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Error al actualizar.';
            setSnackbar({ visible: true, message, type: 'error' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = () => {
        Alert.alert(
            'Eliminar adulto mayor',
            '¿Está seguro de que desea eliminar este adulto mayor? Esta acción no se puede deshacer.',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Eliminar',
                    style: 'destructive',
                    onPress: async () => {
                        if (!id) return;
                        try {
                            await deletePatient(id, isOnline);
                            removePatient(id);
                            router.replace('/(app)/patients' as never);
                        } catch (error) {
                            const msg = error instanceof Error ? error.message : 'Error al eliminar.';
                            setSnackbar({ visible: true, message: msg, type: 'error' });
                        }
                    },
                },
            ]
        );
    };

    if (isLoading) return <AppLoader message="Cargando adulto mayor..." />;
    if (!patient) return <AppLoader message="Adulto mayor no encontrado" />;

    return (
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
                <View style={styles.form}>
                    <AppInput control={control} name="first_name" label="Primer nombre *" />
                    <AppInput control={control} name="second_name" label="Segundo nombre" />
                    <AppInput control={control} name="first_lastname" label="Primer apellido *" />
                    <AppInput control={control} name="second_lastname" label="Segundo apellido" />

                    <DateField
                        label="Fecha de nacimiento *"
                        value={birthDate}
                        onChange={setBirthDate}
                        maximumDate={new Date()}
                        accessibilityLabel="Seleccionar fecha de nacimiento"
                    />

                    <Text style={styles.label}>Género *</Text>
                    <Controller control={control} name="gender" render={({ field: { onChange, value } }) => (
                        <SegmentedButtons value={value} onValueChange={onChange} buttons={[
                            { value: 'male', label: 'Masculino' },
                            { value: 'female', label: 'Femenino' },
                            { value: 'other', label: 'Otro' },
                        ]} style={styles.segmented} />
                    )} />

                    <AppInput control={control} name="pathologies" label="Patologías" multiline numberOfLines={3} />

                    <AppButton label="Guardar cambios" onPress={handleSubmit(onSubmit)} variant="filled" loading={isSaving} icon="content-save" style={styles.saveBtn} />
                    <AppButton label="Eliminar adulto mayor" onPress={handleDelete} variant="outlined-error" icon="delete" accessibilityLabel="Eliminar adulto mayor" />
                </View>
            </ScrollView>

            <AppSnackbar visible={snackbar.visible} message={snackbar.message} type={snackbar.type} onDismiss={() => setSnackbar((s) => ({ ...s, visible: false }))} />
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    flex: { flex: 1, backgroundColor: '#f8fafc' },
    scroll: { flexGrow: 1 },
    form: { padding: 24, gap: 4 },
    label: { fontFamily: 'Montserrat_600SemiBold', fontSize: 13, color: '#374151', marginBottom: 8, marginTop: 4 },
    segmented: { marginBottom: 16 },
    saveBtn: { marginTop: 16, marginBottom: 8 },
});
