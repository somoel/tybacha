import { AppButton } from '@/src/components/ui/AppButton';
import { AppConfirmDialog } from '@/src/components/ui/AppConfirmDialog';
import { DateField } from '@/src/components/ui/DateField';
import { AppInput } from '@/src/components/ui/AppInput';
import { AppLoader } from '@/src/components/ui/AppLoader';
import { PatientAvatar } from '@/src/components/ui/PatientAvatar';
import { AppSnackbar } from '@/src/components/ui/AppSnackbar';
import { deletePatient, deletePatientPhoto, fetchPatientById, updatePatient, uploadPatientPhoto } from '@/src/services/patientService';
import { usePatientsStore } from '@/src/stores/patientsStore';
import { useSyncStore } from '@/src/stores/syncStore';
import type { Patient } from '@/src/types/patient.types';
import { zodResolver } from '@hookform/resolvers/zod';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SegmentedButtons, Text } from 'react-native-paper';
import { z } from 'zod';

const editSchema = z.object({
    first_name: z.string().min(1, 'El primer nombre es requerido'),
    second_name: z.string().optional(),
    first_lastname: z.string().min(1, 'El primer apellido es requerido'),
    second_lastname: z.string().optional(),
    gender: z.enum(['male', 'female', 'other']),
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
    const [photoUri, setPhotoUri] = useState<string | null>(null);
    const [currentPhotoData, setCurrentPhotoData] = useState<string | null>(null);
    const [snackbar, setSnackbar] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' });
    const [confirmType, setConfirmType] = useState<'delete' | 'deletePhoto' | null>(null);

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
                setCurrentPhotoData(p.photo_data ?? null);
                reset({
                    first_name: p.first_name,
                    second_name: p.second_name ?? '',
                    first_lastname: p.first_lastname,
                    second_lastname: p.second_lastname ?? '',
                    gender: p.gender,
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
        setConfirmType('delete');
    };

    const handleConfirmDelete = async () => {
        if (!id) return;
        try {
            await deletePatient(id, isOnline);
            removePatient(id);
            router.replace('/(app)/patients' as never);
        } catch (error) {
            const msg = error instanceof Error ? error.message : 'Error al eliminar.';
            setSnackbar({ visible: true, message: msg, type: 'error' });
        } finally {
            setConfirmType(null);
        }
    };

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

    const handleUploadPhoto = async () => {
        if (!id || !photoUri) return;
        try {
            await uploadPatientPhoto(id, photoUri);
            setCurrentPhotoData(null);
            setPhotoUri(null);
            setSnackbar({ visible: true, message: 'Foto actualizada ✓', type: 'success' });
        } catch (error) {
            const msg = error instanceof Error ? error.message : 'Error al subir foto.';
            setSnackbar({ visible: true, message: msg, type: 'error' });
        }
    };

    const handleDeletePhoto = () => {
        setConfirmType('deletePhoto');
    };

    const handleConfirmDeletePhoto = async () => {
        if (!id) return;
        try {
            await deletePatientPhoto(id);
            setCurrentPhotoData(null);
            setPhotoUri(null);
            setSnackbar({ visible: true, message: 'Foto eliminada ✓', type: 'success' });
        } catch (error) {
            const msg = error instanceof Error ? error.message : 'Error al eliminar foto.';
            setSnackbar({ visible: true, message: msg, type: 'error' });
        } finally {
            setConfirmType(null);
        }
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

                    <View style={styles.photoSection}>
                        <Text style={styles.label}>Foto de perfil</Text>
                        <View style={styles.photoRow}>
                            <PatientAvatar
                                photoData={photoUri || currentPhotoData}
                                firstName={patient.first_name}
                                firstLastname={patient.first_lastname}
                                size={72}
                            />
                            <View style={styles.photoActions}>
                                <AppButton
                                    label="Cambiar foto"
                                    onPress={handlePickPhoto}
                                    variant="outlined"
                                    icon="camera"
                                    accessibilityLabel="Cambiar foto de perfil"
                                />
                                {(currentPhotoData || photoUri) && (
                                    <AppButton
                                        label="Eliminar foto"
                                        onPress={handleDeletePhoto}
                                        variant="outlined-error"
                                        icon="delete"
                                        accessibilityLabel="Eliminar foto de perfil"
                                    />
                                )}
                            </View>
                        </View>
                        {photoUri && (
                            <AppButton
                                label="Guardar foto"
                                onPress={handleUploadPhoto}
                                variant="filled"
                                icon="content-save"
                                style={styles.savePhotoBtn}
                                accessibilityLabel="Guardar nueva foto"
                            />
                        )}
                    </View>

                    <AppButton label="Guardar cambios" onPress={handleSubmit(onSubmit)} variant="filled" loading={isSaving} icon="content-save" style={styles.saveBtn} />
                    <AppButton label="Eliminar adulto mayor" onPress={handleDelete} variant="outlined-error" icon="delete" accessibilityLabel="Eliminar adulto mayor" />
                </View>
            </ScrollView>

            <AppConfirmDialog
                visible={confirmType === 'delete'}
                title="Eliminar adulto mayor"
                message="¿Está seguro de que desea eliminar este adulto mayor? Esta acción no se puede deshacer."
                confirmLabel="Eliminar"
                destructive
                onConfirm={handleConfirmDelete}
                onCancel={() => setConfirmType(null)}
            />
            <AppConfirmDialog
                visible={confirmType === 'deletePhoto'}
                title="Eliminar foto"
                message="¿Está seguro de que desea eliminar la foto de perfil?"
                confirmLabel="Eliminar"
                destructive
                onConfirm={handleConfirmDeletePhoto}
                onCancel={() => setConfirmType(null)}
            />
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
    photoSection: { marginBottom: 12 },
    photoRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    photoActions: { flex: 1, gap: 8 },
    savePhotoBtn: { marginTop: 8 },
    saveBtn: { marginTop: 16, marginBottom: 8 },
});
