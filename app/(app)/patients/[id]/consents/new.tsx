import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Text, useTheme } from 'react-native-paper';
import { createApiConsent } from '@/src/api/consentsApi';
import { AppButton } from '@/src/components/ui/AppButton';
import { AppCard } from '@/src/components/ui/AppCard';
import { AppInput } from '@/src/components/ui/AppInput';
import { AppSnackbar } from '@/src/components/ui/AppSnackbar';
import { DateField } from '@/src/components/ui/DateField';
import type { ApiConsentType } from '@/src/types/apiConsent.types';

const consentSchema = z.object({
    otorgadoPorNombre: z.string().min(1, 'El nombre del otorgante es requerido').max(200),
    otorgadoPorDocumento: z.string().max(50).optional().or(z.literal('')),
    observaciones: z.string().max(500).optional().or(z.literal('')),
});

type ConsentFormData = z.infer<typeof consentSchema>;

const TIPOS: { value: ApiConsentType; label: string; icon: string }[] = [
    { value: 'tratamiento_datos', label: 'Tratamiento de datos', icon: 'shield-check' },
    { value: 'evaluacion_funcional', label: 'Evaluación funcional', icon: 'clipboard-pulse' },
    { value: 'plan_ejercicio', label: 'Plan de ejercicio', icon: 'dumbbell' },
    { value: 'investigacion', label: 'Investigación', icon: 'flask' },
    { value: 'otro', label: 'Otro', icon: 'file-document-outline' },
];

export default function NewConsentScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const theme = useTheme();
    const router = useRouter();

    const [tipoConsentimiento, setTipoConsentimiento] = useState<ApiConsentType>('tratamiento_datos');
    const [fechaOtorgamiento, setFechaOtorgamiento] = useState(new Date());
    const [fechaVencimiento, setFechaVencimiento] = useState<Date | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [snackVisible, setSnackVisible] = useState(false);
    const [snackMessage, setSnackMessage] = useState('');

    const { control, handleSubmit } = useForm<ConsentFormData>({
        resolver: zodResolver(consentSchema),
        defaultValues: {
            otorgadoPorNombre: '',
            otorgadoPorDocumento: '',
            observaciones: '',
        },
    });

    const onSubmit = async (data: ConsentFormData) => {
        setIsSaving(true);
        try {
            await createApiConsent(Number(id), {
                tipoConsentimiento,
                otorgadoPorNombre: data.otorgadoPorNombre,
                otorgadoPorDocumento: data.otorgadoPorDocumento || undefined,
                fechaOtorgamiento: fechaOtorgamiento.toISOString().slice(0, 10),
                fechaVencimiento: fechaVencimiento?.toISOString().slice(0, 10),
                observaciones: data.observaciones || undefined,
            });
            router.back();
        } catch {
            setSnackMessage('Error al registrar el consentimiento');
            setSnackVisible(true);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <AppCard style={styles.card}>
                <Text style={styles.label}>Tipo de consentimiento</Text>
                <View style={styles.chipGroup}>
                    {TIPOS.map((t) => (
                        <Pressable
                            key={t.value}
                            style={[styles.chip, tipoConsentimiento === t.value && styles.chipActive]}
                            onPress={() => setTipoConsentimiento(t.value)}
                        >
                            <MaterialCommunityIcons
                                name={t.icon as never}
                                size={16}
                                color={tipoConsentimiento === t.value ? '#ffffff' : '#6b7280'}
                            />
                            <Text style={[styles.chipText, tipoConsentimiento === t.value && styles.chipTextActive]}>
                                {t.label}
                            </Text>
                        </Pressable>
                    ))}
                </View>
            </AppCard>

            <AppCard style={styles.card}>
                <AppInput
                    control={control}
                    name="otorgadoPorNombre"
                    label="Otorgado por (nombre completo)"
                />
                <AppInput
                    control={control}
                    name="otorgadoPorDocumento"
                    label="Documento de identidad"
                    keyboardType="default"
                />
            </AppCard>

            <AppCard style={styles.card}>
                <DateField
                    label="Fecha de otorgamiento"
                    value={fechaOtorgamiento}
                    onChange={setFechaOtorgamiento}
                    maximumDate={new Date()}
                />
                {fechaVencimiento ? (
                    <View>
                        <DateField
                            label="Fecha de vencimiento"
                            value={fechaVencimiento}
                            onChange={setFechaVencimiento}
                        />
                        <Pressable onPress={() => setFechaVencimiento(null)}>
                            <Text style={styles.removeDate}>Quitar fecha de vencimiento</Text>
                        </Pressable>
                    </View>
                ) : (
                    <Pressable
                        style={styles.addDateButton}
                        onPress={() => setFechaVencimiento(new Date())}
                    >
                        <MaterialCommunityIcons name="calendar-plus" size={18} color={theme.colors.primary} />
                        <Text style={styles.addDateText}>Agregar fecha de vencimiento</Text>
                    </Pressable>
                )}
            </AppCard>

            <AppCard style={styles.card}>
                <AppInput
                    control={control}
                    name="observaciones"
                    label="Observaciones (opcional)"
                    multiline
                    numberOfLines={3}
                />
            </AppCard>

            <AppButton
                label="Registrar consentimiento"
                variant="filled"
                icon="shield-check"
                onPress={handleSubmit(onSubmit)}
                loading={isSaving}
                disabled={isSaving}
            />

            <AppSnackbar
                visible={snackVisible}
                onDismiss={() => setSnackVisible(false)}
                message={snackMessage}
                type="error"
            />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    content: {
        padding: 16,
        paddingBottom: 32,
    },
    card: {
        marginBottom: 16,
    },
    label: {
        fontFamily: 'Montserrat_600SemiBold',
        fontSize: 14,
        color: '#374151',
        marginBottom: 10,
    },
    chipGroup: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#e5e7eb',
        gap: 6,
    },
    chipActive: {
        backgroundColor: '#006d77',
    },
    chipText: {
        fontFamily: 'Montserrat_600SemiBold',
        fontSize: 13,
        color: '#4b5563',
    },
    chipTextActive: {
        color: '#ffffff',
    },
    removeDate: {
        fontFamily: 'Montserrat_600SemiBold',
        fontSize: 13,
        color: '#c62828',
        marginTop: 4,
        marginLeft: 4,
    },
    addDateButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 4,
    },
    addDateText: {
        fontFamily: 'Montserrat_600SemiBold',
        fontSize: 13,
        color: '#006d77',
    },
});
