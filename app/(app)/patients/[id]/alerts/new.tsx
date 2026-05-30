import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { createApiAlert } from '@/src/api/alertsApi';
import { AppButton } from '@/src/components/ui/AppButton';
import { AppCard } from '@/src/components/ui/AppCard';
import { AppInput } from '@/src/components/ui/AppInput';
import { AppSnackbar } from '@/src/components/ui/AppSnackbar';
import type { AlertType, AlertChannel } from '@/src/types/apiAlert.types';

const alertSchema = z.object({
    titulo: z.string().min(1, 'Requerido').max(160),
    mensaje: z.string().min(1, 'Requerido'),
});

type AlertFormData = z.infer<typeof alertSchema>;

const TIPOS: { value: AlertType; label: string; icon: string }[] = [
    { value: 'recordatorio_ejercicio', label: 'Recordatorio', icon: 'calendar-clock' },
    { value: 'cumplimiento', label: 'Cumplimiento', icon: 'check-circle-outline' },
    { value: 'progreso', label: 'Progreso', icon: 'trending-up' },
    { value: 'sistema', label: 'Sistema', icon: 'information-outline' },
    { value: 'otro', label: 'Otro', icon: 'bell-outline' },
];

const CANALES: { value: AlertChannel; label: string }[] = [
    { value: 'push', label: 'Push' },
    { value: 'app', label: 'In-app' },
];

export default function NewAlertScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const [tipoAlerta, setTipoAlerta] = useState<AlertType>('recordatorio_ejercicio');
    const [canal, setCanal] = useState<AlertChannel>('push');
    const [isSaving, setIsSaving] = useState(false);
    const [snackVisible, setSnackVisible] = useState(false);
    const [snackMessage, setSnackMessage] = useState('');

    const { control, handleSubmit } = useForm<AlertFormData>({
        resolver: zodResolver(alertSchema),
        defaultValues: { titulo: '', mensaje: '' },
    });

    const onSubmit = async (data: AlertFormData) => {
        setIsSaving(true);
        try {
            await createApiAlert({
                idAdultoMayor: Number(id),
                tipoAlerta,
                titulo: data.titulo,
                mensaje: data.mensaje,
                canal,
            });
            router.back();
        } catch {
            setSnackMessage('Error al crear la alerta');
            setSnackVisible(true);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <AppCard style={styles.card}>
                <Text style={styles.label}>Tipo de alerta</Text>
                <View style={styles.chipGroup}>
                    {TIPOS.map((t) => (
                        <Pressable
                            key={t.value}
                            style={[styles.chip, tipoAlerta === t.value && styles.chipActive]}
                            onPress={() => setTipoAlerta(t.value)}
                        >
                            <MaterialCommunityIcons
                                name={t.icon as never}
                                size={16}
                                color={tipoAlerta === t.value ? '#ffffff' : '#6b7280'}
                            />
                            <Text style={[styles.chipText, tipoAlerta === t.value && styles.chipTextActive]}>
                                {t.label}
                            </Text>
                        </Pressable>
                    ))}
                </View>
            </AppCard>

            <AppCard style={styles.card}>
                <AppInput
                    control={control}
                    name="titulo"
                    label="Titulo"
                />
                <AppInput
                    control={control}
                    name="mensaje"
                    label="Mensaje"
                    multiline
                    numberOfLines={3}
                />
            </AppCard>

            <AppCard style={styles.card}>
                <Text style={styles.label}>Canal de notificacion</Text>
                <View style={styles.chipGroup}>
                    {CANALES.map((c) => (
                        <Pressable
                            key={c.value}
                            style={[styles.chip, canal === c.value && styles.chipActive]}
                            onPress={() => setCanal(c.value)}
                        >
                            <Text style={[styles.chipText, canal === c.value && styles.chipTextActive]}>
                                {c.label}
                            </Text>
                        </Pressable>
                    ))}
                </View>
            </AppCard>

            <AppButton
                label="Crear alerta"
                variant="filled"
                icon="bell-check"
                onPress={handleSubmit(onSubmit)}
                loading={isSaving}
                disabled={isSaving}
            />

            <AppSnackbar
                visible={snackVisible}
                onDismiss={() => setSnackVisible(false)}
                message={snackMessage}
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
});
