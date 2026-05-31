import { AppButton } from '@/src/components/ui/AppButton';
import { AppInput } from '@/src/components/ui/AppInput';
import { AppSnackbar } from '@/src/components/ui/AppSnackbar';
import { DateField } from '@/src/components/ui/DateField';
import { useMedicalHistoryStore } from '@/src/stores/medicalHistoryStore';
import type { PathologyFormData } from '@/src/types/medicalHistory.types';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SegmentedButtons, Text } from 'react-native-paper';
import { z } from 'zod';

const schema = z.object({
  nombre: z.string().min(1, 'El nombre de la patología es requerido'),
  descripcion: z.string().optional(),
  estado: z.enum(['activa', 'resuelta', 'cronica', 'desconocida']),
});

type FormValues = z.infer<typeof schema>;

const STATUS_OPTIONS = [
  { value: 'activa', label: 'Activa' },
  { value: 'cronica', label: 'Crónica' },
  { value: 'resuelta', label: 'Resuelta' },
  { value: 'desconocida', label: 'Desconocida' },
];

export default function AddPathologyScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { addPathology } = useMedicalHistoryStore();
  const [diagnosisDate, setDiagnosisDate] = useState<Date | undefined>(undefined);
  const [isSaving, setIsSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' });

  const { control, handleSubmit } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { nombre: '', descripcion: '', estado: 'activa' },
  });

  const onSubmit = async (data: FormValues) => {
    if (!id || isSaving) return;
    setIsSaving(true);
    try {
      const formData: PathologyFormData = {
        ...data,
        fechaDiagnostico: diagnosisDate ? diagnosisDate.toISOString().slice(0, 10) : undefined,
      };
      const result = await addPathology(Number(id), formData);
      if (result) {
        setSnackbar({ visible: true, message: 'Patología registrada ✓', type: 'success' });
        setTimeout(() => router.back(), 1200);
      } else {
        setSnackbar({ visible: true, message: 'Error al registrar patología', type: 'error' });
      }
    } catch {
      setSnackbar({ visible: true, message: 'Error al registrar patología', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.form}>
          <AppInput control={control} name="nombre" label="Nombre de la patología *" placeholder="Ej: Diabetes tipo 2" />

          <AppInput control={control} name="descripcion" label="Descripción" placeholder="Detalles adicionales..." multiline numberOfLines={3} />

          <DateField
            label="Fecha de diagnóstico (opcional)"
            value={diagnosisDate ?? new Date()}
            onChange={setDiagnosisDate}
            maximumDate={new Date()}
            accessibilityLabel="Seleccionar fecha de diagnóstico"
          />

          <Text style={styles.fieldLabel}>Estado *</Text>
          <Controller control={control} name="estado" render={({ field: { onChange, value } }) => (
            <SegmentedButtons
              value={value}
              onValueChange={onChange}
              buttons={STATUS_OPTIONS}
              style={styles.segmented}
            />
          )} />

          <AppButton
            label={isSaving ? 'Guardando...' : 'Guardar patología'}
            onPress={handleSubmit(onSubmit)}
            variant="filled"
            loading={isSaving}
            disabled={isSaving}
            icon="content-save"
            style={styles.submit}
            accessibilityLabel="Guardar patología"
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
  fieldLabel: { fontFamily: 'Montserrat_600SemiBold', fontSize: 13, color: '#374151', marginBottom: 8, marginTop: 4 },
  segmented: { marginBottom: 16 },
  submit: { marginTop: 16 },
});
