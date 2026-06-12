import { AppButton } from '@/src/components/ui/AppButton';
import { AppInput } from '@/src/components/ui/AppInput';
import { AppSnackbar } from '@/src/components/ui/AppSnackbar';
import { useMedicalHistoryStore } from '@/src/stores/medicalHistoryStore';

import { zodResolver } from '@hookform/resolvers/zod';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { OptionSelector } from '@/src/components/ui/OptionSelector';
import { z } from 'zod';

const schema = z.object({
  tipoNota: z.enum(['antecedente', 'alergia', 'limitacion', 'observacion', 'otro']),
  contenido: z.string().min(1, 'El contenido de la nota no puede estar vacío'),
});

type FormValues = z.infer<typeof schema>;

const NOTE_TYPES = [
  { value: 'antecedente', label: 'Antecedente' },
  { value: 'alergia', label: 'Alergia' },
  { value: 'limitacion', label: 'Limitación' },
  { value: 'observacion', label: 'Observación' },
  { value: 'otro', label: 'Otro' },
];

export default function AddMedicalNoteScreen() {
  const { id, noteId } = useLocalSearchParams<{ id: string; noteId?: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const { addMedicalNote, updateMedicalNote, medicalNotes } = useMedicalHistoryStore();
  const [isSaving, setIsSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' });

  const isEditing = Boolean(noteId);
  const existingItem = isEditing ? medicalNotes.find((n) => n.id === noteId) : null;

  const { control, handleSubmit, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { tipoNota: 'observacion', contenido: '' },
  });

  useEffect(() => {
    if (existingItem) {
      reset({
        tipoNota: existingItem.tipoNota,
        contenido: existingItem.contenido,
      });
      navigation.setOptions({ title: 'Editar nota médica' });
    } else {
      navigation.setOptions({ title: 'Agregar nota médica' });
    }
  }, [existingItem, reset, navigation]);

  const onSubmit = async (data: FormValues) => {
    if (!id || isSaving) return;
    setIsSaving(true);
    try {
      if (isEditing && noteId) {
        const ok = await updateMedicalNote(Number(id), Number(noteId), data);
        if (ok) {
          setSnackbar({ visible: true, message: 'Nota actualizada ✓', type: 'success' });
          setTimeout(() => router.back(), 1200);
        } else {
          setSnackbar({ visible: true, message: 'Error al actualizar nota', type: 'error' });
        }
      } else {
        const result = await addMedicalNote(Number(id), data);
        if (result) {
          setSnackbar({ visible: true, message: 'Nota registrada ✓', type: 'success' });
          setTimeout(() => router.back(), 1200);
        } else {
          setSnackbar({ visible: true, message: 'Error al registrar nota', type: 'error' });
        }
      }
    } catch {
      setSnackbar({ visible: true, message: `Error al ${isEditing ? 'actualizar' : 'registrar'} nota`, type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.form}>
          <Text style={styles.fieldLabel}>Tipo de nota *</Text>
          <Controller control={control} name="tipoNota" render={({ field: { onChange, value } }) => (
            <OptionSelector options={NOTE_TYPES} value={value} onChange={onChange} style={styles.segmented} />
          )} />

          <AppInput control={control} name="contenido" label="Contenido *" placeholder="Describa el antecedente, alergia, limitación u observación..." multiline numberOfLines={6} />

          <AppButton
            label={isSaving ? 'Guardando...' : isEditing ? 'Actualizar nota' : 'Guardar nota'}
            onPress={handleSubmit(onSubmit)}
            variant="filled"
            loading={isSaving}
            disabled={isSaving}
            icon="content-save"
            style={styles.submit}
            accessibilityLabel={isEditing ? 'Actualizar nota médica' : 'Guardar nota médica'}
          />
        </View>
      </ScrollView>

      <AppSnackbar visible={snackbar.visible} message={snackbar.message} type={snackbar.type} onDismiss={() => setSnackbar((s) => ({ ...s, visible: false }))} />
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
