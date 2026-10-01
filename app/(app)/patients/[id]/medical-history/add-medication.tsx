import { AppButton } from '@/src/components/ui/AppButton';
import { AppInput } from '@/src/components/ui/AppInput';
import { showSnackbar } from '@/src/stores/snackbarStore';
import { DateField } from '@/src/components/ui/DateField';
import { useMedicalHistoryStore } from '@/src/stores/medicalHistoryStore';
import type { MedicationFormData } from '@/src/types/medicalHistory.types';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { OptionSelector } from '@/src/components/ui/OptionSelector';
import { formatDateOnly, parseApiDate } from '@/src/lib/dates';
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
  const { id, medicationId } = useLocalSearchParams<{ id: string; medicationId?: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const { addMedication, updateMedication, medications } = useMedicalHistoryStore();
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [isSaving, setIsSaving] = useState(false);

  const isEditing = Boolean(medicationId);
  const existingItem = isEditing ? medications.find((m) => m.id === medicationId) : null;

  const { control, handleSubmit, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { nombre: '', dosis: '', frecuencia: '', viaAdministracion: '', estado: 'activo', observaciones: '' },
  });

  useEffect(() => {
    if (existingItem) {
      reset({
        nombre: existingItem.nombre,
        dosis: existingItem.dosis ?? '',
        frecuencia: existingItem.frecuencia ?? '',
        viaAdministracion: existingItem.viaAdministracion ?? '',
        estado: existingItem.estado,
        observaciones: existingItem.observaciones ?? '',
      });
      if (existingItem.fechaInicio) setStartDate(parseApiDate(existingItem.fechaInicio));
      if (existingItem.fechaFin) setEndDate(parseApiDate(existingItem.fechaFin));
      navigation.setOptions({ title: 'Editar medicamento' });
    } else {
      navigation.setOptions({ title: 'Agregar medicamento' });
    }
  }, [existingItem, reset, navigation]);

  const onSubmit = async (data: FormValues) => {
    if (!id || isSaving) return;
    setIsSaving(true);
    try {
      const formData: MedicationFormData = {
        ...data,
        fechaInicio: startDate ? formatDateOnly(startDate) : undefined,
        fechaFin: endDate ? formatDateOnly(endDate) : undefined,
      };
      if (isEditing && medicationId) {
        const ok = await updateMedication(Number(id), Number(medicationId), formData);
        if (ok) {
          showSnackbar('Medicamento actualizado ✓', 'success');
          router.back();
        } else {
          showSnackbar('Error al actualizar medicamento', 'error');
        }
      } else {
        const result = await addMedication(Number(id), formData);
        if (result) {
          showSnackbar('Medicamento registrado ✓', 'success');
          router.back();
        } else {
          showSnackbar('Error al registrar medicamento', 'error');
        }
      }
    } catch {
      showSnackbar(`Error al ${isEditing ? 'actualizar' : 'registrar'} medicamento`, 'error');
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
            <OptionSelector options={STATUS_OPTIONS} value={value} onChange={onChange} style={styles.segmented} />
          )} />

          <AppInput control={control} name="observaciones" label="Observaciones" multiline numberOfLines={3} placeholder="Notas adicionales..." />

          <AppButton
            label={isSaving ? 'Guardando...' : isEditing ? 'Actualizar medicamento' : 'Guardar medicamento'}
            onPress={handleSubmit(onSubmit)}
            variant="filled"
            loading={isSaving}
            disabled={isSaving}
            icon="content-save"
            style={styles.submit}
            accessibilityLabel={isEditing ? 'Actualizar medicamento' : 'Guardar medicamento'}
          />
        </View>
      </ScrollView>

    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#f8fafc' },
  scroll: { flexGrow: 1 },
  form: { padding: 24, paddingTop: 60 },
  fieldLabel: { fontFamily: 'Montserrat_600SemiBold', fontSize: 13, color: '#374151', marginBottom: 8, marginTop: 4 },
  segmented: { marginBottom: 16 },
  submit: { marginTop: 16 },
});
