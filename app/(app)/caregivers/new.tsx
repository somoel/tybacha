import { createApiUser } from '@/src/api/usersApi';
import { AppButton } from '@/src/components/ui/AppButton';
import { AppCard } from '@/src/components/ui/AppCard';
import { AppInput } from '@/src/components/ui/AppInput';
import { AppSnackbar } from '@/src/components/ui/AppSnackbar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SegmentedButtons, Text } from 'react-native-paper';
import { z } from 'zod';

const caregiverSchema = z.object({
    correo: z.string().email('Correo invalido'),
    contrasena: z.string().min(8, 'Minimo 8 caracteres'),
    nombres: z.string().min(1, 'Requerido'),
    apellidos: z.string().min(1, 'Requerido'),
    telefono: z.string().optional(),
    ciudad: z.string().optional(),
    tipoDocumento: z.string().optional(),
    numeroDocumento: z.string().optional(),
    direccion: z.string().optional(),
    genero: z.enum(['femenino', 'masculino']).optional(),
    fechaNacimiento: z.string().optional(),
});

type CaregiverForm = z.infer<typeof caregiverSchema>;

/**
 * Create a new caregiver with optional profile fields.
 */
export default function NewCaregiverScreen() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [snackbar, setSnackbar] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' });
    const [showOptional, setShowOptional] = useState(false);

    const { control, handleSubmit, reset } = useForm<CaregiverForm>({
        resolver: zodResolver(caregiverSchema),
        defaultValues: {
            correo: '',
            contrasena: '',
            nombres: '',
            apellidos: '',
            telefono: '',
            ciudad: '',
            tipoDocumento: '',
            numeroDocumento: '',
            direccion: '',
            genero: undefined,
            fechaNacimiento: '',
        },
    });

    const onSubmit = async (data: CaregiverForm) => {
        setIsLoading(true);
        try {
            await createApiUser({
                correo: data.correo,
                contrasena: data.contrasena,
                rol: 'cuidador',
                nombres: data.nombres,
                apellidos: data.apellidos,
                telefono: data.telefono || undefined,
                ciudad: data.ciudad || undefined,
                tipoDocumento: data.tipoDocumento || undefined,
                numeroDocumento: data.numeroDocumento || undefined,
                direccion: data.direccion || undefined,
                genero: data.genero || undefined,
                fechaNacimiento: data.fechaNacimiento || undefined,
            });
            setSnackbar({ visible: true, message: 'Cuidador creado correctamente', type: 'success' });
            reset();
            setTimeout(() => router.back(), 1200);
        } catch (error) {
            setSnackbar({
                visible: true,
                message: error instanceof Error ? error.message : 'Error creando cuidador',
                type: 'error',
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <ScrollView style={styles.container} contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
            <AppCard>
                <Text style={styles.sectionTitle}>Datos del cuidador</Text>
                <AppInput control={control} name="nombres" label="Nombres" />
                <AppInput control={control} name="apellidos" label="Apellidos" />
                <AppInput control={control} name="correo" label="Correo" keyboardType="email-address" autoCapitalize="none" />
                <AppInput control={control} name="contrasena" label="Contrasena" secureTextEntry />

                <View style={styles.optionalToggle}>
                    <MaterialCommunityIcons
                        name={showOptional ? 'chevron-up' : 'chevron-down'}
                        size={20}
                        color="#006d77"
                    />
                    <Text
                        style={styles.optionalToggleText}
                        onPress={() => setShowOptional((v) => !v)}
                    >
                        {showOptional ? 'Ocultar datos opcionales' : 'Agregar datos opcionales'}
                    </Text>
                </View>

                {showOptional && (
                    <View style={styles.optionalSection}>
                        <AppInput control={control} name="telefono" label="Telefono" keyboardType="phone-pad" />
                        <AppInput control={control} name="ciudad" label="Ciudad" />
                        <AppInput control={control} name="tipoDocumento" label="Tipo de documento" />
                        <AppInput control={control} name="numeroDocumento" label="Numero de documento" />
                        <AppInput control={control} name="direccion" label="Direccion" />
                        <AppInput control={control} name="fechaNacimiento" label="Fecha de nacimiento (YYYY-MM-DD)" />
                        <Text style={styles.fieldLabel}>Genero</Text>
                        <Controller
                            control={control}
                            name="genero"
                            render={({ field: { value, onChange } }) => (
                                <SegmentedButtons
                                    value={value ?? ''}
                                    onValueChange={(next) => onChange(next as 'femenino' | 'masculino')}
                                    buttons={[
                                        { value: 'femenino', label: 'Femenino' },
                                        { value: 'masculino', label: 'Masculino' },
                                    ]}
                                />
                            )}
                        />
                    </View>
                )}

                <AppButton
                    label="Crear cuidador"
                    icon="account-plus"
                    variant="filled"
                    loading={isLoading}
                    onPress={handleSubmit(onSubmit)}
                    style={styles.submit}
                />
            </AppCard>

            <AppSnackbar
                visible={snackbar.visible}
                message={snackbar.message}
                type={snackbar.type}
                onDismiss={() => setSnackbar((s) => ({ ...s, visible: false }))}
            />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    content: { padding: 16, paddingBottom: 40 },
    sectionTitle: { fontFamily: 'Montserrat_700Bold', fontSize: 16, color: '#1f2937', marginBottom: 12 },
    fieldLabel: { fontFamily: 'Montserrat_600SemiBold', fontSize: 13, color: '#374151', marginBottom: 8 },
    optionalToggle: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingVertical: 12,
    },
    optionalToggleText: {
        fontFamily: 'Montserrat_600SemiBold', fontSize: 13, color: '#006d77',
    },
    optionalSection: {
        borderTopWidth: 1, borderTopColor: '#e5e7eb', paddingTop: 12, marginBottom: 8,
    },
    submit: { marginTop: 16 },
});
