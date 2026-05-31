import { AppButton } from '@/src/components/ui/AppButton';
import { AppInput } from '@/src/components/ui/AppInput';
import { AppSnackbar } from '@/src/components/ui/AppSnackbar';
import { DateField } from '@/src/components/ui/DateField';
import { useMedicalHistoryStore } from '@/src/stores/medicalHistoryStore';
import type { MedicationFormData } from '@/src/types/medicalHistory.types';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SegmentedButtons, Text } from 'react-native-paper';
import { z } from 'zod';

const schema = z.object({
  nombre: z.string().min(1, 'El nombre del medicamento es requerido'),
  dosis: z.string().optional(),
  frecuencia: z.string().optional(),
  viaAdministracion: z.string().optional(),
  estado: z.enum(['activo', 'suspendido', 'finalizado', 'desconocido']),
  observaciones: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

const STATUS_OPTIONS = [
  { value: 'activo', label: 'Activo' },
  { value: 'suspendido', label: 'Suspendido' },
  { value: 'finalizado', label: 'Finalizado' },
  { value: 'desconocido', label: 'Desconocido' },
];

export default function AddMedicationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { addMedication } = useMedicalHistoryStore();
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [isSaving, setIsSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' });

  const { control, handleSubmit } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { nombre: '', dosis: '', frecuencia: '', viaAdministracion: '', estado: 'activo', observaciones: '' },
  });

  const onSubmit = async (data: FormValues) => {
    if (!id || isSaving) return;
    setIsSaving(true);
    try {
      const formData: MedicationFormData = {
        ...data,
        fechaInicio: startDate ? startDate.toISOString().slice(0, 10) : undefined,
        fechaFin: endDate ? endDate.toISOString().slice(0, 10) : undefined,
      };
      const result = await addMedication(Number(id), formData);
      if (result) {
        setSnackbar({ visible: true, message: 'Medicamento registrado ✓', type: 'success' });
        setTimeout(() => router.back(), 1200);
      } else {
        setSnackbar({ visible: true, message: 'Error al registrar medicamento', type: 'error' });
      }
    } catch {
      setSnackbar({ visible: true, message: 'Error al registrar medicamento', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.form}>
          <AppInput control={control} name="nombre" label="Nombre del medicamento *" placeholder="Ej: Metformina" />

          <AppInput control={control} name="dosis" label="Dosis" placeholder="Ej: 500 mg" />
          <AppInput control={control} name="frecuencia" label="Frecuencia" placeholder="Ej: Cada 12 horas" />
          <AppInput control={control} name="viaAdministracion" label="Vía de administración" placeholder="Ej: Oral, intravenosa..." />

          <DateField label="Fecha de inicio (opcional)" value={startDate ?? new Date()} onChange={setStartDate} maximumDate={new Date()} accessibilityLabel="Seleccionar fecha de inicio" />
          <DateField label="Fecha de fin (opcional)" value={endDate ?? new Date()} onChange={setEndDate} accessibilityLabel="Seleccionar fecha de fin" />

          <Text style={styles.fieldLabel}>Estado *</Text>
          <Controller control={control} name="estado" render={({ field: { onChange, value } }) => (
            <SegmentedButtons value={value} onValueChange={onChange} buttons={STATUS_OPTIONS} style={styles.segmented} />
          )} />

          <AppInput control={control} name="observaciones" label="Observaciones" multiline numberOfLines={3} placeholder="Notas adicionales..." />

          <AppButton label={isSaving ? 'Guardando...' : 'Guardar medicamento'} onPress={handleSubmit(onSubmit)} variant="filled" loading={isSaving} disabled={isSaving} icon="content-save" style={styles.submit} accessibilityLabel="Guardar medicamento" />
        </View>
      </ScrollView>

      <AppSnackbar visible={snackbar.visible} message={snackbar.message} type={snackbar.type} onDismiss={() => setSnackbar((s) => ({ ...s, visible: false }))} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#f8fafc' },
  scroll: { flexGrow: 1 },
  form: { padding: 24 },
  fieldLabel: { fontFamily: 'Montserrat_600SemiBold', fontSize: 13, color: '#374151', marginBottom: 8, marginTop: 4 },
  segmented: { marginBottom: 16 },
  submit: { marginTop: 16 },
});
